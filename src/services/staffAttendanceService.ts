/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  CalendarEventDetail,
  getActiveStaffCalendarContext,
  getEventsForExactDate,
  StaffIdentityContext,
  subscribeToStaffCalendarEvents,
} from './calendarService';
import {
  formatISTDateKey,
  formatISTDateMedium,
  formatISTFullDate,
  formatISTMonthKey,
  formatISTMonthYear,
  formatISTShortDateTime,
  formatISTTime12h,
  getISTDateParts,
  getNow,
  parseDateKeySafe,
  parseMonthYearToYearMonth,
  shiftMonthYear,
} from '../utils/dateTimeUtils';

export type StaffAttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Leave'
  | 'Late'
  | 'Half Day'
  | 'None';

export type DailySessionState = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT';

export type AttendanceApprovalState =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED';

export type CorrectionReviewStatus =
  | 'NONE'
  | 'PENDING_CORRECTION_REVIEW'
  | 'RESOLVED';

export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  employeeId: string;
  staffName: string;
  schoolId: string;
  dateKey: string; // 'YYYY-MM-DD'
  attendanceStatus: Exclude<StaffAttendanceStatus, 'None'>;
  sessionState: DailySessionState;
  checkInAtMs: number | null;
  checkOutAtMs: number | null;
  sessionDurationSeconds: number;
  submittedAtMs: number | null;
  reviewedAtMs: number | null;
  approvedAtMs: number | null;
  reviewerName: string | null;
  approverName: string | null;
  approvalState: AttendanceApprovalState;
  needsCorrectionReview: boolean;
  correctionStatus: CorrectionReviewStatus;
  correctionReason?: string;
  notes?: string;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface StaffDayAttendance {
  day: number;
  dateKey: string; // 'YYYY-MM-DD'
  status: StaffAttendanceStatus;
  sessionState: DailySessionState;
  checkIn?: string;
  checkOut?: string;
  checkInAtMs: number | null;
  checkOutAtMs: number | null;
  sessionDurationSeconds: number;
  durationFormatted: string | null;
  approvalState: AttendanceApprovalState;
  submittedAtMs: number | null;
  reviewedAtMs: number | null;
  approvedAtMs: number | null;
  reviewerName: string | null;
  approverName: string | null;
  needsCorrectionReview: boolean;
  correctionStatus: CorrectionReviewStatus;
  notes?: string;
  isToday: boolean;
  isFuture: boolean;
  isOperational: boolean;
  hasRecord: boolean;
  record: StaffAttendanceRecord | null;
}

export interface StaffAttendanceSummaryCounts {
  present: number;
  absent: number;
  leave: number;
  late: number;
  halfDay: number;
}

export interface TodayAttendanceSessionView {
  dateKey: string;
  dateFormatted: string;
  sessionState: DailySessionState;
  attendanceStatus: StaffAttendanceStatus;
  statusLabel: string;
  checkInDisplay: string;
  checkOutDisplay: string;
  checkInAtMs: number | null;
  checkOutAtMs: number | null;
  sessionDurationSeconds: number;
  approvalState: AttendanceApprovalState;
  submittedAtMs: number | null;
  reviewedAtMs: number | null;
  approvedAtMs: number | null;
  reviewerName: string | null;
  approverName: string | null;
  needsCorrectionReview: boolean;
  correctionStatus: CorrectionReviewStatus;
  canCheckIn: boolean;
  canCheckOut: boolean;
  isOperationalToday: boolean;
  holidayTitle: string | null;
  record: StaffAttendanceRecord | null;
}

export interface StaffMonthlyAttendance {
  month: string; // e.g. 'November 2026'
  monthKey: string; // e.g. '2026-11'
  year: number;
  monthIndex: number; // 0-indexed
  summary: StaffAttendanceSummaryCounts;
  todayRecord: TodayAttendanceSessionView;
  pendingCorrectionRecord: StaffAttendanceRecord | null;
  days: StaffDayAttendance[];
  availableMonths: string[]; // 'YYYY-MM' ascending operational months up to current month
  prevOperationalMonth: string | null; // 'Month YYYY' or null
  nextOperationalMonth: string | null; // 'Month YYYY' or null
  isLiveFirestore: boolean;
  requiresFirebaseAuth: boolean;
  error: string | null;
}

export interface OperationalPeriod {
  startDateKey: string; // inclusive 'YYYY-MM-DD'
  endDateKey?: string; // inclusive 'YYYY-MM-DD'
  label?: string;
}

export interface SchoolOperationalConfig {
  schoolId: string;
  academicYear: string;
  operationalPeriods: OperationalPeriod[];
  closedMonthKeys: string[]; // 'YYYY-MM' officially closed months
  lateCutoffMinutesFromMidnightIST: number; // e.g. 9*60 + 15 = 555 (09:15 AM IST)
  autoApproveOnCheckout: boolean;
}

export const STAFF_PERSONAL_ATTENDANCE_COLLECTION = 'staffPersonalAttendance';
export const OPERATIONAL_CONFIG_COLLECTION = 'attendanceOperationalConfig';
const LEGACY_STAFF_ATTENDANCE_STORAGE_KEY = 'offsleek_staff_personal_attendance_v2';
const STAFF_ATTENDANCE_STORAGE_KEY = 'offsleek_staff_personal_attendance_v3';
export const STAFF_ATTENDANCE_UPDATED_EVENT = 'offsleek_staff_personal_attendance_updated';

/**
 * Authoritative school operational calendar config for Greenwood International School (AY 2026-27).
 * - April 2026: Spring term operational
 * - May 2026: Officially closed (Summer Vacation) -> skipped in calendar navigation
 * - June 8, 2026 onward: Regular Academic Session 2026-27 (partial June month supported)
 */
export const DEFAULT_SCHOOL_OPERATIONAL_CONFIG: SchoolOperationalConfig = {
  schoolId: 'greenwood-intl',
  academicYear: '2026-27',
  operationalPeriods: [
    {
      startDateKey: '2026-04-01',
      endDateKey: '2026-04-30',
      label: 'Spring Term 2026-27',
    },
    {
      startDateKey: '2026-06-08',
      label: 'Academic Session 2026-27',
    },
  ],
  closedMonthKeys: ['2026-05'],
  lateCutoffMinutesFromMidnightIST: 9 * 60 + 15, // 09:15 AM IST
  autoApproveOnCheckout: false,
};

// ---------------------------------------------------------------------------
// Firestore Structured Error Handling (per firebase-integration-rpc reference)
// ---------------------------------------------------------------------------

export enum StaffAttendanceFirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface StaffAttendanceFirestoreErrorInfo {
  error: string;
  operationType: StaffAttendanceFirestoreOperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildStaffAttendanceFirestoreErrorInfo(
  error: unknown,
  operationType: StaffAttendanceFirestoreOperationType,
  path: string | null
): StaffAttendanceFirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
}

export function handleStaffAttendanceFirestoreError(
  error: unknown,
  operationType: StaffAttendanceFirestoreOperationType,
  path: string | null
): never {
  const errInfo = buildStaffAttendanceFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionValidated = false;
export async function validateStaffAttendanceFirestoreConnection(
  firestoreDb: Firestore = db
): Promise<void> {
  if (connectionValidated || !firestoreDb) return;
  connectionValidated = true;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// ---------------------------------------------------------------------------
// Formatting, Duration, Identity & Operational Period Helpers
// ---------------------------------------------------------------------------

export function formatDurationHHMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function computeSessionElapsedSeconds(
  record: Pick<
    StaffAttendanceRecord,
    'sessionState' | 'checkInAtMs' | 'checkOutAtMs' | 'sessionDurationSeconds'
  > | null,
  nowMs: number = getNow().getTime()
): number {
  if (!record || record.checkInAtMs === null) return 0;
  if (record.sessionState === 'CHECKED_OUT' && record.checkOutAtMs !== null) {
    if (typeof record.sessionDurationSeconds === 'number' && record.sessionDurationSeconds >= 0) {
      return record.sessionDurationSeconds;
    }
    return Math.max(0, Math.floor((record.checkOutAtMs - record.checkInAtMs) / 1000));
  }
  if (record.sessionState === 'CHECKED_IN') {
    return Math.max(0, Math.floor((nowMs - record.checkInAtMs) / 1000));
  }
  return Math.max(0, record.sessionDurationSeconds || 0);
}

export function getEffectiveStaffAuthId(
  staff: StaffIdentityContext = getActiveStaffCalendarContext()
): string {
  return auth?.currentUser?.uid || staff.staffId;
}

export function buildStaffAttendanceDocId(
  schoolId: string,
  staffId: string,
  dateKey: string
): string {
  const cleanSchool = schoolId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStaff = staffId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanSchool}__${cleanStaff}__${dateKey}`;
}

export function getSchoolOperationalConfig(
  schoolId: string = getActiveStaffCalendarContext().schoolId,
  overrideConfig?: SchoolOperationalConfig
): SchoolOperationalConfig {
  if (overrideConfig) return overrideConfig;
  return {
    ...DEFAULT_SCHOOL_OPERATIONAL_CONFIG,
    schoolId,
  };
}

export function isDateWithinOperationalPeriods(
  dateKey: string,
  config: SchoolOperationalConfig
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const monthKey = dateKey.slice(0, 7);
  if (config.closedMonthKeys.includes(monthKey)) return false;
  return config.operationalPeriods.some((period) => {
    if (dateKey < period.startDateKey) return false;
    if (period.endDateKey && dateKey > period.endDateKey) return false;
    return true;
  });
}

export function isMonthOperational(
  monthKey: string,
  config: SchoolOperationalConfig,
  todayDateKey: string = formatISTDateKey(getNow())
): boolean {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return false;
  const currentMonthKey = todayDateKey.slice(0, 7);
  // Strictly forbid future months
  if (monthKey > currentMonthKey) return false;
  // Strictly exclude officially closed months
  if (config.closedMonthKeys.includes(monthKey)) return false;

  const [yearStr, monStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monStr, 10) - 1;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
  const monthStartKey = `${monthKey}-01`;
  const monthEndKey = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
  const effectiveEndKey = monthEndKey > todayDateKey ? todayDateKey : monthEndKey;

  if (effectiveEndKey < monthStartKey) return false;

  return config.operationalPeriods.some((period) => {
    const pStart = period.startDateKey;
    const pEnd = period.endDateKey || todayDateKey;
    return pStart <= effectiveEndKey && pEnd >= monthStartKey;
  });
}

export function getAvailableOperationalMonthKeys(
  config: SchoolOperationalConfig = getSchoolOperationalConfig(),
  todayDateKey: string = formatISTDateKey(getNow())
): string[] {
  const currentMonthKey = todayDateKey.slice(0, 7);
  if (config.operationalPeriods.length === 0) {
    return [currentMonthKey];
  }

  const sortedStarts = config.operationalPeriods
    .map((p) => p.startDateKey.slice(0, 7))
    .sort();
  const earliestMonthKey = sortedStarts[0] || currentMonthKey;

  if (earliestMonthKey > currentMonthKey) {
    return [];
  }

  const result: string[] = [];
  let cursor = earliestMonthKey;
  let guard = 0;

  while (cursor <= currentMonthKey && guard < 120) {
    guard += 1;
    if (isMonthOperational(cursor, config, todayDateKey)) {
      result.push(cursor);
    }
    const [y, m] = cursor.split('-').map((n) => parseInt(n, 10));
    const nextDate = new Date(Date.UTC(y, m, 15, 12, 0, 0));
    cursor = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  return result;
}

export function clampToOperationalMonth(
  monthInput: string | undefined,
  config: SchoolOperationalConfig = getSchoolOperationalConfig(),
  todayDateKey: string = formatISTDateKey(getNow())
): { monthKey: string; monthName: string; year: number; monthIndex: number } {
  const available = getAvailableOperationalMonthKeys(config, todayDateKey);
  const parsed = parseMonthYearToYearMonth(monthInput);

  if (available.length === 0) {
    const fallback = parseMonthYearToYearMonth(todayDateKey.slice(0, 7));
    return {
      monthKey: fallback.monthKey,
      monthName: fallback.monthName,
      year: fallback.year,
      monthIndex: fallback.monthIndex,
    };
  }

  if (available.includes(parsed.monthKey)) {
    return {
      monthKey: parsed.monthKey,
      monthName: parsed.monthName,
      year: parsed.year,
      monthIndex: parsed.monthIndex,
    };
  }

  // Clamp future months to the latest operational month (current month);
  // clamp non-operational/closed months to the nearest prior or latest valid operational month.
  const prior = available.filter((k) => k <= parsed.monthKey);
  const resolvedKey = prior.length > 0 ? prior[prior.length - 1] : available[available.length - 1];
  const resolved = parseMonthYearToYearMonth(resolvedKey);
  return {
    monthKey: resolved.monthKey,
    monthName: resolved.monthName,
    year: resolved.year,
    monthIndex: resolved.monthIndex,
  };
}

export function getAdjacentOperationalMonthName(
  currentMonthInput: string,
  direction: -1 | 1,
  config: SchoolOperationalConfig = getSchoolOperationalConfig(),
  todayDateKey: string = formatISTDateKey(getNow())
): string | null {
  const available = getAvailableOperationalMonthKeys(config, todayDateKey);
  const clamped = clampToOperationalMonth(currentMonthInput, config, todayDateKey);
  const idx = available.indexOf(clamped.monthKey);
  if (idx === -1) return null;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= available.length) return null;
  return parseMonthYearToYearMonth(available[targetIdx]).monthName;
}

// ---------------------------------------------------------------------------
// Local Storage & Historical Seed (Strictly past days only; NEVER today/future)
// ---------------------------------------------------------------------------

function createISTTimestampMs(dateKey: string, hour24: number, minute: number): number {
  const [y, m, d] = dateKey.split('-').map((n) => parseInt(n, 10));
  // IST is UTC+05:30 -> subtract 5h30m from UTC wall clock
  return Date.UTC(y, m - 1, d, hour24, minute, 0, 0) - (5 * 60 + 30) * 60 * 1000;
}

function buildInitialHistoricalSeedRecords(
  staff: StaffIdentityContext,
  staffAuthId: string,
  todayDateKey: string
): StaffAttendanceRecord[] {
  const seedSpecs: Array<{
    dateKey: string;
    status: Exclude<StaffAttendanceStatus, 'None'>;
    inH?: number;
    inM?: number;
    outH?: number;
    outM?: number;
    notes?: string;
  }> = [
    // October 2026 historical attendance
    { dateKey: '2026-10-01', status: 'Present', inH: 8, inM: 54, outH: 17, outM: 10 },
    { dateKey: '2026-10-05', status: 'Present', inH: 8, inM: 58, outH: 17, outM: 12 },
    { dateKey: '2026-10-06', status: 'Present', inH: 8, inM: 51, outH: 17, outM: 5 },
    { dateKey: '2026-10-07', status: 'Late', inH: 9, inM: 24, outH: 17, outM: 20, notes: 'Arrived 24 mins past 09:00 AM reporting time.' },
    { dateKey: '2026-10-08', status: 'Present', inH: 8, inM: 56, outH: 17, outM: 8 },
    { dateKey: '2026-10-09', status: 'Half Day', inH: 8, inM: 55, outH: 13, outM: 15, notes: 'Approved morning half-day session.' },
    { dateKey: '2026-10-12', status: 'Present', inH: 8, inM: 55, outH: 17, outM: 10 },
    { dateKey: '2026-10-13', status: 'Present', inH: 9, inM: 2, outH: 17, outM: 14 },
    { dateKey: '2026-10-14', status: 'Present', inH: 8, inM: 50, outH: 17, outM: 11 },
    { dateKey: '2026-10-15', status: 'Absent', notes: 'Unplanned absence recorded.' },
    { dateKey: '2026-10-16', status: 'Present', inH: 8, inM: 57, outH: 17, outM: 9 },
    { dateKey: '2026-10-19', status: 'Present', inH: 8, inM: 53, outH: 17, outM: 18 },
    { dateKey: '2026-10-21', status: 'Leave', notes: 'Approved Casual Leave' },
    { dateKey: '2026-10-22', status: 'Late', inH: 9, inM: 28, outH: 17, outM: 25, notes: 'Traffic delay notified.' },
    { dateKey: '2026-10-23', status: 'Present', inH: 8, inM: 52, outH: 17, outM: 6 },
    { dateKey: '2026-10-26', status: 'Present', inH: 8, inM: 58, outH: 17, outM: 12 },
    { dateKey: '2026-10-27', status: 'Present', inH: 8, inM: 49, outH: 17, outM: 15 },
    { dateKey: '2026-10-28', status: 'Half Day', inH: 9, inM: 0, outH: 13, outM: 20, notes: 'Approved afternoon leave (Half Day).' },
    { dateKey: '2026-10-29', status: 'Present', inH: 8, inM: 55, outH: 17, outM: 14 },
    { dateKey: '2026-10-30', status: 'Present', inH: 8, inM: 59, outH: 17, outM: 8 },

    // November 2026 historical attendance up to Nov 19 (never today Nov 21+)
    { dateKey: '2026-11-02', status: 'Present', inH: 8, inM: 55, outH: 17, outM: 12 },
    { dateKey: '2026-11-03', status: 'Present', inH: 8, inM: 52, outH: 17, outM: 10 },
    { dateKey: '2026-11-04', status: 'Late', inH: 9, inM: 21, outH: 17, outM: 18, notes: 'Morning commute delay.' },
    { dateKey: '2026-11-05', status: 'Present', inH: 8, inM: 58, outH: 17, outM: 14 },
    { dateKey: '2026-11-06', status: 'Half Day', inH: 8, inM: 52, outH: 13, outM: 10, notes: 'Approved half-day schedule.' },
    { dateKey: '2026-11-10', status: 'Present', inH: 8, inM: 57, outH: 17, outM: 11 },
    { dateKey: '2026-11-11', status: 'Present', inH: 8, inM: 54, outH: 17, outM: 13 },
    { dateKey: '2026-11-12', status: 'Leave', notes: 'Approved Personal Leave' },
    { dateKey: '2026-11-13', status: 'Present', inH: 9, inM: 1, outH: 17, outM: 9 },
    { dateKey: '2026-11-16', status: 'Present', inH: 8, inM: 56, outH: 17, outM: 12 },
    { dateKey: '2026-11-17', status: 'Absent', notes: 'Medical absence recorded.' },
    { dateKey: '2026-11-18', status: 'Present', inH: 8, inM: 53, outH: 17, outM: 16 },
    { dateKey: '2026-11-19', status: 'Present', inH: 8, inM: 59, outH: 17, outM: 10 },
  ];

  const records: StaffAttendanceRecord[] = [];
  for (const spec of seedSpecs) {
    // Strictly NEVER seed today or any future date
    if (spec.dateKey >= todayDateKey) continue;

    const hasShift = spec.inH !== undefined && spec.inM !== undefined;
    const checkInAtMs = hasShift
      ? createISTTimestampMs(spec.dateKey, spec.inH!, spec.inM!)
      : null;
    const checkOutAtMs =
      hasShift && spec.outH !== undefined && spec.outM !== undefined
        ? createISTTimestampMs(spec.dateKey, spec.outH, spec.outM)
        : null;
    const sessionDurationSeconds =
      checkInAtMs !== null && checkOutAtMs !== null
        ? Math.max(0, Math.floor((checkOutAtMs - checkInAtMs) / 1000))
        : 0;
    const endOfDayApprovalMs = createISTTimestampMs(spec.dateKey, 18, 0);

    records.push({
      id: buildStaffAttendanceDocId(staff.schoolId, staffAuthId, spec.dateKey),
      staffId: staffAuthId,
      employeeId: staff.staffId,
      staffName: staff.name,
      schoolId: staff.schoolId,
      dateKey: spec.dateKey,
      attendanceStatus: spec.status,
      sessionState: hasShift && checkOutAtMs !== null ? 'CHECKED_OUT' : 'NOT_CHECKED_IN',
      checkInAtMs,
      checkOutAtMs,
      sessionDurationSeconds,
      submittedAtMs: checkInAtMs,
      reviewedAtMs: checkOutAtMs || createISTTimestampMs(spec.dateKey, 17, 30),
      approvedAtMs: endOfDayApprovalMs,
      reviewerName: 'School Administration',
      approverName: 'Dr. R. K. Verma (Principal)',
      approvalState: 'APPROVED',
      needsCorrectionReview: false,
      correctionStatus: 'NONE',
      notes: spec.notes,
      createdAtIso: new Date(checkInAtMs || endOfDayApprovalMs).toISOString(),
      updatedAtIso: new Date(endOfDayApprovalMs).toISOString(),
    });
  }

  return records;
}

const memoryFallbackStore: { initialized: boolean; records: StaffAttendanceRecord[] } = {
  initialized: false,
  records: [],
};

function hasBrowserLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadStoredStaffAttendanceRecords(
  staff: StaffIdentityContext = getActiveStaffCalendarContext(),
  staffAuthId: string = getEffectiveStaffAuthId(staff)
): StaffAttendanceRecord[] {
  const todayDateKey = formatISTDateKey(getNow());

  if (hasBrowserLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(STAFF_ATTENDANCE_STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as StaffAttendanceRecord[];
        }
      }
      const seeded = buildInitialHistoricalSeedRecords(staff, staffAuthId, todayDateKey);
      // Preserve any real user-created check-in/out sessions from legacy v2 storage (excluding Holiday entries)
      const legacyRaw = window.localStorage.getItem(LEGACY_STAFF_ATTENDANCE_STORAGE_KEY);
      if (legacyRaw !== null) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          const seededMap = new Map(seeded.map((r) => [r.dateKey, r]));
          for (const rec of legacyParsed as Array<Record<string, unknown>>) {
            if (
              typeof rec?.dateKey === 'string' &&
              rec.dateKey >= todayDateKey &&
              (rec.sessionState === 'CHECKED_IN' || rec.sessionState === 'CHECKED_OUT') &&
              rec.attendanceStatus !== 'Holiday'
            ) {
              seededMap.set(rec.dateKey, rec as unknown as StaffAttendanceRecord);
            }
          }
          const migrated = Array.from(seededMap.values());
          window.localStorage.setItem(STAFF_ATTENDANCE_STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
      window.localStorage.setItem(STAFF_ATTENDANCE_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    } catch (err) {
      console.error('Failed to read staff personal attendance from localStorage:', err);
    }
  }

  if (!memoryFallbackStore.initialized) {
    memoryFallbackStore.records = buildInitialHistoricalSeedRecords(
      staff,
      staffAuthId,
      todayDateKey
    );
    memoryFallbackStore.initialized = true;
  }
  return [...memoryFallbackStore.records];
}

export function saveStoredStaffAttendanceRecords(records: StaffAttendanceRecord[]): void {
  memoryFallbackStore.records = [...records];
  memoryFallbackStore.initialized = true;
  if (hasBrowserLocalStorage()) {
    try {
      window.localStorage.setItem(STAFF_ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error('Failed to save staff personal attendance to localStorage:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAFF_ATTENDANCE_UPDATED_EVENT));
  }
}

export function resetStaffAttendanceForTesting(
  initialRecords: StaffAttendanceRecord[] = []
): void {
  memoryFallbackStore.records = [...initialRecords];
  memoryFallbackStore.initialized = true;
  if (hasBrowserLocalStorage()) {
    window.localStorage.setItem(STAFF_ATTENDANCE_STORAGE_KEY, JSON.stringify(initialRecords));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAFF_ATTENDANCE_UPDATED_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Strict Access & Reconciliation (Prior-day Forgotten Checkout Preservation)
// ---------------------------------------------------------------------------

export function filterRecordsForStaffIdentity(
  records: StaffAttendanceRecord[],
  staff: StaffIdentityContext,
  staffAuthId: string
): StaffAttendanceRecord[] {
  return records.filter(
    (r) =>
      r.schoolId === staff.schoolId &&
      (r.staffId === staffAuthId || r.employeeId === staff.staffId)
  );
}

/**
 * Reconciles prior-day unclosed check-in sessions:
 * - NEVER resets after an arbitrary 12-hour window.
 * - NEVER discards or overwrites the original check-in timestamp.
 * - Preserves the original check-in and flags the session for authorized review/correction.
 */
export function reconcileUnclosedPriorSessions(
  records: StaffAttendanceRecord[],
  todayDateKey: string = formatISTDateKey(getNow())
): { records: StaffAttendanceRecord[]; changedIds: string[] } {
  const changedIds: string[] = [];
  const next = records.map((rec) => {
    if (
      rec.dateKey < todayDateKey &&
      rec.sessionState === 'CHECKED_IN' &&
      rec.checkInAtMs !== null &&
      rec.checkOutAtMs === null &&
      !rec.needsCorrectionReview
    ) {
      changedIds.push(rec.id);
      return {
        ...rec,
        needsCorrectionReview: true,
        correctionStatus: 'PENDING_CORRECTION_REVIEW' as CorrectionReviewStatus,
        notes:
          rec.notes ||
          'Check-out was not recorded on this date. Session flagged for administration review.',
        updatedAtIso: getNow().toISOString(),
      };
    }
    return rec;
  });

  return { records: next, changedIds };
}

// ---------------------------------------------------------------------------
// Live Check-In / Check-Out & Approval Transitions
// ---------------------------------------------------------------------------

export async function checkInStaffAttendance(params?: {
  staff?: StaffIdentityContext;
  staffAuthId?: string;
  config?: SchoolOperationalConfig;
  firestoreDb?: Firestore;
}): Promise<StaffAttendanceRecord> {
  const staff = params?.staff || getActiveStaffCalendarContext();
  const staffAuthId = params?.staffAuthId || getEffectiveStaffAuthId(staff);
  const config = getSchoolOperationalConfig(staff.schoolId, params?.config);
  const firestoreDb = params?.firestoreDb || db;

  const now = getNow();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const todayDateKey = formatISTDateKey(now);

  if (!isDateWithinOperationalPeriods(todayDateKey, config)) {
    throw new Error('Attendance check-in is unavailable because the school is not operational today.');
  }

  const allRecords = loadStoredStaffAttendanceRecords(staff, staffAuthId);
  const { records: reconciled } = reconcileUnclosedPriorSessions(allRecords, todayDateKey);

  const existingToday = reconciled.find(
    (r) =>
      r.schoolId === staff.schoolId &&
      (r.staffId === staffAuthId || r.employeeId === staff.staffId) &&
      r.dateKey === todayDateKey
  );

  if (existingToday) {
    if (
      existingToday.checkInAtMs !== null ||
      existingToday.sessionState === 'CHECKED_IN' ||
      existingToday.sessionState === 'CHECKED_OUT'
    ) {
      throw new Error("You have already checked in for today's attendance session.");
    }
    if (existingToday.attendanceStatus === 'Leave' || existingToday.attendanceStatus === 'Absent') {
      throw new Error(`Cannot check in when today is already marked as ${existingToday.attendanceStatus}.`);
    }
  }

  const istParts = getISTDateParts(now);
  const minutesSinceMidnight = istParts.hour24 * 60 + parseInt(istParts.minuteStr, 10);
  const derivedStatus: 'Present' | 'Late' =
    minutesSinceMidnight > config.lateCutoffMinutesFromMidnightIST ? 'Late' : 'Present';

  const docId = buildStaffAttendanceDocId(staff.schoolId, staffAuthId, todayDateKey);
  const newRecord: StaffAttendanceRecord = {
    id: docId,
    staffId: staffAuthId,
    employeeId: staff.staffId,
    staffName: staff.name,
    schoolId: staff.schoolId,
    dateKey: todayDateKey,
    attendanceStatus: derivedStatus,
    sessionState: 'CHECKED_IN',
    checkInAtMs: nowMs,
    checkOutAtMs: null,
    sessionDurationSeconds: 0,
    submittedAtMs: nowMs,
    reviewedAtMs: null,
    approvedAtMs: null,
    reviewerName: null,
    approverName: null,
    approvalState: 'SUBMITTED',
    needsCorrectionReview: false,
    correctionStatus: 'NONE',
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };

  if (auth?.currentUser && firestoreDb) {
    const docPath = `schools/${staff.schoolId}/${STAFF_PERSONAL_ATTENDANCE_COLLECTION}/${docId}`;
    try {
      const ref = doc(
        firestoreDb,
        'schools',
        staff.schoolId,
        STAFF_PERSONAL_ATTENDANCE_COLLECTION,
        docId
      );
      await setDoc(ref, {
        ...JSON.parse(JSON.stringify(newRecord)),
        serverCheckInAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleStaffAttendanceFirestoreError(
        error,
        StaffAttendanceFirestoreOperationType.CREATE,
        docPath
      );
    }
  }

  const nextRecords = existingToday
    ? reconciled.map((r) => (r.id === existingToday.id ? newRecord : r))
    : [...reconciled, newRecord];
  saveStoredStaffAttendanceRecords(nextRecords);

  return newRecord;
}

export async function checkOutStaffAttendance(params?: {
  staff?: StaffIdentityContext;
  staffAuthId?: string;
  config?: SchoolOperationalConfig;
  firestoreDb?: Firestore;
}): Promise<StaffAttendanceRecord> {
  const staff = params?.staff || getActiveStaffCalendarContext();
  const staffAuthId = params?.staffAuthId || getEffectiveStaffAuthId(staff);
  const config = getSchoolOperationalConfig(staff.schoolId, params?.config);
  const firestoreDb = params?.firestoreDb || db;

  const now = getNow();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const todayDateKey = formatISTDateKey(now);

  const allRecords = loadStoredStaffAttendanceRecords(staff, staffAuthId);
  const idx = allRecords.findIndex(
    (r) =>
      r.schoolId === staff.schoolId &&
      (r.staffId === staffAuthId || r.employeeId === staff.staffId) &&
      r.dateKey === todayDateKey
  );

  if (idx === -1) {
    throw new Error("Cannot check out before checking in for today's attendance session.");
  }

  const existing = allRecords[idx];
  if (existing.sessionState === 'NOT_CHECKED_IN' || existing.checkInAtMs === null) {
    throw new Error("Cannot check out before checking in for today's attendance session.");
  }
  if (existing.sessionState === 'CHECKED_OUT' || existing.checkOutAtMs !== null) {
    throw new Error("You have already checked out for today's attendance session.");
  }

  const finalDurationSeconds = Math.max(
    0,
    Math.floor((nowMs - existing.checkInAtMs) / 1000)
  );

  const shouldAutoApprove = Boolean(config.autoApproveOnCheckout);

  const updatedRecord: StaffAttendanceRecord = {
    ...existing,
    sessionState: 'CHECKED_OUT',
    checkOutAtMs: nowMs,
    sessionDurationSeconds: finalDurationSeconds,
    reviewedAtMs: nowMs,
    reviewerName: 'School Administration',
    approvalState: shouldAutoApprove ? 'APPROVED' : 'UNDER_REVIEW',
    approvedAtMs: shouldAutoApprove ? nowMs : null,
    approverName: shouldAutoApprove ? 'Automated Attendance Policy' : null,
    updatedAtIso: nowIso,
  };

  if (auth?.currentUser && firestoreDb) {
    const docPath = `schools/${staff.schoolId}/${STAFF_PERSONAL_ATTENDANCE_COLLECTION}/${existing.id}`;
    try {
      const ref = doc(
        firestoreDb,
        'schools',
        staff.schoolId,
        STAFF_PERSONAL_ATTENDANCE_COLLECTION,
        existing.id
      );
      await updateDoc(ref, {
        sessionState: updatedRecord.sessionState,
        checkOutAtMs: updatedRecord.checkOutAtMs,
        sessionDurationSeconds: updatedRecord.sessionDurationSeconds,
        reviewedAtMs: updatedRecord.reviewedAtMs,
        reviewerName: updatedRecord.reviewerName,
        approvalState: updatedRecord.approvalState,
        approvedAtMs: updatedRecord.approvedAtMs,
        approverName: updatedRecord.approverName,
        updatedAtIso: updatedRecord.updatedAtIso,
        serverCheckOutAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleStaffAttendanceFirestoreError(
        error,
        StaffAttendanceFirestoreOperationType.UPDATE,
        docPath
      );
    }
  }

  const nextRecords = [...allRecords];
  nextRecords[idx] = updatedRecord;
  saveStoredStaffAttendanceRecords(nextRecords);

  return updatedRecord;
}

/**
 * Authorized Admin/Principal approval transition for a submitted/under-review record.
 * Enforces strict role checks and prevents non-admin self-approval.
 */
export async function approveStaffAttendanceRecord(params: {
  recordId: string;
  actor: StaffIdentityContext;
  firestoreDb?: Firestore;
}): Promise<StaffAttendanceRecord> {
  const { actor, recordId } = params;
  const isAuthorizedApprover =
    actor.role === 'SCHOOL_ADMIN' || actor.role === 'PRINCIPAL';
  if (!isAuthorizedApprover) {
    throw new Error('Unauthorized: Only School Administration or Principal can approve attendance records.');
  }

  const allRecords = loadStoredStaffAttendanceRecords(actor, getEffectiveStaffAuthId(actor));
  const idx = allRecords.findIndex((r) => r.id === recordId && r.schoolId === actor.schoolId);
  if (idx === -1) {
    throw new Error('Attendance record not found.');
  }

  const existing = allRecords[idx];
  if (existing.sessionState !== 'CHECKED_OUT' && existing.approvalState === 'NOT_SUBMITTED') {
    throw new Error('Attendance session must be checked out before approval.');
  }

  const now = getNow();
  const nowMs = now.getTime();
  const updated: StaffAttendanceRecord = {
    ...existing,
    reviewedAtMs: existing.reviewedAtMs || nowMs,
    reviewerName: existing.reviewerName || 'School Administration',
    approvedAtMs: nowMs,
    approverName: `${actor.name} (${actor.designation || actor.role})`,
    approvalState: 'APPROVED',
    updatedAtIso: now.toISOString(),
  };

  if (auth?.currentUser && (params.firestoreDb || db)) {
    const firestoreDb = params.firestoreDb || db;
    const docPath = `schools/${actor.schoolId}/${STAFF_PERSONAL_ATTENDANCE_COLLECTION}/${existing.id}`;
    try {
      await updateDoc(
        doc(firestoreDb, 'schools', actor.schoolId, STAFF_PERSONAL_ATTENDANCE_COLLECTION, existing.id),
        {
          reviewedAtMs: updated.reviewedAtMs,
          reviewerName: updated.reviewerName,
          approvedAtMs: updated.approvedAtMs,
          approverName: updated.approverName,
          approvalState: updated.approvalState,
          updatedAtIso: updated.updatedAtIso,
          serverUpdatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      handleStaffAttendanceFirestoreError(
        error,
        StaffAttendanceFirestoreOperationType.UPDATE,
        docPath
      );
    }
  }

  const nextRecords = [...allRecords];
  nextRecords[idx] = updated;
  saveStoredStaffAttendanceRecords(nextRecords);
  return updated;
}

// ---------------------------------------------------------------------------
// Monthly & Today View Builder (Dynamic counts; zero fabricated records)
// ---------------------------------------------------------------------------

function mapFirestoreStaffAttendanceDoc(
  docId: string,
  data: Record<string, unknown>,
  fallbackSchoolId: string
): StaffAttendanceRecord | null {
  const dateKey = typeof data.dateKey === 'string' ? data.dateKey.trim() : '';
  const staffId = typeof data.staffId === 'string' ? data.staffId.trim() : '';
  const schoolId =
    typeof data.schoolId === 'string' && data.schoolId.trim()
      ? data.schoolId.trim()
      : fallbackSchoolId;
  if (!staffId || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const rawStatus = String(data.attendanceStatus || 'Present');
  const attendanceStatus: Exclude<StaffAttendanceStatus, 'None'> =
    rawStatus === 'Absent' ||
    rawStatus === 'Leave' ||
    rawStatus === 'Late' ||
    rawStatus === 'Half Day'
      ? rawStatus
      : 'Present';

  const rawSession = String(data.sessionState || 'NOT_CHECKED_IN');
  const sessionState: DailySessionState =
    rawSession === 'CHECKED_IN' || rawSession === 'CHECKED_OUT'
      ? rawSession
      : 'NOT_CHECKED_IN';

  const rawApproval = String(data.approvalState || 'NOT_SUBMITTED');
  const approvalState: AttendanceApprovalState =
    rawApproval === 'SUBMITTED' ||
    rawApproval === 'UNDER_REVIEW' ||
    rawApproval === 'APPROVED'
      ? rawApproval
      : 'NOT_SUBMITTED';

  const rawCorrection = String(data.correctionStatus || 'NONE');
  const correctionStatus: CorrectionReviewStatus =
    rawCorrection === 'PENDING_CORRECTION_REVIEW' || rawCorrection === 'RESOLVED'
      ? rawCorrection
      : 'NONE';

  return {
    id: docId,
    staffId,
    employeeId:
      typeof data.employeeId === 'string' && data.employeeId.trim()
        ? data.employeeId.trim()
        : staffId,
    staffName: typeof data.staffName === 'string' ? data.staffName : 'Staff Member',
    schoolId,
    dateKey,
    attendanceStatus,
    sessionState,
    checkInAtMs: typeof data.checkInAtMs === 'number' ? data.checkInAtMs : null,
    checkOutAtMs: typeof data.checkOutAtMs === 'number' ? data.checkOutAtMs : null,
    sessionDurationSeconds:
      typeof data.sessionDurationSeconds === 'number' ? data.sessionDurationSeconds : 0,
    submittedAtMs: typeof data.submittedAtMs === 'number' ? data.submittedAtMs : null,
    reviewedAtMs: typeof data.reviewedAtMs === 'number' ? data.reviewedAtMs : null,
    approvedAtMs: typeof data.approvedAtMs === 'number' ? data.approvedAtMs : null,
    reviewerName: typeof data.reviewerName === 'string' ? data.reviewerName : null,
    approverName: typeof data.approverName === 'string' ? data.approverName : null,
    approvalState,
    needsCorrectionReview: Boolean(data.needsCorrectionReview),
    correctionStatus,
    correctionReason:
      typeof data.correctionReason === 'string' ? data.correctionReason : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdAtIso: typeof data.createdAtIso === 'string' ? data.createdAtIso : '',
    updatedAtIso: typeof data.updatedAtIso === 'string' ? data.updatedAtIso : '',
  };
}

export function buildStaffMonthlyAttendanceView(params?: {
  month?: string;
  records?: StaffAttendanceRecord[];
  calendarEvents?: CalendarEventDetail[];
  staff?: StaffIdentityContext;
  staffAuthId?: string;
  config?: SchoolOperationalConfig;
  now?: Date;
  isLiveFirestore?: boolean;
  requiresFirebaseAuth?: boolean;
  error?: string | null;
}): StaffMonthlyAttendance {
  const now = params?.now || getNow();
  const nowMs = now.getTime();
  const todayDateKey = formatISTDateKey(now);
  const staff = params?.staff || getActiveStaffCalendarContext();
  const staffAuthId = params?.staffAuthId || getEffectiveStaffAuthId(staff);
  const config = getSchoolOperationalConfig(staff.schoolId, params?.config);
  const calendarEvents = params?.calendarEvents || [];

  const rawRecords =
    params?.records !== undefined
      ? params.records
      : loadStoredStaffAttendanceRecords(staff, staffAuthId);

  const staffRecords = filterRecordsForStaffIdentity(rawRecords, staff, staffAuthId);
  const { records: reconciledRecords } = reconcileUnclosedPriorSessions(
    staffRecords,
    todayDateKey
  );

  // Build map by dateKey for fast lookup
  const recordByDateKey = new Map<string, StaffAttendanceRecord>();
  for (const rec of reconciledRecords) {
    recordByDateKey.set(rec.dateKey, rec);
  }

  // Clamp requested month strictly to operational & non-future months
  const availableMonths = getAvailableOperationalMonthKeys(config, todayDateKey);
  const clamped = clampToOperationalMonth(params?.month, config, todayDateKey);
  const { year, monthIndex, monthKey, monthName } = clamped;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();

  const days: StaffDayAttendance[] = [];
  const summary: StaffAttendanceSummaryCounts = {
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
    halfDay: 0,
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${monthKey}-${String(d).padStart(2, '0')}`;
    const isToday = dateKey === todayDateKey;
    const isFuture = dateKey > todayDateKey;
    const isOperational = isDateWithinOperationalPeriods(dateKey, config);

    const storedRecord = recordByDateKey.get(dateKey) || null;

    let resolvedStatus: StaffAttendanceStatus = 'None';
    let hasRecord = false;
    let notes: string | undefined;

    if (
      storedRecord &&
      (storedRecord.attendanceStatus as string) !== 'Holiday'
    ) {
      hasRecord = true;
      resolvedStatus = storedRecord.attendanceStatus;
      notes = storedRecord.notes;
    }

    // Dynamically tally all 5 summary counters strictly from actual stored records for this month
    if (resolvedStatus === 'Present') summary.present += 1;
    else if (resolvedStatus === 'Absent') summary.absent += 1;
    else if (resolvedStatus === 'Leave') summary.leave += 1;
    else if (resolvedStatus === 'Late') summary.late += 1;
    else if (resolvedStatus === 'Half Day') summary.halfDay += 1;

    const checkInDisplay =
      storedRecord?.checkInAtMs !== null && storedRecord?.checkInAtMs !== undefined
        ? formatISTTime12h(storedRecord.checkInAtMs)
        : undefined;
    const checkOutDisplay =
      storedRecord?.checkOutAtMs !== null && storedRecord?.checkOutAtMs !== undefined
        ? formatISTTime12h(storedRecord.checkOutAtMs)
        : undefined;

    const durationSec = storedRecord
      ? computeSessionElapsedSeconds(storedRecord, nowMs)
      : 0;

    days.push({
      day: d,
      dateKey,
      status: resolvedStatus,
      sessionState: storedRecord?.sessionState || 'NOT_CHECKED_IN',
      checkIn: checkInDisplay,
      checkOut: checkOutDisplay,
      checkInAtMs: storedRecord?.checkInAtMs ?? null,
      checkOutAtMs: storedRecord?.checkOutAtMs ?? null,
      sessionDurationSeconds: durationSec,
      durationFormatted:
        storedRecord && storedRecord.checkInAtMs !== null
          ? formatDurationHHMMSS(durationSec)
          : null,
      approvalState: storedRecord?.approvalState || 'NOT_SUBMITTED',
      submittedAtMs: storedRecord?.submittedAtMs ?? null,
      reviewedAtMs: storedRecord?.reviewedAtMs ?? null,
      approvedAtMs: storedRecord?.approvedAtMs ?? null,
      reviewerName: storedRecord?.reviewerName ?? null,
      approverName: storedRecord?.approverName ?? null,
      needsCorrectionReview: storedRecord?.needsCorrectionReview ?? false,
      correctionStatus: storedRecord?.correctionStatus || 'NONE',
      notes,
      isToday,
      isFuture,
      isOperational,
      hasRecord,
      record: storedRecord,
    });
  }

  // Build Today's Attendance session view (strictly for todayDateKey)
  const todayStored = recordByDateKey.get(todayDateKey) || null;
  const isOperationalToday = isDateWithinOperationalPeriods(todayDateKey, config);
  const todayParts = getISTDateParts(now);
  const todayHolidayEvents = getEventsForExactDate(
    calendarEvents,
    todayParts.year,
    todayParts.month - 1,
    todayParts.day
  ).filter((ev) => ev.category === 'Holiday');
  const todayHolidayTitle =
    todayHolidayEvents.length > 0 ? todayHolidayEvents[0].title : null;

  const todaySessionState: DailySessionState = todayStored?.sessionState || 'NOT_CHECKED_IN';
  const todayAttendanceStatus: StaffAttendanceStatus =
    todayStored && (todayStored.attendanceStatus as string) !== 'Holiday'
      ? todayStored.attendanceStatus
      : 'None';

  let statusLabel = 'Not Checked In';
  if (todaySessionState === 'CHECKED_IN') {
    statusLabel = 'Checked In';
  } else if (todaySessionState === 'CHECKED_OUT') {
    statusLabel = `Checked Out`;
  } else if (todayAttendanceStatus === 'Leave' || todayAttendanceStatus === 'Absent') {
    statusLabel = todayAttendanceStatus;
  }

  const canCheckIn =
    isOperationalToday &&
    todaySessionState === 'NOT_CHECKED_IN' &&
    todayAttendanceStatus !== 'Leave' &&
    todayAttendanceStatus !== 'Absent';

  const canCheckOut = todaySessionState === 'CHECKED_IN' && todayStored?.checkInAtMs !== null;

  const todayRecord: TodayAttendanceSessionView = {
    dateKey: todayDateKey,
    dateFormatted: formatISTFullDate(now),
    sessionState: todaySessionState,
    attendanceStatus: todayAttendanceStatus,
    statusLabel,
    checkInDisplay:
      todayStored?.checkInAtMs !== null && todayStored?.checkInAtMs !== undefined
        ? formatISTTime12h(todayStored.checkInAtMs)
        : '--:--',
    checkOutDisplay:
      todayStored?.checkOutAtMs !== null && todayStored?.checkOutAtMs !== undefined
        ? formatISTTime12h(todayStored.checkOutAtMs)
        : '--:--',
    checkInAtMs: todayStored?.checkInAtMs ?? null,
    checkOutAtMs: todayStored?.checkOutAtMs ?? null,
    sessionDurationSeconds: todayStored
      ? computeSessionElapsedSeconds(todayStored, nowMs)
      : 0,
    approvalState: todayStored?.approvalState || 'NOT_SUBMITTED',
    submittedAtMs: todayStored?.submittedAtMs ?? null,
    reviewedAtMs: todayStored?.reviewedAtMs ?? null,
    approvedAtMs: todayStored?.approvedAtMs ?? null,
    reviewerName: todayStored?.reviewerName ?? null,
    approverName: todayStored?.approverName ?? null,
    needsCorrectionReview: todayStored?.needsCorrectionReview ?? false,
    correctionStatus: todayStored?.correctionStatus || 'NONE',
    canCheckIn,
    canCheckOut,
    isOperationalToday,
    holidayTitle: todayHolidayTitle,
    record: todayStored,
  };

  // Most recent unclosed prior-day session flagged for correction review
  const pendingCorrectionRecord =
    reconciledRecords
      .filter((r) => r.needsCorrectionReview && r.correctionStatus === 'PENDING_CORRECTION_REVIEW')
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0] || null;

  return {
    month: monthName,
    monthKey,
    year,
    monthIndex,
    summary,
    todayRecord,
    pendingCorrectionRecord,
    days,
    availableMonths,
    prevOperationalMonth: getAdjacentOperationalMonthName(monthName, -1, config, todayDateKey),
    nextOperationalMonth: getAdjacentOperationalMonthName(monthName, 1, config, todayDateKey),
    isLiveFirestore: params?.isLiveFirestore ?? false,
    requiresFirebaseAuth: params?.requiresFirebaseAuth ?? !auth?.currentUser,
    error: params?.error ?? null,
  };
}

/**
 * Synchronous convenience helper for reading current state.
 */
export function getStaffAttendance(month?: string): StaffMonthlyAttendance {
  return buildStaffMonthlyAttendanceView({ month });
}

/**
 * Real-time subscription combining Firebase Firestore (`staffPersonalAttendance`),
 * local persistence fallback, School Calendar holidays, and IST date/midnight rollover.
 */
export function subscribeToStaffPersonalAttendance(
  params: {
    month: string;
    todayDateKey: string;
    staff?: StaffIdentityContext;
    config?: SchoolOperationalConfig;
    firestoreDb?: Firestore;
  },
  onUpdate: (view: StaffMonthlyAttendance) => void
): () => void {
  const staff = params.staff || getActiveStaffCalendarContext();
  const firestoreDb = params.firestoreDb || db;
  let latestMonth = params.month;
  let latestCalendarEvents: CalendarEventDetail[] = [];
  let latestFirestoreRecords: StaffAttendanceRecord[] | null = null;
  let isDisposed = false;
  let unsubscribeFirestore: (() => void) | null = null;

  const emitLocal = (errorMsg: string | null = null) => {
    if (isDisposed) return;
    const staffAuthId = getEffectiveStaffAuthId(staff);
    const records = loadStoredStaffAttendanceRecords(staff, staffAuthId);
    const { records: reconciled, changedIds } = reconcileUnclosedPriorSessions(
      records,
      params.todayDateKey
    );
    if (changedIds.length > 0) {
      saveStoredStaffAttendanceRecords(reconciled);
    }

    onUpdate(
      buildStaffMonthlyAttendanceView({
        month: latestMonth,
        records: reconciled,
        calendarEvents: latestCalendarEvents,
        staff,
        staffAuthId,
        config: params.config,
        isLiveFirestore: false,
        requiresFirebaseAuth: !auth?.currentUser,
        error: errorMsg,
      })
    );
  };

  const emitFirestore = () => {
    if (isDisposed || latestFirestoreRecords === null) return;
    const staffAuthId = getEffectiveStaffAuthId(staff);
    const { records: reconciled, changedIds } = reconcileUnclosedPriorSessions(
      latestFirestoreRecords,
      params.todayDateKey
    );

    // Sync any newly discovered prior-day unclosed session flags to Firestore
    if (changedIds.length > 0 && auth?.currentUser && firestoreDb) {
      for (const id of changedIds) {
        const changed = reconciled.find((r) => r.id === id);
        if (changed) {
          void updateDoc(
            doc(firestoreDb, 'schools', staff.schoolId, STAFF_PERSONAL_ATTENDANCE_COLLECTION, id),
            {
              needsCorrectionReview: true,
              correctionStatus: 'PENDING_CORRECTION_REVIEW',
              notes: changed.notes || '',
              updatedAtIso: changed.updatedAtIso,
              serverUpdatedAt: serverTimestamp(),
            }
          ).catch(() => {});
        }
      }
    }

    onUpdate(
      buildStaffMonthlyAttendanceView({
        month: latestMonth,
        records: reconciled,
        calendarEvents: latestCalendarEvents,
        staff,
        staffAuthId,
        config: params.config,
        isLiveFirestore: true,
        requiresFirebaseAuth: false,
        error: null,
      })
    );
  };

  const detachFirestore = () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
    latestFirestoreRecords = null;
  };

  const attachFirestore = () => {
    detachFirestore();
    if (isDisposed || !auth?.currentUser || !firestoreDb) return;

    void validateStaffAttendanceFirestoreConnection(firestoreDb);

    const staffAuthId = auth.currentUser.uid;
    const collectionPath = `schools/${staff.schoolId}/${STAFF_PERSONAL_ATTENDANCE_COLLECTION}`;
    const attRef = collection(
      firestoreDb,
      'schools',
      staff.schoolId,
      STAFF_PERSONAL_ATTENDANCE_COLLECTION
    );
    const attQuery = query(attRef, where('staffId', '==', staffAuthId));

    unsubscribeFirestore = onSnapshot(
      attQuery,
      (snapshot) => {
        const docs: StaffAttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          const mapped = mapFirestoreStaffAttendanceDoc(
            docSnap.id,
            docSnap.data() as Record<string, unknown>,
            staff.schoolId
          );
          if (mapped) docs.push(mapped);
        });
        latestFirestoreRecords = docs;
        emitFirestore();
      },
      (error) => {
        const errInfo = buildStaffAttendanceFirestoreErrorInfo(
          error,
          StaffAttendanceFirestoreOperationType.LIST,
          collectionPath
        );
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        const isPermission =
          error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied';
        emitLocal(
          isPermission
            ? 'Permission denied while reading personal attendance records.'
            : error?.message || 'Unable to sync personal attendance records.'
        );
      }
    );
  };

  const unsubscribeCalendar = subscribeToStaffCalendarEvents(staff, (events) => {
    latestCalendarEvents = events;
    if (latestFirestoreRecords !== null) {
      emitFirestore();
    } else {
      emitLocal();
    }
  });

  const handleLocalChange = () => {
    if (!auth?.currentUser) {
      emitLocal();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(STAFF_ATTENDANCE_UPDATED_EVENT, handleLocalChange);
    window.addEventListener('storage', handleLocalChange);
  }

  let unsubscribeAuth: (() => void) | null = null;
  if (auth) {
    if (auth.currentUser) {
      attachFirestore();
    } else {
      emitLocal();
    }
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (isDisposed) return;
      if (user) {
        attachFirestore();
      } else {
        detachFirestore();
        emitLocal();
      }
    });
  } else {
    emitLocal();
  }

  return () => {
    isDisposed = true;
    detachFirestore();
    unsubscribeCalendar();
    if (unsubscribeAuth) unsubscribeAuth();
    if (typeof window !== 'undefined') {
      window.removeEventListener(STAFF_ATTENDANCE_UPDATED_EVENT, handleLocalChange);
      window.removeEventListener('storage', handleLocalChange);
    }
  };
}

export function formatRecordDateDisplay(dateKey: string): string {
  return formatISTDateMedium(parseDateKeySafe(dateKey));
}

export function formatApprovalStageTimestamp(timestampMs: number | null): string | null {
  if (timestampMs === null || !Number.isFinite(timestampMs)) return null;
  return formatISTShortDateTime(timestampMs);
}
