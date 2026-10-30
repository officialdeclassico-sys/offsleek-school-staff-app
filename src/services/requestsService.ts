/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  formatISTCompactDateKey,
  formatISTDateMedium,
  formatISTDateTime,
  formatISTShortDateTime,
  getNow,
} from '../utils/dateTimeUtils';

export interface ParentLeaveRequest {
  id: string;
  parentId: string;
  parentName: string;
  parentInitials: string;
  parentColor: string;
  studentId: string;
  studentName: string;
  classSection: string;
  rollNo: string;
  dates: string;
  fromDate: string;
  toDate: string;
  durationDays: number;
  reason: string;
  message: string;
  submittedOn: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decisionDate?: string;
  decidedBy?: string;
  teacherRemarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: 'Leave' | 'Salary Slip' | 'Document' | 'Other';
  title: string;
  subtitle?: string;
  details: string;
  dates?: string;
  status: 'Pending Approval' | 'Under Review' | 'Completed' | 'Approved' | 'Rejected';
  submittedOn: string;
  stage1Timestamp?: string;
  stage2Label?: string;
  stage2Sublabel?: string;
  stage2Timestamp?: string;
  stage3Label?: string;
  stage3Timestamp?: string;
  rejectionReason?: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  duration?: string;
  reason?: string;
  attachmentName?: string;
  attachmentSize?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PARENT_LEAVE_STORAGE_KEY = 'offsleek_parent_leave_requests_v1';
const STAFF_REQUESTS_STORAGE_KEY = 'offsleek_staff_requests_v4';

// Initial 5 Parent Leave Requests (Exactly matching Screen 5 of Mockup: Pending (5))
export const INITIAL_PARENT_LEAVE_REQUESTS: ParentLeaveRequest[] = [
  {
    id: 'PLR-20261012-001',
    parentId: 'p-01',
    parentName: 'Rajesh Kumar',
    parentInitials: 'RK',
    parentColor: '#2563eb', // blue
    studentId: 's-kumar-08',
    studentName: 'Aarav Kumar',
    classSection: 'Class 6 A',
    rollNo: '08',
    dates: '14 Oct - 16 Oct 2026 (3 days)',
    fromDate: '2026-10-14',
    toDate: '2026-10-16',
    durationDays: 3,
    reason: 'Family function',
    message: 'We will be travelling for a family function. Please approve the leave for these dates.',
    submittedOn: '12 Oct 2026, 04:30 PM',
    status: 'Pending',
  },
  {
    id: 'PLR-20261015-002',
    parentId: 'p-02',
    parentName: 'Sneha Patel',
    parentInitials: 'SP',
    parentColor: '#e11d48', // rose
    studentId: 's-patel-12',
    studentName: 'Isha Patel',
    classSection: 'Class 4 B',
    rollNo: '12',
    dates: '17 Oct 2026 (1 day)',
    fromDate: '2026-10-17',
    toDate: '2026-10-17',
    durationDays: 1,
    reason: 'Medical appointment',
    message: 'She has a medical appointment. Kindly approve.',
    submittedOn: '15 Oct 2026, 11:20 AM',
    status: 'Pending',
  },
  {
    id: 'PLR-20261016-003',
    parentId: 'p-03',
    parentName: 'Amit Khanna',
    parentInitials: 'AK',
    parentColor: '#0284c7', // sky
    studentId: 's-khanna-19',
    studentName: 'Vihaan Khanna',
    classSection: 'Class 8 C',
    rollNo: '19',
    dates: '20 Oct - 21 Oct 2026 (2 days)',
    fromDate: '2026-10-20',
    toDate: '2026-10-21',
    durationDays: 2,
    reason: 'Out of station travel',
    message: 'Travelling out of station to hometown for urgent family commitments.',
    submittedOn: '16 Oct 2026, 02:15 PM',
    status: 'Pending',
  },
  {
    id: 'PLR-20261014-004',
    parentId: 'p-04',
    parentName: 'Meera Singh',
    parentInitials: 'MS',
    parentColor: '#7c3aed', // violet
    studentId: 's-singh-05',
    studentName: 'Anaya Singh',
    classSection: 'Class 2 A',
    rollNo: '05',
    dates: '15 Oct 2026 (1 day)',
    fromDate: '2026-10-15',
    toDate: '2026-10-15',
    durationDays: 1,
    reason: 'Personal work',
    message: 'Personal domestic requirement requiring absence for one day.',
    submittedOn: '14 Oct 2026, 08:30 AM',
    status: 'Pending',
  },
  {
    id: 'PLR-20261013-005',
    parentId: 'p-05',
    parentName: 'Ramesh Gupta',
    parentInitials: 'RG',
    parentColor: '#059669', // emerald
    studentId: 's-gupta-09',
    studentName: 'Rohan Gupta',
    classSection: 'Grade 5 - A',
    rollNo: '09',
    dates: '18 Oct - 19 Oct 2026 (2 days)',
    fromDate: '2026-10-18',
    toDate: '2026-10-19',
    durationDays: 2,
    reason: 'Family ceremony',
    message: 'Attending grandfather ceremony in Rajasthan.',
    submittedOn: '13 Oct 2026, 10:00 AM',
    status: 'Pending',
  },
];

// Initial Staff Requests (Exact match to My Requests reference screenshot)
export const INITIAL_STAFF_REQUESTS: StaffRequest[] = [
  {
    id: 'SR-20261014-001',
    staffId: 'T001',
    staffName: 'Ms. Priya Sharma',
    type: 'Leave',
    title: 'Leave Request',
    subtitle: 'Family function leave',
    dates: '14 Oct 2026 - 16 Oct 2026 (3 days)',
    details: '14 Oct 2026 - 16 Oct 2026 (3 days)',
    status: 'Pending Approval',
    submittedOn: '14 Oct 2026, 09:41 AM',
    stage1Timestamp: '14 Oct, 09:41 AM',
    stage2Label: 'Under Review',
    stage2Sublabel: '(Administration)',
    stage3Label: 'Approved',
    leaveType: 'Casual Leave',
    fromDate: '2026-10-14',
    toDate: '2026-10-16',
    duration: '14 Oct 2026 - 16 Oct 2026 (3 days)',
    reason: 'Family function leave',
  },
  {
    id: 'SR-20261005-002',
    staffId: 'T001',
    staffName: 'Ms. Priya Sharma',
    type: 'Salary Slip',
    title: 'Salary Slip',
    subtitle: 'Request for September 2026',
    dates: '5 Oct 2026 - 5 Oct 2026',
    details: '5 Oct 2026 - 5 Oct 2026',
    status: 'Completed',
    submittedOn: '5 Oct 2026, 10:15 AM',
    stage1Timestamp: '5 Oct, 10:15 AM',
    stage2Label: 'Approved',
    stage2Timestamp: '10 Oct, 02:30 PM',
    stage3Label: 'Completed',
    stage3Timestamp: '10 Oct, 02:30 PM',
    reason: 'Request for September 2026',
  },
  {
    id: 'SR-20261002-003',
    staffId: 'T001',
    staffName: 'Ms. Priya Sharma',
    type: 'Document',
    title: 'Experience Letter',
    subtitle: 'For foreign visa application',
    dates: '2 Oct 2026 - 2 Oct 2026',
    details: '2 Oct 2026 - 2 Oct 2026',
    status: 'Approved',
    submittedOn: '2 Oct 2026, 11:20 AM',
    stage1Timestamp: '2 Oct, 11:20 AM',
    stage2Label: 'Approved',
    stage2Timestamp: '3 Oct, 04:45 PM',
    stage3Label: 'Completed',
    reason: 'For foreign visa application',
  },
  {
    id: 'SR-20260928-004',
    staffId: 'T001',
    staffName: 'Ms. Priya Sharma',
    type: 'Other',
    title: 'Other Request',
    subtitle: 'Request for ID card reissue',
    dates: '28 Sep 2026 - 28 Sep 2026',
    details: '28 Sep 2026 - 28 Sep 2026',
    status: 'Rejected',
    submittedOn: '28 Sep 2026, 09:10 AM',
    stage1Timestamp: '28 Sep, 09:10 AM',
    stage2Label: 'Rejected',
    stage2Timestamp: '29 Sep, 11:35 AM',
    stage3Label: 'Completed',
    reason: 'Request for ID card reissue',
    rejectionReason: 'ID card reissue requires physical verification.\nPlease contact the administration office.',
  },
];

// Get stored parent leave requests (Shared across Staff and Parent portals)
export function getParentLeaveRequests(): ParentLeaveRequest[] {
  try {
    const raw = localStorage.getItem(PARENT_LEAVE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PARENT_LEAVE_STORAGE_KEY, JSON.stringify(INITIAL_PARENT_LEAVE_REQUESTS));
      return INITIAL_PARENT_LEAVE_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PARENT_LEAVE_REQUESTS;
  } catch (err) {
    console.error('Failed to get parent leave requests:', err);
    return INITIAL_PARENT_LEAVE_REQUESTS;
  }
}

// Save or update a parent leave request (Shared cross-portal)
export function updateParentLeaveRequestStatus(
  requestId: string,
  status: 'Approved' | 'Rejected',
  teacherRemarks?: string,
  decidedBy: string = 'Ms. Priya Sharma (Class Teacher)'
): ParentLeaveRequest {
  const all = getParentLeaveRequests();
  const index = all.findIndex((r) => r.id === requestId);
  if (index === -1) {
    throw new Error(`Request with ID ${requestId} not found.`);
  }

  const now = getNow();
  const nowIso = now.toISOString();
  const decisionTimestamp = formatISTDateTime(now);

  const updated: ParentLeaveRequest = {
    ...all[index],
    status,
    decisionDate: decisionTimestamp,
    decidedBy,
    teacherRemarks: teacherRemarks || (status === 'Approved' ? 'Approved by Class Teacher' : 'Leave request cannot be approved at this time.'),
    createdAt: all[index].createdAt,
    updatedAt: nowIso,
  };

  all[index] = updated;
  localStorage.setItem(PARENT_LEAVE_STORAGE_KEY, JSON.stringify(all));

  // Trigger custom event for real-time cross-tab / cross-component sync
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offsleek_parent_leave_updated', { detail: updated }));
  }

  return updated;
}

// Add a parent leave request from Parents Portal
export function addParentLeaveRequest(newRequest: Omit<ParentLeaveRequest, 'id' | 'submittedOn' | 'status'>): ParentLeaveRequest {
  const all = getParentLeaveRequests();
  const now = getNow();
  const nowIso = now.toISOString();

  const record: ParentLeaveRequest = {
    ...newRequest,
    id: `PLR-${formatISTCompactDateKey(now)}-${Math.floor(100 + Math.random() * 900)}`,
    submittedOn: formatISTDateTime(now),
    status: 'Pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const updated = [record, ...all];
  localStorage.setItem(PARENT_LEAVE_STORAGE_KEY, JSON.stringify(updated));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offsleek_parent_leave_updated', { detail: record }));
  }

  return record;
}

// Get Staff Requests
export function getStaffRequests(): StaffRequest[] {
  try {
    const raw = localStorage.getItem(STAFF_REQUESTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STAFF_REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_STAFF_REQUESTS));
      return INITIAL_STAFF_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_STAFF_REQUESTS;
  } catch (err) {
    console.error('Failed to get staff requests:', err);
    return INITIAL_STAFF_REQUESTS;
  }
}

// Submit a new Staff Leave / Workplace Request
export function submitStaffRequest(data: {
  staffId: string;
  staffName: string;
  type: 'Leave' | 'Salary Slip' | 'Document' | 'Other';
  title: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  duration?: string;
  reason: string;
  attachmentName?: string;
  attachmentSize?: string;
}): StaffRequest {
  const all = getStaffRequests();
  const now = getNow();
  const nowIso = now.toISOString();
  const dateStr = formatISTDateMedium(now);
  const submittedOn = formatISTDateTime(now);
  const stage1Timestamp = formatISTShortDateTime(now);

  // Generate request ID in format SL-YYYYMMDD-001 using current IST date
  const count = all.filter((r) => r.type === data.type).length + 1;
  const countStr = count < 10 ? `00${count}` : count < 100 ? `0${count}` : `${count}`;
  const generatedId = `SL-${formatISTCompactDateKey(now)}-${countStr}`;

  const resolvedDuration =
    data.duration && data.duration !== 'Submitted Today' ? data.duration : dateStr;
  const details = resolvedDuration;

  const record: StaffRequest = {
    id: generatedId,
    staffId: data.staffId,
    staffName: data.staffName,
    type: data.type,
    title: data.title,
    subtitle: data.reason || data.title,
    dates: data.duration && data.duration !== 'Submitted Today' ? data.duration : `${dateStr} - ${dateStr}`,
    details: details,
    status: 'Pending Approval',
    submittedOn,
    stage1Timestamp,
    stage2Label: 'Under Review',
    stage2Sublabel: '(Administration)',
    stage3Label: data.type === 'Leave' ? 'Approved' : 'Completed',
    leaveType: data.leaveType,
    fromDate: data.fromDate,
    toDate: data.toDate,
    duration: resolvedDuration,
    reason: data.reason,
    attachmentName: data.attachmentName,
    attachmentSize: data.attachmentSize,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const updated = [record, ...all];
  localStorage.setItem(STAFF_REQUESTS_STORAGE_KEY, JSON.stringify(updated));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offsleek_staff_request_submitted', { detail: record }));
  }

  return record;
}

// Update an existing Staff Request while preserving its creation timestamp
export function updateStaffRequest(
  requestId: string,
  updates: Partial<Omit<StaffRequest, 'id' | 'submittedOn' | 'createdAt'>>
): StaffRequest {
  const all = getStaffRequests();
  const index = all.findIndex((r) => r.id === requestId);
  if (index === -1) {
    throw new Error(`Staff request with ID ${requestId} not found.`);
  }
  const now = getNow();
  const nowIso = now.toISOString();
  const existing = all[index];
  const updated: StaffRequest = {
    ...existing,
    ...updates,
    id: existing.id,
    submittedOn: existing.submittedOn,
    createdAt: existing.createdAt,
    updatedAt: nowIso,
  };
  all[index] = updated;
  localStorage.setItem(STAFF_REQUESTS_STORAGE_KEY, JSON.stringify(all));
  return updated;
}
