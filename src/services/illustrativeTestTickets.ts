/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ISOLATED DEVELOPMENT / VERIFICATION TEST-DATA PROVIDER
 * Contains the 10 illustrative tickets (TEST-SCH-001..005 and TEST-OFF-001..005)
 * for verifying the My Requests UI and interaction workflow in Student and Parent modes.
 * Never writes to production Firestore collections or triggers external notifications.
 */

import {
  SupportAttachment,
  SupportConversationMessage,
  SupportHistoryEntry,
  SupportTicket,
  SupportTicketStatus,
} from './requestsService';
import { formatISTDateMedium, formatISTDateTime, formatISTTime12h, getNow } from '../utils/dateTimeUtils';

export type IllustrativePortalMode = 'STUDENT' | 'PARENT';

export interface TestStudentIdentity {
  mode: 'STUDENT';
  studentId: string;
  studentName: string;
  classSection: string;
  rollNo: string;
  schoolId: string;
  schoolName: string;
}

export interface TestParentIdentity {
  mode: 'PARENT';
  parentId: string;
  parentName: string;
  relation: string;
  linkedChildId: string;
  linkedChildName: string;
  linkedChildClass: string;
  linkedChildRollNo: string;
  schoolId: string;
  schoolName: string;
}

export const AUTHENTICATED_TEST_STUDENT: TestStudentIdentity = {
  mode: 'STUDENT',
  studentId: 'STU-2026-003',
  studentName: 'Arjun Mehta',
  classSection: 'Grade 5 - A',
  rollNo: '03',
  schoolId: 'greenwood-intl',
  schoolName: 'Greenwood International School',
};

export const AUTHENTICATED_TEST_PARENT: TestParentIdentity = {
  mode: 'PARENT',
  parentId: 'PAR-2026-003',
  parentName: 'Mr. Rajesh Mehta',
  relation: 'Father',
  linkedChildId: 'STU-2026-003',
  linkedChildName: 'Arjun Mehta',
  linkedChildClass: 'Grade 5 - A',
  linkedChildRollNo: '03',
  schoolId: 'greenwood-intl',
  schoolName: 'Greenwood International School',
};

export interface IllustrativeSupportTicket extends SupportTicket {
  isTestData: true;
  testDataLabel: 'TEST DATA';
  portalMode: IllustrativePortalMode;
  studentId: string;
  studentName: string;
  parentId?: string;
  parentName?: string;
  linkedChildId?: string;
  linkedChildName?: string;
}

const TEST_FIXTURES_STUDENT_KEY = 'offsleek_test_fixtures_student_v1';
const TEST_FIXTURES_PARENT_KEY = 'offsleek_test_fixtures_parent_v1';
const TEST_FIXTURES_ENABLED_KEY = 'offsleek_test_fixtures_enabled_v1';

// Safe inline SVG Data URL for illustrative image attachment preview/download
const SAMPLE_IMAGE_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
      <rect width="600" height="360" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <text x="40" y="64" font-family="sans-serif" font-size="20" font-weight="bold" fill="#0f172a">OFFSLEEK TEST ATTACHMENT PREVIEW</text>
      <text x="40" y="100" font-family="sans-serif" font-size="14" fill="#475569">Illustrative Test Data — Greenwood International School</text>
      <rect x="40" y="130" width="520" height="180" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="64" y="175" font-family="monospace" font-size="14" fill="#1e293b">Grade 5 - A | Weekly Timetable / Support Attachment</text>
      <text x="64" y="210" font-family="monospace" font-size="13" fill="#64748b">Status: Verified Illustrative Test Record (isTestData = true)</text>
    </svg>`
  );

function makeTestAttachment(
  ticketId: string,
  fileName: string,
  fileType: 'PDF' | 'JPG' | 'JPEG' | 'PNG',
  sizeFormatted: string,
  sizeBytes: number,
  uploadedAt: string,
  ownerId: string,
  schoolId: string
): SupportAttachment {
  return {
    id: `ATT-${ticketId}`,
    fileName,
    fileType,
    mimeType: fileType === 'PDF' ? 'application/pdf' : `image/${fileType.toLowerCase()}`,
    fileSizeBytes: sizeBytes,
    fileSizeFormatted: sizeFormatted,
    dataUrl: SAMPLE_IMAGE_DATA_URL,
    storagePath: `test-fixtures/${schoolId}/${ownerId}/${ticketId}/${fileName}`,
    uploadedAt,
    uploadedByStaffId: ownerId,
    schoolId,
  };
}

/**
 * Builds internally consistent vertical Request History strictly matching the ticket's current status.
 * Never shows a future event as completed.
 */
function buildConsistentHistory(
  ticketId: string,
  status: SupportTicketStatus,
  destination: 'SCHOOL' | 'OFFSLEEK',
  submittedAt: string,
  submittedIso: string,
  requesterName: string,
  reviewAt?: string,
  inProgressAt?: string,
  resolvedAt?: string,
  closedAt?: string
): SupportHistoryEntry[] {
  const handlerName = destination === 'SCHOOL' ? 'School Administration' : 'OFFSLEEK Support';
  const entries: SupportHistoryEntry[] = [
    {
      id: `HIST-${ticketId}-1`,
      status: 'Submitted',
      title: 'Submitted',
      timestamp: submittedAt,
      createdAtIso: submittedIso,
      description: 'Your request has been submitted successfully.',
      actorName: requesterName,
    },
  ];

  // Open: submitted, awaiting review (only Submitted event shown as completed)
  if (status === 'Open') {
    return entries;
  }

  // Pending: submitted, waiting for action or clarification
  if (status === 'Pending') {
    entries.push({
      id: `HIST-${ticketId}-2`,
      status: 'Under Review',
      title: 'Under Review',
      timestamp: reviewAt || submittedAt,
      createdAtIso: submittedIso,
      description: 'Your request is being reviewed by the support team.',
      actorName: handlerName,
    });
    return entries;
  }

  // In Progress: Submitted -> Under Review -> In Progress
  entries.push({
    id: `HIST-${ticketId}-2`,
    status: 'Under Review',
    title: 'Under Review',
    timestamp: reviewAt || submittedAt,
    createdAtIso: submittedIso,
    description: 'Your request is being reviewed by the support team.',
    actorName: handlerName,
  });

  entries.push({
    id: `HIST-${ticketId}-3`,
    status: 'In Progress',
    title: 'In Progress',
    timestamp: inProgressAt || reviewAt || submittedAt,
    createdAtIso: submittedIso,
    description: 'Our team is working on your request.',
    actorName: handlerName,
  });

  if (status === 'In Progress') {
    return entries;
  }

  // Resolved: Submitted -> Under Review -> In Progress -> Resolved
  entries.push({
    id: `HIST-${ticketId}-4`,
    status: 'Resolved',
    title: 'Resolved',
    timestamp: resolvedAt || inProgressAt || submittedAt,
    createdAtIso: submittedIso,
    description: 'Your request has been resolved.',
    actorName: handlerName,
  });

  if (status === 'Resolved') {
    return entries;
  }

  // Closed: Submitted -> Under Review -> In Progress -> Resolved -> Closed
  entries.push({
    id: `HIST-${ticketId}-5`,
    status: 'Closed',
    title: 'Closed',
    timestamp: closedAt || resolvedAt || submittedAt,
    createdAtIso: submittedIso,
    description: 'Your request has been completed and closed.',
    actorName: handlerName,
  });

  return entries;
}

function buildSeedTicketsForMode(mode: IllustrativePortalMode): IllustrativeSupportTicket[] {
  const isParent = mode === 'PARENT';
  const requesterId = isParent ? AUTHENTICATED_TEST_PARENT.parentId : AUTHENTICATED_TEST_STUDENT.studentId;
  const requesterName = isParent
    ? `${AUTHENTICATED_TEST_PARENT.parentName} (Parent of ${AUTHENTICATED_TEST_PARENT.linkedChildName})`
    : AUTHENTICATED_TEST_STUDENT.studentName;
  const schoolId = AUTHENTICATED_TEST_STUDENT.schoolId;
  const schoolName = AUTHENTICATED_TEST_STUDENT.schoolName;
  const studentId = AUTHENTICATED_TEST_STUDENT.studentId;
  const studentName = AUTHENTICATED_TEST_STUDENT.studentName;

  const baseSpecs: Array<{
    id: string;
    destination: 'SCHOOL' | 'OFFSLEEK';
    subject: string;
    category: string;
    status: SupportTicketStatus;
    createdAt: string;
    createdAtIso: string;
    dateLabel: string;
    timeLabel: string;
    reviewAt?: string;
    inProgressAt?: string;
    resolvedAt?: string;
    closedAt?: string;
    description: string;
    attachment: { name: string; type: 'PDF' | 'JPG' | 'JPEG' | 'PNG'; size: string; bytes: number };
    supportReplyText: string;
    supportReplyTime: string;
  }> = [
    // =========================================================================
    // A. SCHOOL SUPPORT — 5 TICKETS (TEST-SCH-001 to TEST-SCH-005)
    // =========================================================================
    {
      id: 'TEST-SCH-001',
      destination: 'SCHOOL',
      subject: 'Timetable Change Request',
      category: 'Timetable',
      status: 'Open',
      createdAt: '22 Jan 2026, 10:24 AM',
      createdAtIso: '2026-01-22T04:54:00.000Z',
      dateLabel: '22 Jan 2026',
      timeLabel: '10:24 AM',
      description: isParent
        ? 'Please review the Grade 5 - A timetable for Arjun Mehta next week. There is a clash between Mathematics lab and Science activity period.'
        : 'Please update my class timetable for next week. There is a clash with another subject.',
      attachment: { name: 'timetable_request.png', type: 'PNG', size: '1.2 MB', bytes: 1258291 },
      supportReplyText:
        'Thank you for submitting #TEST-SCH-001. Your timetable query has been logged and is awaiting review by the Academic Coordinator.',
      supportReplyTime: '10:35 AM',
    },
    {
      id: 'TEST-SCH-002',
      destination: 'SCHOOL',
      subject: 'Bonafide Certificate',
      category: 'Certificates & Documents',
      status: 'Pending',
      createdAt: '22 Jan 2026, 11:05 AM',
      createdAtIso: '2026-01-22T05:35:00.000Z',
      dateLabel: '22 Jan 2026',
      timeLabel: '11:05 AM',
      reviewAt: '22 Jan 2026, 12:15 PM',
      description: isParent
        ? 'Requesting an official Bonafide Certificate for my son Arjun Mehta (Grade 5 - A, Roll No. 03) for passport renewal verification.'
        : 'Requesting an official Bonafide Certificate for passport renewal and address verification.',
      attachment: { name: 'passport_verification_form.pdf', type: 'PDF', size: '640 KB', bytes: 655360 },
      supportReplyText:
        'Your request (#TEST-SCH-002) is under review. Please confirm in reply if you need a physical seal copy from the school office in addition to the digital certificate.',
      supportReplyTime: '12:15 PM',
    },
    {
      id: 'TEST-SCH-003',
      destination: 'SCHOOL',
      subject: 'Leave Application',
      category: 'Attendance & Leave',
      status: 'Resolved',
      createdAt: '21 Jan 2026, 04:20 PM',
      createdAtIso: '2026-01-21T10:50:00.000Z',
      dateLabel: '21 Jan 2026',
      timeLabel: '04:20 PM',
      reviewAt: '21 Jan 2026, 04:55 PM',
      inProgressAt: '21 Jan 2026, 05:30 PM',
      resolvedAt: '22 Jan 2026, 09:15 AM',
      description: isParent
        ? 'Submitting a 2-day medical leave application for Arjun Mehta due to viral fever and doctor-advised rest at home.'
        : 'Applying for 2 days medical leave due to viral fever and doctor-advised rest at home.',
      attachment: { name: 'medical_certificate_jan21.pdf', type: 'PDF', size: '480 KB', bytes: 491520 },
      supportReplyText:
        'Your leave application (#TEST-SCH-003) has been approved by Class Teacher Ms. Priya Sharma and updated in the attendance register.',
      supportReplyTime: '09:15 AM',
    },
    {
      id: 'TEST-SCH-004',
      destination: 'SCHOOL',
      subject: 'Exam Result Query',
      category: 'Examination & Results',
      status: 'In Progress',
      createdAt: '21 Jan 2026, 02:10 PM',
      createdAtIso: '2026-01-21T08:40:00.000Z',
      dateLabel: '21 Jan 2026',
      timeLabel: '02:10 PM',
      reviewAt: '21 Jan 2026, 03:00 PM',
      inProgressAt: '22 Jan 2026, 10:10 AM',
      description: isParent
        ? 'Requesting a re-totaling check for Section B of Arjun Mehta’s Unit Test 2 Mathematics answer sheet.'
        : 'Please verify the marks total in Section B of my Unit Test 2 Mathematics score sheet.',
      attachment: { name: 'math_unit_test_sheet.jpg', type: 'JPG', size: '920 KB', bytes: 942080 },
      supportReplyText:
        'Our Examination Cell is currently reviewing Question 7 and Question 9 on the answer script (#TEST-SCH-004) with the Mathematics department.',
      supportReplyTime: '10:10 AM',
    },
    {
      id: 'TEST-SCH-005',
      destination: 'SCHOOL',
      subject: 'Study Material Request',
      category: 'Academic Resources',
      status: 'Closed',
      createdAt: '20 Jan 2026, 09:30 AM',
      createdAtIso: '2026-01-20T04:00:00.000Z',
      dateLabel: '20 Jan 2026',
      timeLabel: '09:30 AM',
      reviewAt: '20 Jan 2026, 10:15 AM',
      inProgressAt: '20 Jan 2026, 11:45 AM',
      resolvedAt: '20 Jan 2026, 02:30 PM',
      closedAt: '20 Jan 2026, 04:00 PM',
      description: isParent
        ? 'Requesting the Term 2 Science revision workbook and practical activity sheet for Grade 5 - A.'
        : 'Requesting the PDF revision workbook and lab manual for Term 2 Science chapters.',
      attachment: { name: 'term2_science_workbook.pdf', type: 'PDF', size: '1.1 MB', bytes: 1153433 },
      supportReplyText:
        'The Term 2 Science study materials have been shared in the digital classroom folder and this request (#TEST-SCH-005) is now closed.',
      supportReplyTime: '04:00 PM',
    },

    // =========================================================================
    // B. OFFSLEEK SUPPORT — 5 TICKETS (TEST-OFF-001 to TEST-OFF-005)
    // =========================================================================
    {
      id: 'TEST-OFF-001',
      destination: 'OFFSLEEK',
      subject: 'App Login Issue',
      category: 'Login and account',
      status: 'In Progress',
      createdAt: '22 Jan 2026, 01:15 PM',
      createdAtIso: '2026-01-22T07:45:00.000Z',
      dateLabel: '22 Jan 2026',
      timeLabel: '01:15 PM',
      reviewAt: '22 Jan 2026, 01:45 PM',
      inProgressAt: '22 Jan 2026, 02:30 PM',
      description: isParent
        ? 'Parent portal session intermittently prompts for re-authentication when switching from Wi-Fi to mobile data.'
        : 'I am experiencing intermittent login session timeouts when opening the app on mobile data.',
      attachment: { name: 'login_error_screen.png', type: 'PNG', size: '850 KB', bytes: 870400 },
      supportReplyText:
        'Our engineering team is actively investigating the session token handoff (#TEST-OFF-001) and will share an update shortly.',
      supportReplyTime: '02:30 PM',
    },
    {
      id: 'TEST-OFF-002',
      destination: 'OFFSLEEK',
      subject: 'Unable to Reset Password',
      category: 'Login and account',
      status: 'Open',
      createdAt: '22 Jan 2026, 11:40 AM',
      createdAtIso: '2026-01-22T06:10:00.000Z',
      dateLabel: '22 Jan 2026',
      timeLabel: '11:40 AM',
      description: isParent
        ? 'The password reset OTP email for my parent account arrived after the 10-minute expiration window.'
        : 'Unable to complete password reset because the verification link expired before delivery.',
      attachment: { name: 'password_reset_prompt.png', type: 'PNG', size: '610 KB', bytes: 624640 },
      supportReplyText:
        'Your request (#TEST-OFF-002) has been logged with OFFSLEEK Support and is queued for account verification.',
      supportReplyTime: '11:48 AM',
    },
    {
      id: 'TEST-OFF-003',
      destination: 'OFFSLEEK',
      subject: 'App Not Syncing',
      category: 'Application issues',
      status: 'Pending',
      createdAt: '21 Jan 2026, 03:25 PM',
      createdAtIso: '2026-01-21T09:55:00.000Z',
      dateLabel: '21 Jan 2026',
      timeLabel: '03:25 PM',
      reviewAt: '21 Jan 2026, 04:10 PM',
      description: isParent
        ? 'Updated homework diary entries for Arjun Mehta are taking longer to sync on our secondary tablet device.'
        : 'Homework calendar updates from this afternoon are not syncing automatically on my tablet.',
      attachment: { name: 'sync_status_capture.jpg', type: 'JPG', size: '780 KB', bytes: 798720 },
      supportReplyText:
        'Your request (#TEST-OFF-003) is under review. Please reply with your tablet OS version and app version so we can inspect the sync cache.',
      supportReplyTime: '04:10 PM',
    },
    {
      id: 'TEST-OFF-004',
      destination: 'OFFSLEEK',
      subject: 'Notification Not Working',
      category: 'Notifications',
      status: 'Closed',
      createdAt: '21 Jan 2026, 11:10 AM',
      createdAtIso: '2026-01-21T05:40:00.000Z',
      dateLabel: '21 Jan 2026',
      timeLabel: '11:10 AM',
      reviewAt: '21 Jan 2026, 11:35 AM',
      inProgressAt: '21 Jan 2026, 12:20 PM',
      resolvedAt: '21 Jan 2026, 02:05 PM',
      closedAt: '21 Jan 2026, 03:00 PM',
      description: isParent
        ? 'Push alerts for circular announcements were not appearing on lock screen after the recent OS update.'
        : 'Push notifications for new school announcements stopped appearing after my phone update.',
      attachment: { name: 'notification_settings.png', type: 'PNG', size: '520 KB', bytes: 532480 },
      supportReplyText:
        'Push notification token registration has been refreshed and verified working. Ticket #TEST-OFF-004 is now closed.',
      supportReplyTime: '03:00 PM',
    },
    {
      id: 'TEST-OFF-005',
      destination: 'OFFSLEEK',
      subject: 'Cannot Access Results',
      category: 'Technical support',
      status: 'Resolved',
      createdAt: '20 Jan 2026, 05:45 PM',
      createdAtIso: '2026-01-20T12:15:00.000Z',
      dateLabel: '20 Jan 2026',
      timeLabel: '05:45 PM',
      reviewAt: '20 Jan 2026, 06:15 PM',
      inProgressAt: '20 Jan 2026, 07:00 PM',
      resolvedAt: '21 Jan 2026, 09:40 AM',
      description: isParent
        ? 'Unable to open the Term 1 consolidated report card PDF for Arjun Mehta inside the mobile web viewer.'
        : 'Cannot open the Term 1 report card PDF inside the results tab on mobile.',
      attachment: { name: 'results_viewer_log.pdf', type: 'PDF', size: '410 KB', bytes: 419840 },
      supportReplyText:
        'We have resolved the inline PDF viewer issue (#TEST-OFF-005). You can now view and download the Term 1 report card directly.',
      supportReplyTime: '09:40 AM',
    },
  ];

  const tickets: IllustrativeSupportTicket[] = baseSpecs.map((spec) => {
    const isSchool = spec.destination === 'SCHOOL';
    const att = makeTestAttachment(
      spec.id,
      spec.attachment.name,
      spec.attachment.type,
      spec.attachment.size,
      spec.attachment.bytes,
      spec.createdAt,
      requesterId,
      schoolId
    );

    const history = buildConsistentHistory(
      spec.id,
      spec.status,
      spec.destination,
      spec.createdAt,
      spec.createdAtIso,
      requesterName,
      spec.reviewAt,
      spec.inProgressAt,
      spec.resolvedAt,
      spec.closedAt
    );

    const messages: SupportConversationMessage[] = [
      {
        id: `MSG-${spec.id}-1`,
        ticketId: spec.id,
        senderType: 'STAFF',
        senderName: requesterName,
        senderId: requesterId,
        message: spec.description,
        timestamp: spec.timeLabel,
        dateLabel: spec.dateLabel,
        createdAtIso: spec.createdAtIso,
        attachments: [att],
        isRead: true,
      },
      {
        id: `MSG-${spec.id}-2`,
        ticketId: spec.id,
        senderType: isSchool ? 'SCHOOL_ADMIN' : 'OFFSLEEK_SUPPORT',
        senderName: isSchool ? 'School Administration' : 'OFFSLEEK Support',
        senderId: isSchool ? 'SCHOOL_ADMIN' : 'OFFSLEEK_SUPPORT_DESK',
        message: spec.supportReplyText,
        timestamp: spec.supportReplyTime,
        dateLabel: spec.dateLabel,
        createdAtIso: spec.createdAtIso,
        attachments: [],
        isRead: true,
      },
    ];

    return {
      id: spec.id,
      displayId: `#${spec.id}`,
      destination: spec.destination,
      destinationLabel: isSchool ? 'School Support' : 'OFFSLEEK Support',
      routeCode: isSchool ? 'SCHOOL_ACADEMIC_ADMIN' : 'OFFSLEEK_SUPPORT_DESK',
      routedDepartment: isSchool
        ? 'Greenwood School Administration'
        : 'OFFSLEEK Technical & Product Support Team',
      handlerDisplayName: isSchool ? 'School Administration' : 'OFFSLEEK Support',
      category: spec.category,
      effectiveCategory: spec.category,
      subject: spec.subject,
      description: spec.description,
      status: spec.status,
      createdAt: spec.createdAt,
      createdAtIso: spec.createdAtIso,
      updatedAt: spec.closedAt || spec.resolvedAt || spec.inProgressAt || spec.reviewAt || spec.createdAt,
      updatedAtIso: spec.createdAtIso,
      staffId: requesterId,
      employeeId: requesterId,
      staffName: requesterName,
      staffRole: mode,
      designation: isParent
        ? `Parent of ${AUTHENTICATED_TEST_PARENT.linkedChildName}`
        : `Student • ${AUTHENTICATED_TEST_STUDENT.classSection}`,
      department: AUTHENTICATED_TEST_STUDENT.classSection,
      assignedClass: AUTHENTICATED_TEST_STUDENT.classSection,
      reportingManager: 'Ms. Priya Sharma (Class Teacher)',
      schoolId,
      schoolName,
      attachments: [att],
      history,
      messages,
      isTestData: true,
      testDataLabel: 'TEST DATA',
      portalMode: mode,
      studentId,
      studentName,
      parentId: isParent ? AUTHENTICATED_TEST_PARENT.parentId : undefined,
      parentName: isParent ? AUTHENTICATED_TEST_PARENT.parentName : undefined,
      linkedChildId: isParent ? AUTHENTICATED_TEST_PARENT.linkedChildId : undefined,
      linkedChildName: isParent ? AUTHENTICATED_TEST_PARENT.linkedChildName : undefined,
    };
  });

  // Also add an isolated non-matching record to the raw pool so access control filtering
  // is genuinely exercised (ensuring other students' or other children's tickets never leak).
  const nonMatchingTicket: IllustrativeSupportTicket = {
    ...tickets[0],
    id: isParent ? 'TEST-OTHER-CHILD-999' : 'TEST-OTHER-STUDENT-999',
    displayId: isParent ? '#TEST-OTHER-CHILD-999' : '#TEST-OTHER-STUDENT-999',
    subject: 'Other Student Private Record (Should Be Filtered Out)',
    studentId: 'STU-OTHER-999',
    studentName: 'Riya Kapoor',
    parentId: isParent ? AUTHENTICATED_TEST_PARENT.parentId : 'PAR-OTHER-999',
    linkedChildId: 'STU-OTHER-999',
    linkedChildName: 'Riya Kapoor',
  };

  return [...tickets, nonMatchingTicket];
}

let memoryFixturesEnabled = true;
let memoryStudentPool: IllustrativeSupportTicket[] | null = null;
let memoryParentPool: IllustrativeSupportTicket[] | null = null;

export function areIllustrativeTestFixturesEnabled(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const flag = window.localStorage.getItem(TEST_FIXTURES_ENABLED_KEY);
      if (flag !== null) {
        return flag !== 'false';
      }
    }
  } catch {
    // fallback to memory flag
  }
  return memoryFixturesEnabled;
}

export function setIllustrativeTestFixturesEnabled(enabled: boolean): void {
  memoryFixturesEnabled = enabled;
  if (!enabled) {
    memoryStudentPool = [];
    memoryParentPool = [];
  } else {
    memoryStudentPool = null;
    memoryParentPool = null;
  }
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(TEST_FIXTURES_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      window.localStorage.removeItem(TEST_FIXTURES_STUDENT_KEY);
      window.localStorage.removeItem(TEST_FIXTURES_PARENT_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function loadRawModePool(mode: IllustrativePortalMode): IllustrativeSupportTicket[] {
  if (!areIllustrativeTestFixturesEnabled()) return [];
  const storageKey = mode === 'PARENT' ? TEST_FIXTURES_PARENT_KEY : TEST_FIXTURES_STUDENT_KEY;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = window.localStorage.getItem(storageKey);
      if (existing) {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      const seeded = buildSeedTicketsForMode(mode);
      window.localStorage.setItem(storageKey, JSON.stringify(seeded));
      return seeded;
    }
  } catch {
    // fallback to in-memory seed
  }
  if (mode === 'PARENT') {
    if (!memoryParentPool || memoryParentPool.length === 0) {
      memoryParentPool = buildSeedTicketsForMode('PARENT');
    }
    return memoryParentPool;
  } else {
    if (!memoryStudentPool || memoryStudentPool.length === 0) {
      memoryStudentPool = buildSeedTicketsForMode('STUDENT');
    }
    return memoryStudentPool;
  }
}

function saveRawModePool(mode: IllustrativePortalMode, pool: IllustrativeSupportTicket[]): void {
  if (mode === 'PARENT') {
    memoryParentPool = [...pool];
  } else {
    memoryStudentPool = [...pool];
  }
  const storageKey = mode === 'PARENT' ? TEST_FIXTURES_PARENT_KEY : TEST_FIXTURES_STUDENT_KEY;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, JSON.stringify(pool));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Verifies strict Student or Parent ownership and linked-child isolation on test tickets.
 */
export function verifyIllustrativeTicketAccess(
  ticket: IllustrativeSupportTicket,
  mode: IllustrativePortalMode,
  studentContext: TestStudentIdentity = AUTHENTICATED_TEST_STUDENT,
  parentContext: TestParentIdentity = AUTHENTICATED_TEST_PARENT
): boolean {
  if (!ticket || !ticket.isTestData) return false;
  if (ticket.portalMode !== mode) return false;

  if (mode === 'STUDENT') {
    return (
      ticket.schoolId === studentContext.schoolId &&
      ticket.studentId === studentContext.studentId
    );
  }

  // PARENT mode: must match parentId, schoolId, AND the active linkedChildId
  return (
    ticket.schoolId === parentContext.schoolId &&
    ticket.parentId === parentContext.parentId &&
    ticket.linkedChildId === parentContext.linkedChildId
  );
}

export function getIllustrativeTestTickets(
  mode: IllustrativePortalMode,
  studentContext: TestStudentIdentity = AUTHENTICATED_TEST_STUDENT,
  parentContext: TestParentIdentity = AUTHENTICATED_TEST_PARENT
): IllustrativeSupportTicket[] {
  const rawPool = loadRawModePool(mode);
  return rawPool.filter((t) =>
    verifyIllustrativeTicketAccess(t, mode, studentContext, parentContext)
  );
}

export function getIllustrativeTestTicketById(
  ticketId: string,
  mode: IllustrativePortalMode,
  studentContext: TestStudentIdentity = AUTHENTICATED_TEST_STUDENT,
  parentContext: TestParentIdentity = AUTHENTICATED_TEST_PARENT
): IllustrativeSupportTicket | null {
  const cleanId = ticketId.replace(/^#/, '').trim();
  const rawPool = loadRawModePool(mode);
  const found = rawPool.find((t) => t.id === cleanId || t.displayId === ticketId);
  if (!found) return null;
  if (!verifyIllustrativeTicketAccess(found, mode, studentContext, parentContext)) {
    throw new Error('Unauthorized access: Ticket belongs to another student or child context.');
  }
  return found;
}

export function addIllustrativeTestTicketReply(
  mode: IllustrativePortalMode,
  input: {
    ticketId: string;
    message: string;
    attachments?: SupportAttachment[];
  },
  studentContext: TestStudentIdentity = AUTHENTICATED_TEST_STUDENT,
  parentContext: TestParentIdentity = AUTHENTICATED_TEST_PARENT
): IllustrativeSupportTicket {
  const cleanId = input.ticketId.replace(/^#/, '').trim();
  const rawPool = loadRawModePool(mode);
  const idx = rawPool.findIndex((t) => t.id === cleanId || t.displayId === input.ticketId);
  if (idx === -1) {
    throw new Error(`Test ticket ${input.ticketId} not found.`);
  }

  const target = rawPool[idx];
  if (!verifyIllustrativeTicketAccess(target, mode, studentContext, parentContext)) {
    throw new Error('Unauthorized access to reply to this test ticket.');
  }

  if (target.status === 'Closed' || target.status === 'Resolved') {
    throw new Error('This request is already resolved/closed and cannot receive new replies.');
  }

  const cleanText = (input.message || '').trim();
  const attachments = input.attachments || [];
  if (!cleanText && attachments.length === 0) {
    throw new Error('Please enter a reply message or attach a file.');
  }

  const now = getNow();
  const senderName =
    mode === 'PARENT'
      ? `${parentContext.parentName} (Parent of ${parentContext.linkedChildName})`
      : studentContext.studentName;
  const senderId = mode === 'PARENT' ? parentContext.parentId : studentContext.studentId;

  const newMsg: SupportConversationMessage = {
    id: `MSG-${target.id}-${target.messages.length + 1}-${Date.now()}`,
    ticketId: target.id,
    senderType: 'STAFF',
    senderName,
    senderId,
    message: cleanText || `Attached ${attachments.length} file(s)`,
    timestamp: formatISTTime12h(now),
    dateLabel: formatISTDateMedium(now),
    createdAtIso: now.toISOString(),
    attachments,
    isRead: true,
  };

  const updated: IllustrativeSupportTicket = {
    ...target,
    updatedAt: formatISTDateTime(now),
    updatedAtIso: now.toISOString(),
    attachments:
      attachments.length > 0 ? [...target.attachments, ...attachments] : target.attachments,
    messages: [...target.messages, newMsg],
  };

  rawPool[idx] = updated;
  saveRawModePool(mode, rawPool);
  return updated;
}

export function resetIllustrativeTestFixtures(): void {
  setIllustrativeTestFixturesEnabled(true);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        TEST_FIXTURES_STUDENT_KEY,
        JSON.stringify(buildSeedTicketsForMode('STUDENT'))
      );
      window.localStorage.setItem(
        TEST_FIXTURES_PARENT_KEY,
        JSON.stringify(buildSeedTicketsForMode('PARENT'))
      );
    }
  } catch {
    // ignore
  }
}
