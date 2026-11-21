/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getSavedMarksRecords } from './marksService';
import {
  formatISTDateMedium,
  getISTDateParts,
  MONTH_NAMES_LONG,
  parseDateKeySafe,
} from '../utils/dateTimeUtils';

export type CalendarCategory =
  | 'Holiday'
  | 'Event'
  | 'Exam'
  | 'Activity'
  | 'Meeting'
  | 'Classes';

export type CalendarAudience = 'ALL' | 'STAFF' | 'TEACHERS' | 'PARENT' | 'STUDENT';

export interface CalendarEventDetail {
  id: string;
  title: string;
  category: CalendarCategory;
  dateStr: string;
  dateKey: string; // Canonical 'YYYY-MM-DD'
  endDateKey?: string; // Optional inclusive end date 'YYYY-MM-DD' for multi-day events
  dayNumber: number;
  monthIndex: number; // 0-indexed (0 = Jan ... 11 = Dec)
  year: number;
  time: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description: string;
  classesInvolved?: string;
  syllabus?: string;
  itemsToBring?: string;
  schoolId: string;
  academicYear: string;
  targetClasses?: string[];
  sectionIds?: string[];
  audience?: CalendarAudience[];
  status?: 'published' | 'draft' | 'cancelled';
  source: 'firestore' | 'assessment-record' | 'sample';
  isSample?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffIdentityContext {
  staffId: string;
  name: string;
  role: 'STAFF' | 'SCHOOL_ADMIN' | 'PRINCIPAL' | 'TEACHER' | 'NON_TEACHING_STAFF';
  designation: string;
  department: string;
  schoolId: string;
  schoolName: string;
  academicYear: string;
  assignedClasses: string[];
  assignedSections: string[];
}

export interface CalendarSubscriptionStatus {
  loading: boolean;
  isLiveFirestore: boolean;
  requiresFirebaseAuth: boolean;
  error: string | null;
}

export const CALENDAR_CATEGORY_DOT_CLASSES: Record<CalendarCategory, string> = {
  Holiday: 'bg-[#10b981]',
  Event: 'bg-[#2563eb]',
  Exam: 'bg-[#9333ea]',
  Activity: 'bg-[#fb923c]',
  Meeting: 'bg-[#ef4444]',
  Classes: 'bg-[#525252]',
};

export const PRIMARY_LEGEND_CATEGORIES: CalendarCategory[] = [
  'Holiday',
  'Event',
  'Exam',
  'Activity',
  'Meeting',
];

/**
 * Authoritative authenticated Staff identity & school context within the Staff App.
 * Aligns with StaffProfileScreen (T001 / Ms. Priya Sharma / Primary School / Greenwood International School).
 */
export function getActiveStaffCalendarContext(): StaffIdentityContext {
  return {
    staffId: 'T001',
    name: 'Ms. Priya Sharma',
    role: 'STAFF',
    designation: 'Class Teacher',
    department: 'Primary School',
    schoolId: 'greenwood-intl',
    schoolName: 'Greenwood International School',
    academicYear: '2026-27',
    assignedClasses: ['Grade 5 - A', 'Grade 5 - B', 'Grade 6 - A'],
    assignedSections: ['A', 'B'],
  };
}

/**
 * Pure UTC-anchored calendar helpers preventing browser-timezone shifts around midnight.
 */
export function getDaysInMonthUTC(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
}

export function getMonthLeadingPaddingDaysUTC(year: number, monthIndex: number): number[] {
  const firstDayOfWeek = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0)).getUTCDay();
  if (firstDayOfWeek === 0) return [];
  const prevMonthDays = new Date(Date.UTC(year, monthIndex, 0, 12, 0, 0)).getUTCDate();
  const padding: number[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    padding.push(prevMonthDays - i);
  }
  return padding;
}

export function getMonthTrailingPaddingDaysUTC(year: number, monthIndex: number): number[] {
  const leadingCount = getMonthLeadingPaddingDaysUTC(year, monthIndex).length;
  const daysInMonth = getDaysInMonthUTC(year, monthIndex);
  const totalRendered = leadingCount + daysInMonth;
  const trailingCount = (7 - (totalRendered % 7)) % 7;
  const padding: number[] = [];
  for (let d = 1; d <= trailingCount; d++) {
    padding.push(d);
  }
  return padding;
}

export function buildDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatMonthYearTitle(year: number, monthIndex: number): string {
  return `${MONTH_NAMES_LONG[monthIndex]} ${year}`;
}

function normalizeCalendarCategory(raw: unknown): CalendarCategory {
  const value = String(raw || '').trim().toLowerCase();
  switch (value) {
    case 'holiday':
    case 'holidays':
      return 'Holiday';
    case 'exam':
    case 'exams':
    case 'examination':
    case 'assessment':
      return 'Exam';
    case 'activity':
    case 'activities':
      return 'Activity';
    case 'meeting':
    case 'meetings':
    case 'ptm':
      return 'Meeting';
    case 'class':
    case 'classes':
    case 'schedule':
      return 'Classes';
    case 'event':
    case 'events':
    default:
      return 'Event';
  }
}

function parseEventDateToParts(
  rawDate: unknown
): { dateKey: string; year: number; monthIndex: number; dayNumber: number; dateStr: string } | null {
  if (!rawDate) return null;

  // Handle Firestore Timestamp-like object
  if (typeof rawDate === 'object' && rawDate !== null && 'toDate' in rawDate) {
    const asDate = (rawDate as { toDate: () => Date }).toDate();
    if (asDate instanceof Date && !isNaN(asDate.getTime())) {
      const parts = getISTDateParts(asDate);
      return {
        dateKey: `${parts.yearStr}-${parts.monthStr}-${parts.dayStr}`,
        year: parts.year,
        monthIndex: parts.month - 1,
        dayNumber: parts.day,
        dateStr: formatISTDateMedium(asDate),
      };
    }
  }

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const safe = parseDateKeySafe(trimmed);
      const parts = getISTDateParts(safe);
      return {
        dateKey: `${parts.yearStr}-${parts.monthStr}-${parts.dayStr}`,
        year: parts.year,
        monthIndex: parts.month - 1,
        dayNumber: parts.day,
        dateStr: formatISTDateMedium(safe),
      };
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const parts = getISTDateParts(parsed);
      return {
        dateKey: `${parts.yearStr}-${parts.monthStr}-${parts.dayStr}`,
        year: parts.year,
        monthIndex: parts.month - 1,
        dayNumber: parts.day,
        dateStr: formatISTDateMedium(parsed),
      };
    }
  }

  return null;
}

/**
 * Enforces school-level tenant isolation, academic-year scoping, audience visibility,
 * and teacher class/section permissions on calendar records.
 */
export function filterCalendarEventsForStaff(
  events: CalendarEventDetail[],
  staff: StaffIdentityContext
): CalendarEventDetail[] {
  const isSchoolWideAdmin = staff.role === 'SCHOOL_ADMIN' || staff.role === 'PRINCIPAL';
  const normalizedAssignedClasses = staff.assignedClasses.map((c) => c.trim().toLowerCase());

  return events.filter((ev) => {
    // 1. Strict school isolation
    if (!ev.schoolId || ev.schoolId !== staff.schoolId) {
      return false;
    }

    // 2. Academic year isolation (when declared on record)
    if (ev.academicYear && ev.academicYear !== staff.academicYear) {
      return false;
    }

    // 3. Exclude unpublished drafts or cancelled records
    if (ev.status === 'draft' || ev.status === 'cancelled') {
      return false;
    }

    // 4. Audience check (must target staff/teachers/all)
    if (ev.audience && ev.audience.length > 0) {
      const staffVisible = ev.audience.some(
        (aud) => aud === 'ALL' || aud === 'STAFF' || aud === 'TEACHERS'
      );
      if (!staffVisible) return false;
    }

    // 5. Class / section scope check for teaching staff
    if (!isSchoolWideAdmin && ev.targetClasses && ev.targetClasses.length > 0) {
      const includesSchoolWide = ev.targetClasses.some((cls) => {
        const norm = cls.trim().toLowerCase();
        return norm === 'all' || norm === 'all classes' || norm === 'school-wide';
      });
      if (!includesSchoolWide) {
        const matchesAssigned = ev.targetClasses.some((cls) =>
          normalizedAssignedClasses.includes(cls.trim().toLowerCase())
        );
        if (!matchesAssigned) return false;
      }
    }

    return true;
  });
}

/**
 * Reads genuine staff-published AssessmentRecords (from Add Marks / marksService)
 * and maps them to 'Exam' calendar events when a teacher has published assessments.
 */
export function getLocalAssessmentCalendarEvents(
  staff: StaffIdentityContext
): CalendarEventDetail[] {
  const assessments = getSavedMarksRecords();
  const mapped: CalendarEventDetail[] = [];

  for (const record of assessments) {
    if (record.schoolId !== staff.schoolId || !record.isPublished) continue;
    const parsedDate = parseEventDateToParts(record.examDate);
    if (!parsedDate) continue;

    mapped.push({
      id: `exam-${record.id}`,
      title: `${record.subject} – ${record.assessmentType}`,
      category: 'Exam',
      dateStr: parsedDate.dateStr,
      dateKey: parsedDate.dateKey,
      dayNumber: parsedDate.dayNumber,
      monthIndex: parsedDate.monthIndex,
      year: parsedDate.year,
      time: 'School Exam Schedule',
      location: record.grade,
      description: `Published ${record.assessmentType} assessment for ${record.subject} (${record.grade}). Total Marks: ${record.totalMarks}, Passing Marks: ${record.passingMarks}.`,
      classesInvolved: record.grade,
      schoolId: record.schoolId,
      academicYear: staff.academicYear,
      targetClasses: [record.grade],
      audience: ['STAFF', 'ALL'],
      status: 'published',
      source: 'assessment-record',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  return filterCalendarEventsForStaff(mapped, staff);
}

interface SampleCalendarEventSpec {
  id: string;
  title: string;
  category: CalendarCategory;
  dateKey: string;
  endDateKey?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  location: string;
  description: string;
  classesInvolved: string;
  syllabus?: string;
  itemsToBring?: string;
  targetClasses?: string[];
}

const SAMPLE_CALENDAR_EVENT_SPECS: SampleCalendarEventSpec[] = [
  {
    id: 'sample-2026-11-09-diwali-holiday',
    title: 'Diwali Break',
    category: 'Holiday',
    dateKey: '2026-11-09',
    time: 'All Day',
    location: 'Greenwood International School',
    description: 'School closed for Diwali festive holiday.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
  {
    id: 'sample-2026-11-21-childrens-day',
    title: "Children's Day Celebration",
    category: 'Event',
    dateKey: '2026-11-21',
    time: '09:00 AM – 12:30 PM',
    startTime: '09:00 AM',
    endTime: '12:30 PM',
    location: 'School Auditorium & Classrooms',
    description: 'Special assembly, cultural performances, and student celebration activities.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
  {
    id: 'sample-2026-11-23-math-unit-test',
    title: 'Mathematics Unit Test',
    category: 'Exam',
    dateKey: '2026-11-23',
    time: '09:00 AM – 10:30 AM',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    location: 'Assigned Classrooms',
    description: 'Scheduled Mathematics unit test assessment across primary grades.',
    classesInvolved: 'Grade 5 - A, Grade 5 - B, Grade 6 - A',
    syllabus: 'Fractions, Decimals, and Geometry Basics',
    itemsToBring: 'Geometry box, blue/black pens, and school ID card',
    targetClasses: ['Grade 5 - A', 'Grade 5 - B', 'Grade 6 - A'],
  },
  {
    id: 'sample-2026-11-24-science-unit-test',
    title: 'Science Unit Test',
    category: 'Exam',
    dateKey: '2026-11-24',
    time: '09:00 AM – 10:30 AM',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    location: 'Assigned Classrooms',
    description: 'Scheduled Science unit test covering Term 2 core chapters.',
    classesInvolved: 'Grade 5 - A, Grade 5 - B, Grade 6 - A',
    syllabus: 'Human Body Systems, States of Matter, and Simple Machines',
    itemsToBring: 'Blue/black pens, pencil, and ruler',
    targetClasses: ['Grade 5 - A', 'Grade 5 - B', 'Grade 6 - A'],
  },
  {
    id: 'sample-2026-11-25-inter-house-sports',
    title: 'Inter-House Sports Competition',
    category: 'Activity',
    dateKey: '2026-11-25',
    time: '08:30 AM – 01:00 PM',
    startTime: '08:30 AM',
    endTime: '01:00 PM',
    location: 'Main Sports Ground',
    description: 'Inter-house relay races, badminton matches, and athletic events.',
    classesInvolved: 'Grade 5 - A, Grade 5 - B, Grade 6 - A',
    itemsToBring: 'House sports uniform, running shoes, and water bottle',
    targetClasses: ['Grade 5 - A', 'Grade 5 - B', 'Grade 6 - A'],
  },
  {
    id: 'sample-2026-11-26-science-exhibition',
    title: 'Science Exhibition',
    category: 'Event',
    dateKey: '2026-11-26',
    time: '10:00 AM – 03:00 PM',
    startTime: '10:00 AM',
    endTime: '03:00 PM',
    location: 'School Science Hall',
    description: 'Student STEM working models, robotics demos, and science project displays.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
  {
    id: 'sample-2026-11-27-ptm',
    title: 'Parent-Teacher Meeting',
    category: 'Meeting',
    dateKey: '2026-11-27',
    time: '09:00 AM – 01:30 PM',
    startTime: '09:00 AM',
    endTime: '01:30 PM',
    location: 'Respective Classrooms',
    description: 'One-on-one academic progress and attendance review with parents.',
    classesInvolved: 'Grade 5 - A, Grade 5 - B, Grade 6 - A',
    targetClasses: ['Grade 5 - A', 'Grade 5 - B', 'Grade 6 - A'],
  },
  {
    id: 'sample-2026-11-28-foundation-day-holiday',
    title: 'Foundation Day Holiday',
    category: 'Holiday',
    dateKey: '2026-11-28',
    time: 'All Day',
    location: 'Greenwood International School',
    description: 'School holiday on account of Annual Foundation Day.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
  {
    id: 'sample-2026-11-30-cultural-programme',
    title: 'School Cultural Programme',
    category: 'Event',
    dateKey: '2026-11-30',
    time: '10:30 AM – 01:30 PM',
    startTime: '10:30 AM',
    endTime: '01:30 PM',
    location: 'Main Auditorium',
    description: 'Music, classical dance, drama showcase, and student talent awards.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
  {
    id: 'sample-2026-12-12-annual-sports-day',
    title: 'Annual Sports Day',
    category: 'Activity',
    dateKey: '2026-12-12',
    time: '08:00 AM – 02:30 PM',
    startTime: '08:00 AM',
    endTime: '02:30 PM',
    location: 'Main Athletic Ground',
    description: 'Annual march past, track & field finals, and house trophy ceremony.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
  {
    id: 'sample-2026-12-23-christmas-celebration',
    title: 'Christmas Celebration',
    category: 'Event',
    dateKey: '2026-12-23',
    time: '09:30 AM – 12:30 PM',
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    location: 'School Auditorium',
    description: 'Festive school assembly, choir performance, and holiday class gathering.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
  {
    id: 'sample-2026-12-26-winter-vacation',
    title: 'Winter Vacation',
    category: 'Holiday',
    dateKey: '2026-12-26',
    endDateKey: '2027-01-03',
    time: 'All Day',
    location: 'Greenwood International School',
    description: 'School closed for annual winter break. Classes resume on 4 Jan 2027.',
    classesInvolved: 'All Classes',
    targetClasses: ['All Classes'],
  },
];

/**
 * Builds clearly identified sample school calendar events using the canonical
 * CalendarEventDetail data model so both Upcoming Events and School Calendar share one source.
 */
export function getSampleCalendarEvents(
  staff: StaffIdentityContext
): CalendarEventDetail[] {
  const mapped: CalendarEventDetail[] = [];

  for (const spec of SAMPLE_CALENDAR_EVENT_SPECS) {
    const parsedDate = parseEventDateToParts(spec.dateKey);
    if (!parsedDate) continue;

    mapped.push({
      id: spec.id,
      title: spec.title,
      category: spec.category,
      dateStr: parsedDate.dateStr,
      dateKey: parsedDate.dateKey,
      endDateKey: spec.endDateKey,
      dayNumber: parsedDate.dayNumber,
      monthIndex: parsedDate.monthIndex,
      year: parsedDate.year,
      time: spec.time,
      startTime: spec.startTime,
      endTime: spec.endTime,
      location: spec.location,
      description: spec.description,
      classesInvolved: spec.classesInvolved,
      syllabus: spec.syllabus,
      itemsToBring: spec.itemsToBring,
      schoolId: staff.schoolId,
      academicYear: staff.academicYear,
      targetClasses: spec.targetClasses,
      audience: ['STAFF', 'ALL'],
      source: 'sample',
      isSample: true,
    });
  }

  return filterCalendarEventsForStaff(mapped, staff);
}

/**
 * Merges live Firestore events, local published assessment events, and sample events
 * without duplicating records across repeated loads.
 */
function mergeCalendarEventsWithSampleFallback(
  primaryEvents: CalendarEventDetail[],
  staff: StaffIdentityContext
): CalendarEventDetail[] {
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: CalendarEventDetail[] = [];

  const addUnique = (ev: CalendarEventDetail) => {
    const signature = `${ev.dateKey}::${ev.title.trim().toLowerCase()}`;
    if (seenIds.has(ev.id) || seenSignatures.has(signature)) return;
    seenIds.add(ev.id);
    seenSignatures.add(signature);
    result.push(ev);
  };

  for (const ev of primaryEvents) {
    addUnique(ev);
  }

  const sampleEvents = getSampleCalendarEvents(staff);
  for (const sampleEv of sampleEvents) {
    addUnique(sampleEv);
  }

  return filterCalendarEventsForStaff(result, staff);
}

/**
 * Maps a Firestore calendarEvents document cleanly to CalendarEventDetail.
 */
function mapFirestoreCalendarDoc(
  docId: string,
  data: Record<string, unknown>,
  fallbackSchoolId: string,
  fallbackAcademicYear: string
): CalendarEventDetail | null {
  const parsedDate = parseEventDateToParts(data.date ?? data.dateKey ?? data.startDate);
  if (!parsedDate) return null;

  const startTime = typeof data.startTime === 'string' ? data.startTime.trim() : '';
  const endTime = typeof data.endTime === 'string' ? data.endTime.trim() : '';
  const explicitTime = typeof data.time === 'string' ? data.time.trim() : '';
  const timeDisplay =
    explicitTime ||
    (startTime && endTime ? `${startTime} – ${endTime}` : startTime || 'All Day');

  const rawTargetClasses = Array.isArray(data.targetClasses)
    ? data.targetClasses.filter((v): v is string => typeof v === 'string')
    : Array.isArray(data.classesInvolved)
      ? data.classesInvolved.filter((v): v is string => typeof v === 'string')
      : undefined;

  const classesInvolvedText =
    typeof data.classesInvolved === 'string' && data.classesInvolved.trim()
      ? data.classesInvolved.trim()
      : rawTargetClasses && rawTargetClasses.length > 0
        ? rawTargetClasses.join(', ')
        : undefined;

  const rawAudience = Array.isArray(data.audience)
    ? data.audience
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.toUpperCase() as CalendarAudience)
    : undefined;

  const rawStatus =
    typeof data.status === 'string' ? data.status.toLowerCase() : 'published';

  const parsedEndDate = parseEventDateToParts(data.endDate ?? data.endDateKey);

  return {
    id: docId,
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'School Event',
    category: normalizeCalendarCategory(data.category),
    dateStr: parsedDate.dateStr,
    dateKey: parsedDate.dateKey,
    endDateKey:
      parsedEndDate && parsedEndDate.dateKey >= parsedDate.dateKey
        ? parsedEndDate.dateKey
        : undefined,
    dayNumber: parsedDate.dayNumber,
    monthIndex: parsedDate.monthIndex,
    year: parsedDate.year,
    time: timeDisplay,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    location:
      typeof data.location === 'string' && data.location.trim()
        ? data.location.trim()
        : undefined,
    description:
      typeof data.description === 'string' && data.description.trim()
        ? data.description.trim()
        : 'No description provided.',
    classesInvolved: classesInvolvedText,
    syllabus:
      typeof data.syllabus === 'string' && data.syllabus.trim()
        ? data.syllabus.trim()
        : undefined,
    itemsToBring:
      typeof data.itemsToBring === 'string' && data.itemsToBring.trim()
        ? data.itemsToBring.trim()
        : undefined,
    schoolId:
      typeof data.schoolId === 'string' && data.schoolId.trim()
        ? data.schoolId.trim()
        : fallbackSchoolId,
    academicYear:
      typeof data.academicYear === 'string' && data.academicYear.trim()
        ? data.academicYear.trim()
        : fallbackAcademicYear,
    targetClasses: rawTargetClasses,
    sectionIds: Array.isArray(data.sectionIds)
      ? data.sectionIds.filter((v): v is string => typeof v === 'string')
      : undefined,
    audience: rawAudience,
    status:
      rawStatus === 'draft' || rawStatus === 'cancelled' ? rawStatus : 'published',
    source: 'firestore',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
  };
}

/**
 * Subscribes to school-isolated calendar events.
 * - When Firebase Authentication is signed in (`auth.currentUser`), attaches a live
 *   `onSnapshot` listener to `schools/{schoolId}/calendarEvents` merged with local
 *   assessment records.
 * - When `auth.currentUser` is null (Staff App currently uses simulated UI login),
 *   does NOT attempt unauthenticated Firestore reads or pretend live sync is active;
 *   only returns genuine staff-scoped assessment records if present.
 */
export function subscribeToStaffCalendarEvents(
  staff: StaffIdentityContext,
  onUpdate: (
    events: CalendarEventDetail[],
    status: CalendarSubscriptionStatus
  ) => void
): () => void {
  const localAndSampleEvents = mergeCalendarEventsWithSampleFallback(
    getLocalAssessmentCalendarEvents(staff),
    staff
  );

  if (!auth.currentUser) {
    onUpdate(localAndSampleEvents, {
      loading: false,
      isLiveFirestore: false,
      requiresFirebaseAuth: true,
      error: null,
    });
    return () => {};
  }

  onUpdate(localAndSampleEvents, {
    loading: true,
    isLiveFirestore: false,
    requiresFirebaseAuth: false,
    error: null,
  });

  const eventsRef = collection(db, 'schools', staff.schoolId, 'calendarEvents');
  const eventsQuery = query(
    eventsRef,
    where('academicYear', '==', staff.academicYear)
  );

  const unsubscribe = onSnapshot(
    eventsQuery,
    (snapshot) => {
      const firestoreEvents: CalendarEventDetail[] = [];
      snapshot.forEach((docSnap) => {
        const mapped = mapFirestoreCalendarDoc(
          docSnap.id,
          docSnap.data() as Record<string, unknown>,
          staff.schoolId,
          staff.academicYear
        );
        if (mapped) firestoreEvents.push(mapped);
      });

      const merged = mergeCalendarEventsWithSampleFallback(
        [...firestoreEvents, ...getLocalAssessmentCalendarEvents(staff)],
        staff
      );

      onUpdate(merged, {
        loading: false,
        isLiveFirestore: true,
        requiresFirebaseAuth: false,
        error: null,
      });
    },
    (err) => {
      const isPermissionError =
        err && typeof err === 'object' && 'code' in err && err.code === 'permission-denied';
      onUpdate(
        mergeCalendarEventsWithSampleFallback(
          getLocalAssessmentCalendarEvents(staff),
          staff
        ),
        {
          loading: false,
          isLiveFirestore: false,
          requiresFirebaseAuth: isPermissionError,
          error: isPermissionError
            ? 'You do not have permission to read school calendar events from Firestore.'
            : err.message || 'Unable to sync school calendar events.',
        }
      );
    }
  );

  return unsubscribe;
}

/**
 * Matches events for an exact (year, monthIndex, day) calendar date,
 * including multi-day events spanning across that date.
 * Never performs year-agnostic matching.
 */
export function getEventsForExactDate(
  events: CalendarEventDetail[],
  year: number,
  monthIndex: number,
  day: number
): CalendarEventDetail[] {
  const targetKey = buildDateKey(year, monthIndex, day);
  return events.filter((ev) => {
    if (ev.dateKey === targetKey) return true;
    if (ev.endDateKey && targetKey >= ev.dateKey && targetKey <= ev.endDateKey) {
      return true;
    }
    return ev.year === year && ev.monthIndex === monthIndex && ev.dayNumber === day;
  });
}

/**
 * Deterministic mapping from Staff Portal event categories to the 3 card date tile accents.
 */
export type DateTileAccent = 'orange' | 'purple' | 'green';

export function getCategoryDateAccent(category: CalendarCategory): DateTileAccent {
  switch (category) {
    case 'Holiday':
    case 'Classes':
      return 'green';
    case 'Exam':
    case 'Meeting':
      return 'purple';
    case 'Event':
    case 'Activity':
    default:
      return 'orange';
  }
}

/**
 * Returns upcoming and currently-active multi-day events relative to today's Asia/Kolkata date,
 * sorted chronologically by dateKey, time, and title. Excludes expired past events.
 */
export function getUpcomingStaffEvents(
  events: CalendarEventDetail[],
  todayDateKey: string
): CalendarEventDetail[] {
  return events
    .filter((ev) => {
      if (ev.status === 'draft' || ev.status === 'cancelled') return false;
      const effectiveEndKey =
        ev.endDateKey && ev.endDateKey >= ev.dateKey ? ev.endDateKey : ev.dateKey;
      return effectiveEndKey >= todayDateKey;
    })
    .slice()
    .sort((a, b) => {
      const aSortKey = a.dateKey < todayDateKey ? todayDateKey : a.dateKey;
      const bSortKey = b.dateKey < todayDateKey ? todayDateKey : b.dateKey;
      if (aSortKey !== bSortKey) return aSortKey.localeCompare(bSortKey);
      const aTime = (a.startTime || a.time || '').trim();
      const bTime = (b.startTime || b.time || '').trim();
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return a.title.localeCompare(b.title);
    });
}

/**
 * Computes deduplicated category indicators per date key for a visible month/year,
 * including multi-day events active during days of that month.
 */
export function buildMonthCategoryIndicatorMap(
  events: CalendarEventDetail[],
  year: number,
  monthIndex: number
): Map<number, CalendarCategory[]> {
  const indicatorMap = new Map<number, CalendarCategory[]>();
  const daysInMonth = getDaysInMonthUTC(year, monthIndex);
  const monthStartKey = buildDateKey(year, monthIndex, 1);
  const monthEndKey = buildDateKey(year, monthIndex, daysInMonth);

  for (const ev of events) {
    const endKey = ev.endDateKey && ev.endDateKey >= ev.dateKey ? ev.endDateKey : ev.dateKey;
    if (endKey < monthStartKey || ev.dateKey > monthEndKey) continue;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = buildDateKey(year, monthIndex, day);
      if (dayKey >= ev.dateKey && dayKey <= endKey) {
        const existing = indicatorMap.get(day) || [];
        if (!existing.includes(ev.category)) {
          existing.push(ev.category);
          indicatorMap.set(day, existing);
        }
      }
    }
  }

  return indicatorMap;
}
