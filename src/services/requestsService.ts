/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
   limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadString } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import {
  addDaysIST,
  formatISTDateKey,
  formatISTDateMedium,
  formatISTDateTime,
  formatISTMonthYear,
  formatISTTime12h,
  getNow,
} from '../utils/dateTimeUtils';

// ============================================================================
// 1. AUTHENTICATED STAFF IDENTITY & SCHOOL CONTEXT
// ============================================================================

export type StaffRoleType =
  | 'STAFF'
  | 'SCHOOL_ADMIN'
  | 'HR_ADMIN'
  | 'PRINCIPAL'
  | 'OFFSLEEK_SUPPORT';

export interface StaffIdentityContext {
  staffId: string;
  employeeId: string;
  staffName: string;
  email: string;
  phone: string;
  role: StaffRoleType;
  designation: string;
  department: string;
  assignedClass: string;
  reportingManager: string;
  schoolId: string;
  schoolName: string;
}

export const AUTHENTICATED_STAFF_CONTEXT: StaffIdentityContext = {
  staffId: 'T001',
  employeeId: 'T001',
  staffName: 'Ms. Priya Sharma',
  email: 'priya.sharma@greenwood.edu.in',
  phone: '+91 98765 43210',
  role: 'STAFF',
  designation: 'Class Teacher',
  department: 'Primary School',
  assignedClass: 'Grade 5 - A',
  reportingManager: 'Dr. R. K. Verma (Principal)',
  schoolId: 'greenwood-intl',
  schoolName: 'Greenwood International School',
};

export function getAuthenticatedStaffContext(): StaffIdentityContext {
  return { ...AUTHENTICATED_STAFF_CONTEXT };
}

// ============================================================================
// 2. SUPPORT CATEGORIES (STAFF PORTAL ONLY — NO PARENT/STUDENT CATEGORIES)
// ============================================================================

export type SupportDestination = 'SCHOOL' | 'OFFSLEEK';

export const SCHOOL_SUPPORT_CATEGORIES: readonly string[] = [
  'Leave-related queries',
  'Salary and payroll',
  'Salary slips',
  'Experience letters',
  'Employment documents',
  'Attendance corrections',
  'Timetable and class allocation',
  'Department-related queries',
  'HR-related queries',
  'Other',
] as const;

export const OFFSLEEK_SUPPORT_CATEGORIES: readonly string[] = [
  'Login and account',
  'Application issues',
  'Technical support',
  'Profile and information',
  'Notifications',
  'Feature-related queries',
  'Other',
] as const;

export function getCategoriesForDestination(destination: SupportDestination): readonly string[] {
  return destination === 'SCHOOL' ? SCHOOL_SUPPORT_CATEGORIES : OFFSLEEK_SUPPORT_CATEGORIES;
}

// ============================================================================
// 3. DETERMINISTIC SUPPORT ROUTING
// ============================================================================

export interface SupportRoutingTarget {
  destination: SupportDestination;
  destinationLabel: 'School Support' | 'OFFSLEEK Support';
  routeCode:
    | 'SCHOOL_HR_ADMIN'
    | 'SCHOOL_FINANCE_PAYROLL'
    | 'SCHOOL_ACADEMIC_ADMIN'
    | 'SCHOOL_GENERAL_ADMIN'
    | 'OFFSLEEK_SUPPORT_DESK';
  routedDepartment: string;
  handlerDisplayName: 'School Administration' | 'OFFSLEEK Support';
  firestoreCollection: string;
}

export function resolveSupportRouting(
  destination: SupportDestination,
  category: string,
  schoolId: string = AUTHENTICATED_STAFF_CONTEXT.schoolId
): SupportRoutingTarget {
  if (destination === 'OFFSLEEK') {
    return {
      destination: 'OFFSLEEK',
      destinationLabel: 'OFFSLEEK Support',
      routeCode: 'OFFSLEEK_SUPPORT_DESK',
      routedDepartment: 'OFFSLEEK Technical & Product Support Team',
      handlerDisplayName: 'OFFSLEEK Support',
      firestoreCollection: `offsleekSupportTickets`,
    };
  }

  const normalized = category.trim().toLowerCase();
  if (
    normalized.includes('leave') ||
    normalized.includes('experience') ||
    normalized.includes('employment') ||
    normalized.includes('hr')
  ) {
    return {
      destination: 'SCHOOL',
      destinationLabel: 'School Support',
      routeCode: 'SCHOOL_HR_ADMIN',
      routedDepartment: 'School HR & Administration',
      handlerDisplayName: 'School Administration',
      firestoreCollection: `schools/${schoolId}/staffSupportTickets`,
    };
  }

  if (normalized.includes('salary') || normalized.includes('payroll')) {
    return {
      destination: 'SCHOOL',
      destinationLabel: 'School Support',
      routeCode: 'SCHOOL_FINANCE_PAYROLL',
      routedDepartment: 'School Finance & Payroll Office',
      handlerDisplayName: 'School Administration',
      firestoreCollection: `schools/${schoolId}/staffSupportTickets`,
    };
  }

  if (
    normalized.includes('attendance') ||
    normalized.includes('timetable') ||
    normalized.includes('department')
  ) {
    return {
      destination: 'SCHOOL',
      destinationLabel: 'School Support',
      routeCode: 'SCHOOL_ACADEMIC_ADMIN',
      routedDepartment: 'Academic & Department Administration',
      handlerDisplayName: 'School Administration',
      firestoreCollection: `schools/${schoolId}/staffSupportTickets`,
    };
  }

  return {
    destination: 'SCHOOL',
    destinationLabel: 'School Support',
    routeCode: 'SCHOOL_GENERAL_ADMIN',
    routedDepartment: 'School Administration Office',
    handlerDisplayName: 'School Administration',
    firestoreCollection: `schools/${schoolId}/staffSupportTickets`,
  };
}

// ============================================================================
// 4. ATTACHMENT VALIDATION & STORAGE
// ============================================================================

export const MAX_ATTACHMENTS_PER_UPLOAD = 5;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

export const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

export interface SupportAttachment {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'JPG' | 'JPEG' | 'PNG';
  mimeType: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  dataUrl: string;
  storagePath: string;
  uploadedAt: string;
  uploadedByStaffId: string;
  schoolId: string;
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function getExtensionFromFileName(fileName: string): string {
  const parts = fileName.trim().split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

export function validateSupportAttachmentFile(file: {
  name: string;
  type: string;
  size: number;
}): AttachmentValidationResult {
  if (!file || !file.name.trim()) {
    return { valid: false, error: 'Invalid file selected.' };
  }
  if (file.size <= 0) {
    return { valid: false, error: `"${file.name}" is empty (0 bytes).` };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the 10 MB maximum file size limit (${formatFileSize(file.size)}).`,
    };
  }

  const ext = getExtensionFromFileName(file.name);
  const mime = (file.type || '').toLowerCase();
  const isAllowedExt = ALLOWED_ATTACHMENT_EXTENSIONS.has(ext);
  const isAllowedMime = mime ? ALLOWED_ATTACHMENT_MIME_TYPES.has(mime) : isAllowedExt;

  if (!isAllowedExt || !isAllowedMime) {
    return {
      valid: false,
      error: `"${file.name}" has an unsupported format. Only PDF, JPG, JPEG, and PNG files are allowed.`,
    };
  }

  return { valid: true };
}

export function validateSupportAttachmentBatch(
  existingCount: number,
  newFiles: ReadonlyArray<{ name: string; type: string; size: number }>
): AttachmentValidationResult {
  if (existingCount + newFiles.length > MAX_ATTACHMENTS_PER_UPLOAD) {
    return {
      valid: false,
      error: `You can attach up to ${MAX_ATTACHMENTS_PER_UPLOAD} files per request (currently ${existingCount} attached).`,
    };
  }
  for (const file of newFiles) {
    const res = validateSupportAttachmentFile(file);
    if (!res.valid) return res;
  }
  return { valid: true };
}

// ============================================================================
// 5. SUPPORT TICKET DATA MODEL
// ============================================================================

export type SupportTicketStatus = 'Pending' | 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type SupportFilterTab = 'All' | 'School' | 'OFFSLEEK' | 'Open' | 'Pending' | 'Closed';

export interface SupportHistoryEntry {
  id: string;
  status: 'Submitted' | 'Under Review' | 'In Progress' | 'Resolved' | 'Closed';
  title: string;
  timestamp: string;
  createdAtIso: string;
  description: string;
  actorName: string;
}

export interface SupportConversationMessage {
  id: string;
  ticketId: string;
  senderType: 'STAFF' | 'SCHOOL_ADMIN' | 'OFFSLEEK_SUPPORT';
  senderName: string;
  senderId: string;
  message: string;
  timestamp: string;
  dateLabel: string;
  createdAtIso: string;
  attachments: SupportAttachment[];
  isRead: boolean;
}

export interface SupportFeedback {
  ticketId: string;
  rating: number; // 1 to 5
  comment: string; // max 300 chars
  submittedAt: string;
  submittedAtIso: string;
  submittedByStaffId: string;
  schoolId: string;
}

export interface SupportTicket {
  id: string; // e.g., "REQ001245"
  displayId: string; // e.g., "#REQ001245"
  destination: SupportDestination;
  destinationLabel: 'School Support' | 'OFFSLEEK Support';
  routeCode: SupportRoutingTarget['routeCode'];
  routedDepartment: string;
  handlerDisplayName: 'School Administration' | 'OFFSLEEK Support';
  category: string;
  customCategory?: string;
  effectiveCategory: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  createdAt: string;
  createdAtIso: string;
  updatedAt: string;
  updatedAtIso: string;
  // Ownership & School Context
  staffId: string;
  employeeId: string;
  staffName: string;
  staffRole: string;
  designation: string;
  department: string;
  assignedClass: string;
  reportingManager: string;
  schoolId: string;
  schoolName: string;
  // Content collections
  attachments: SupportAttachment[];
  history: SupportHistoryEntry[];
  messages: SupportConversationMessage[];
  feedback?: SupportFeedback;
  // Optional Illustrative Test Fixture Metadata (isolated from production)
  isTestData?: boolean;
  testDataLabel?: string;
  portalMode?: 'STUDENT' | 'PARENT';
  studentId?: string;
  studentName?: string;
  parentId?: string;
  parentName?: string;
  linkedChildId?: string;
  linkedChildName?: string;
}

// ============================================================================
// 6. PERMISSIONS, OWNERSHIP & ACCESS VERIFICATION
// ============================================================================

export function verifyTicketAccess(
  ticket: SupportTicket,
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): boolean {
  if (!ticket || !actor) return false;

  // 1. OFFSLEEK Support team can access only OFFSLEEK tickets
  if (actor.role === 'OFFSLEEK_SUPPORT') {
    return ticket.destination === 'OFFSLEEK';
  }

  // 2. School isolation: staff and school admins can never access tickets from another school
  if (ticket.schoolId !== actor.schoolId) {
    return false;
  }

  // 3. School Admin / HR / Principal can access SCHOOL support tickets in their school,
  //    or their own personal tickets, but NOT another staff member's OFFSLEEK support tickets.
  if (
    actor.role === 'SCHOOL_ADMIN' ||
    actor.role === 'HR_ADMIN' ||
    actor.role === 'PRINCIPAL'
  ) {
    if (ticket.destination === 'SCHOOL') return true;
    return ticket.staffId === actor.staffId;
  }

  // 4. Regular Staff member can access ONLY their own tickets
  return ticket.staffId === actor.staffId;
}

export function canAccessTicketAttachment(
  ticket: SupportTicket,
  attachment: SupportAttachment,
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): boolean {
  if (ticket?.isTestData) {
    return attachment.schoolId === ticket.schoolId;
  }
  if (!verifyTicketAccess(ticket, actor)) return false;
  return attachment.schoolId === ticket.schoolId;
}

// ============================================================================
// 7. STORAGE & PERSISTENCE LAYER (FIRESTORE + LOCAL STORAGE SYNC)
// ============================================================================

const SUPPORT_TICKETS_STORAGE_KEY = 'offsleek_staff_support_tickets_v1';
const SUPPORT_COUNTER_STORAGE_KEY = 'offsleek_staff_support_seq_v1';

// Duplicate submission guard map (fingerprint -> timestamp ms)
const recentSubmissionFingerprints = new Map<string, number>();
const DUPLICATE_SUBMISSION_COOLDOWN_MS = 4000;

export function clearDuplicateSubmissionGuard(): void {
  recentSubmissionFingerprints.clear();
}

function loadAllStoredSupportTickets(): SupportTicket[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllStoredSupportTickets(tickets: SupportTicket[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.warn('Unable to save support tickets to localStorage:', err);
  }
}

function generateNextTicketId(): { id: string; displayId: string } {
  let seq = 1245;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(SUPPORT_COUNTER_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed) && parsed >= 1000) {
          seq = parsed + 1;
        }
      } else {
        const existing = loadAllStoredSupportTickets();
        if (existing.length > 0) {
          seq = 1245 + existing.length;
        }
      }
      window.localStorage.setItem(SUPPORT_COUNTER_STORAGE_KEY, String(seq));
    }
  } catch {
    seq = Math.floor(100000 + Math.random() * 899999);
  }
  const padded = String(seq).padStart(6, '0');
  return {
    id: `REQ${padded}`,
    displayId: `#REQ${padded}`,
  };
}

async function syncTicketToFirebase(ticket: SupportTicket): Promise<void> {
  try {
    // Hard safety guard: never write illustrative test data to production Firestore collections
    if (ticket.isTestData) return;
    if (!auth?.currentUser || !db) return;
    const routing = resolveSupportRouting(ticket.destination, ticket.category, ticket.schoolId);
    const ticketRef = doc(db, routing.firestoreCollection, ticket.id);
    await setDoc(ticketRef, JSON.parse(JSON.stringify(ticket)), { merge: true });
  } catch {
    // Fallback to local persistence silently when offline or unauthenticated in preview
  }
}

export async function uploadSupportAttachment(
  ticketId: string,
  fileData: {
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    dataUrl: string;
  },
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): Promise<SupportAttachment> {
  const validation = validateSupportAttachmentFile({
    name: fileData.fileName,
    type: fileData.mimeType,
    size: fileData.fileSizeBytes,
  });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = getExtensionFromFileName(fileData.fileName).toUpperCase();
  const fileType: SupportAttachment['fileType'] =
    ext === 'PDF' ? 'PDF' : ext === 'PNG' ? 'PNG' : ext === 'JPEG' ? 'JPEG' : 'JPG';

  const sanitizedName = fileData.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `schools/${actor.schoolId}/staffSupportAttachments/${actor.staffId}/${ticketId}/${Date.now()}_${sanitizedName}`;
  let resolvedUrl = fileData.dataUrl;

  try {
    if (auth?.currentUser && storage && fileData.dataUrl.startsWith('data:')) {
      const fRef = storageRef(storage, storagePath);
      await uploadString(fRef, fileData.dataUrl, 'data_url');
      resolvedUrl = await getDownloadURL(fRef);
    }
  } catch {
    resolvedUrl = fileData.dataUrl;
  }

  return {
    id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileName: fileData.fileName,
    fileType,
    mimeType: fileData.mimeType || (fileType === 'PDF' ? 'application/pdf' : `image/${ext.toLowerCase()}`),
    fileSizeBytes: fileData.fileSizeBytes,
    fileSizeFormatted: formatFileSize(fileData.fileSizeBytes),
    dataUrl: resolvedUrl,
    storagePath,
    uploadedAt: formatISTDateTime(getNow()),
    uploadedByStaffId: actor.staffId,
    schoolId: actor.schoolId,
  };
}

// ============================================================================
// 8. CORE SUPPORT TICKET OPERATIONS (CREATE, LIST, FILTER, REPLY, STATUS, FEEDBACK)
// ============================================================================

export interface CreateSupportTicketInput {
  destination: SupportDestination;
  category: string;
  customCategory?: string;
  subject: string;
  description: string;
  attachments?: SupportAttachment[];
}

export function validateCreateSupportTicketInput(
  input: CreateSupportTicketInput
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.destination || (input.destination !== 'SCHOOL' && input.destination !== 'OFFSLEEK')) {
    errors.destination = 'Please select a valid support destination.';
  }

  const allowedCategories = getCategoriesForDestination(input.destination);
  if (!input.category || !input.category.trim()) {
    errors.category = 'Please select a request category.';
  } else if (!allowedCategories.includes(input.category)) {
    errors.category = 'Selected category is not valid for this support type.';
  }

  const customCat = (input.customCategory || '').trim();
  if (input.category === 'Other' && customCat.length > 80) {
    errors.customCategory = 'Custom category must be 80 characters or fewer.';
  } else if (customCat.length > 80) {
    errors.customCategory = 'Custom category must be 80 characters or fewer.';
  }

  const subject = (input.subject || '').trim();
  if (!subject) {
    errors.subject = 'Please enter a brief subject for your request.';
  } else if (subject.length < 3) {
    errors.subject = 'Subject must be at least 3 characters.';
  } else if (subject.length > 120) {
    errors.subject = 'Subject cannot exceed 120 characters.';
  }

  const description = (input.description || '').trim();
  if (!description) {
    errors.description = 'Please describe your issue or request in detail.';
  } else if (description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters.';
  }

  if (input.attachments && input.attachments.length > MAX_ATTACHMENTS_PER_UPLOAD) {
    errors.attachments = `You can attach at most ${MAX_ATTACHMENTS_PER_UPLOAD} files.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function createSupportTicket(
  input: CreateSupportTicketInput,
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): SupportTicket {
  const validation = validateCreateSupportTicketInput(input);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Invalid support request data.';
    throw new Error(firstError);
  }

  const cleanSubject = input.subject.trim();
  const cleanDescription = input.description.trim();
  const cleanCustomCategory = (input.customCategory || '').trim();

  // Duplicate submission guard
  const fingerprint = `${actor.staffId}|${actor.schoolId}|${input.destination}|${input.category}|${cleanCustomCategory}|${cleanSubject}|${cleanDescription}`;
  const nowMs = Date.now();
  const lastSubmittedMs = recentSubmissionFingerprints.get(fingerprint);
  if (lastSubmittedMs && nowMs - lastSubmittedMs < DUPLICATE_SUBMISSION_COOLDOWN_MS) {
    throw new Error('Duplicate submission detected. Your request was already submitted.');
  }
  recentSubmissionFingerprints.set(fingerprint, nowMs);

  const now = getNow();
  const nowFormatted = formatISTDateTime(now);
  const nowIso = now.toISOString();
  const dateLabel = formatISTDateMedium(now);
  const timeLabel = formatISTTime12h(now);

  const { id, displayId } = generateNextTicketId();
  const routing = resolveSupportRouting(input.destination, input.category, actor.schoolId);

  const effectiveCategory = cleanCustomCategory
    ? `${input.category} (${cleanCustomCategory})`
    : input.category;

  const initialHistory: SupportHistoryEntry[] = [
    {
      id: `HIST-${id}-1`,
      status: 'Submitted',
      title: 'Submitted',
      timestamp: nowFormatted,
      createdAtIso: nowIso,
      description: 'Your request has been submitted successfully.',
      actorName: actor.staffName,
    },
  ];

  const initialMessage: SupportConversationMessage = {
    id: `MSG-${id}-1`,
    ticketId: id,
    senderType: 'STAFF',
    senderName: actor.staffName,
    senderId: actor.staffId,
    message: cleanDescription,
    timestamp: timeLabel,
    dateLabel,
    createdAtIso: nowIso,
    attachments: input.attachments ? [...input.attachments] : [],
    isRead: true,
  };

  const newTicket: SupportTicket = {
    id,
    displayId,
    destination: input.destination,
    destinationLabel: routing.destinationLabel,
    routeCode: routing.routeCode,
    routedDepartment: routing.routedDepartment,
    handlerDisplayName: routing.handlerDisplayName,
    category: input.category,
    customCategory: cleanCustomCategory || undefined,
    effectiveCategory,
    subject: cleanSubject,
    description: cleanDescription,
    status: 'Pending',
    createdAt: nowFormatted,
    createdAtIso: nowIso,
    updatedAt: nowFormatted,
    updatedAtIso: nowIso,
    staffId: actor.staffId,
    employeeId: actor.employeeId,
    staffName: actor.staffName,
    staffRole: actor.role,
    designation: actor.designation,
    department: actor.department,
    assignedClass: actor.assignedClass,
    reportingManager: actor.reportingManager,
    schoolId: actor.schoolId,
    schoolName: actor.schoolName,
    attachments: input.attachments ? [...input.attachments] : [],
    history: initialHistory,
    messages: [initialMessage],
  };

  const allTickets = loadAllStoredSupportTickets();
  const updatedTickets = [newTicket, ...allTickets];
  saveAllStoredSupportTickets(updatedTickets);
  void syncTicketToFirebase(newTicket);

  return newTicket;
}

export function getStaffSupportTickets(
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): SupportTicket[] {
  const all = loadAllStoredSupportTickets();
  return all
    .filter((ticket) => verifyTicketAccess(ticket, actor))
    .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());
}

export function getSupportTicketById(
  ticketId: string,
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): SupportTicket | null {
  const normalizedId = ticketId.replace(/^#/, '').trim();
  const all = loadAllStoredSupportTickets();
  const found = all.find((t) => t.id === normalizedId || t.displayId === ticketId);
  if (!found) return null;
  if (!verifyTicketAccess(found, actor)) {
    throw new Error('Unauthorized access: You do not have permission to view this support request.');
  }
  return found;
}

export function filterSupportTickets(
  tickets: ReadonlyArray<SupportTicket>,
  filter: SupportFilterTab
): SupportTicket[] {
  switch (filter) {
    case 'All':
      return [...tickets];
    case 'School':
      return tickets.filter((t) => t.destination === 'SCHOOL');
    case 'OFFSLEEK':
      return tickets.filter((t) => t.destination === 'OFFSLEEK');
    case 'Open':
      return tickets.filter((t) => t.status === 'Open');
    case 'Pending':
      return tickets.filter((t) => t.status === 'Pending');
    case 'Closed':
      return tickets.filter((t) => t.status === 'Closed' || t.status === 'Resolved');
    default:
      return [...tickets];
  }
}

export interface AddTicketReplyInput {
  ticketId: string;
  message: string;
  attachments?: SupportAttachment[];
  senderType?: 'STAFF' | 'SCHOOL_ADMIN' | 'OFFSLEEK_SUPPORT';
}

export function addSupportTicketReply(
  input: AddTicketReplyInput,
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): SupportTicket {
  const normalizedId = input.ticketId.replace(/^#/, '').trim();
  const all = loadAllStoredSupportTickets();
  const index = all.findIndex((t) => t.id === normalizedId);
  if (index === -1) {
    throw new Error('Support request not found.');
  }

  const existing = all[index];
  if (!verifyTicketAccess(existing, actor)) {
    throw new Error('Unauthorized: You cannot reply to another staff member’s request.');
  }

  if (existing.status === 'Closed' || existing.status === 'Resolved') {
    throw new Error('This request is already closed and cannot receive new replies.');
  }

  const cleanText = (input.message || '').trim();
  const attachments = input.attachments || [];
  if (!cleanText && attachments.length === 0) {
    throw new Error('Please enter a reply message or attach a file.');
  }
  if (cleanText.length > 1000) {
    throw new Error('Reply message cannot exceed 1000 characters.');
  }

  const now = getNow();
  const nowFormatted = formatISTDateTime(now);
  const nowIso = now.toISOString();
  const dateLabel = formatISTDateMedium(now);
  const timeLabel = formatISTTime12h(now);

  const senderType = input.senderType || 'STAFF';
  const senderName =
    senderType === 'STAFF'
      ? actor.staffName
      : existing.destination === 'SCHOOL'
      ? 'School Administration'
      : 'OFFSLEEK Support';

  const newMessage: SupportConversationMessage = {
    id: `MSG-${existing.id}-${existing.messages.length + 1}-${Date.now()}`,
    ticketId: existing.id,
    senderType,
    senderName,
    senderId: senderType === 'STAFF' ? actor.staffId : existing.routeCode,
    message: cleanText || (attachments.length > 0 ? `Attached ${attachments.length} file(s)` : ''),
    timestamp: timeLabel,
    dateLabel,
    createdAtIso: nowIso,
    attachments,
    isRead: true,
  };

  const updatedTicket: SupportTicket = {
    ...existing,
    updatedAt: nowFormatted,
    updatedAtIso: nowIso,
    attachments:
      attachments.length > 0 ? [...existing.attachments, ...attachments] : existing.attachments,
    messages: [...existing.messages, newMessage],
  };

  all[index] = updatedTicket;
  saveAllStoredSupportTickets(all);
  void syncTicketToFirebase(updatedTicket);

  return updatedTicket;
}

export function updateSupportTicketStatus(
  ticketId: string,
  newStatus: SupportTicketStatus,
  statusNote?: string,
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): SupportTicket {
  const normalizedId = ticketId.replace(/^#/, '').trim();
  const all = loadAllStoredSupportTickets();
  const index = all.findIndex((t) => t.id === normalizedId);
  if (index === -1) {
    throw new Error('Support request not found.');
  }

  const existing = all[index];
  if (!verifyTicketAccess(existing, actor)) {
    throw new Error('Unauthorized access to update ticket status.');
  }

  const now = getNow();
  const nowFormatted = formatISTDateTime(now);
  const nowIso = now.toISOString();
  const dateLabel = formatISTDateMedium(now);
  const timeLabel = formatISTTime12h(now);

  const handlerName = existing.handlerDisplayName;

  let historyStatus: SupportHistoryEntry['status'] = 'Under Review';
  let defaultExplanation = '';

  if (newStatus === 'Pending') {
    historyStatus = 'Under Review';
    defaultExplanation =
      existing.destination === 'SCHOOL'
        ? 'Your request is being reviewed by the school administration.'
        : 'Your request is being reviewed by the OFFSLEEK support team.';
  } else if (newStatus === 'Open' || newStatus === 'In Progress') {
    historyStatus = 'In Progress';
    defaultExplanation =
      existing.destination === 'SCHOOL'
        ? 'School administration is actively working on your request.'
        : 'Our team is checking the issue.';
  } else if (newStatus === 'Resolved' || newStatus === 'Closed') {
    historyStatus = 'Resolved';
    defaultExplanation =
      existing.destination === 'SCHOOL'
        ? 'Your request has been resolved by the school administration.'
        : 'The issue has been resolved by the OFFSLEEK support team.';
  }

  const explanation = (statusNote || '').trim() || defaultExplanation;

  const newHistoryEntry: SupportHistoryEntry = {
    id: `HIST-${existing.id}-${existing.history.length + 1}-${Date.now()}`,
    status: historyStatus,
    title: historyStatus,
    timestamp: nowFormatted,
    createdAtIso: nowIso,
    description: explanation,
    actorName: handlerName,
  };

  // Also add an official support response message in the conversation when support updates status
  const supportReplyMessage: SupportConversationMessage = {
    id: `MSG-${existing.id}-${existing.messages.length + 1}-${Date.now()}`,
    ticketId: existing.id,
    senderType: existing.destination === 'SCHOOL' ? 'SCHOOL_ADMIN' : 'OFFSLEEK_SUPPORT',
    senderName: handlerName,
    senderId: existing.routeCode,
    message: explanation,
    timestamp: timeLabel,
    dateLabel,
    createdAtIso: nowIso,
    attachments: [],
    isRead: true,
  };

  const updatedTicket: SupportTicket = {
    ...existing,
    status: newStatus,
    updatedAt: nowFormatted,
    updatedAtIso: nowIso,
    history: [...existing.history, newHistoryEntry],
    messages: [...existing.messages, supportReplyMessage],
  };

  all[index] = updatedTicket;
  saveAllStoredSupportTickets(all);
  void syncTicketToFirebase(updatedTicket);

  return updatedTicket;
}

export interface SubmitTicketFeedbackInput {
  ticketId: string;
  rating: number;
  comment?: string;
}

export function submitSupportTicketFeedback(
  input: SubmitTicketFeedbackInput,
  actor: StaffIdentityContext = AUTHENTICATED_STAFF_CONTEXT
): SupportTicket {
  const normalizedId = input.ticketId.replace(/^#/, '').trim();
  const all = loadAllStoredSupportTickets();
  const index = all.findIndex((t) => t.id === normalizedId);
  if (index === -1) {
    throw new Error('Support request not found.');
  }

  const existing = all[index];
  if (!verifyTicketAccess(existing, actor) || existing.staffId !== actor.staffId) {
    throw new Error('Unauthorized: Only the staff member who raised this request can submit feedback.');
  }

  if (existing.status !== 'Closed' && existing.status !== 'Resolved') {
    throw new Error('Feedback can only be submitted for resolved or closed requests.');
  }

  if (existing.feedback) {
    throw new Error('Feedback has already been submitted for this request.');
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('Please select a star rating between 1 and 5.');
  }

  const cleanComment = (input.comment || '').trim();
  if (cleanComment.length > 300) {
    throw new Error('Feedback comment cannot exceed 300 characters.');
  }

  const now = getNow();
  const nowFormatted = formatISTDateTime(now);
  const nowIso = now.toISOString();

  const feedback: SupportFeedback = {
    ticketId: existing.id,
    rating: input.rating,
    comment: cleanComment,
    submittedAt: nowFormatted,
    submittedAtIso: nowIso,
    submittedByStaffId: actor.staffId,
    schoolId: actor.schoolId,
  };

  const updatedTicket: SupportTicket = {
    ...existing,
    updatedAt: nowFormatted,
    updatedAtIso: nowIso,
    feedback,
  };

  all[index] = updatedTicket;
  saveAllStoredSupportTickets(all);
  void syncTicketToFirebase(updatedTicket);

  return updatedTicket;
}

export function resetAllSupportTicketsForTesting(): void {
  saveAllStoredSupportTickets([]);
  clearDuplicateSubmissionGuard();
}

// ============================================================================
// 9. LEGACY STAFF REQUESTS & PARENT LEAVE REQUESTS (PRESERVED FOR COMPATIBILITY)
// ============================================================================

export type StaffRequestStatus =
  | 'Submitted'
  | 'Under Review'
  | 'In Progress'
  | 'Approved'
  | 'Completed'
  | 'Pending Approval'
  | 'Rejected';

export type StaffRequestCategory = 'Leave' | 'Salary Slip' | 'Document' | 'Other';

export interface StaffRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: StaffRequestCategory;
  title: string;
  subtitle?: string;
  details?: string;
  submittedOn: string;
  status: StaffRequestStatus;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  duration?: string;
  reason?: string;
  attachmentName?: string;
  attachmentSize?: string;
  monthYear?: string;
  documentType?: string;
  subject?: string;
  adminRemarks?: string;
}

export type ParentLeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ParentLeaveRequest {
  id: string;
  schoolId?: string;
  parentId?: string;
  parentName: string;
  parentInitials: string;
  parentColor: string;
  parentRelation?: string;
  parentPhone?: string;
  studentId?: string;
  studentName: string;
  studentAvatar?: string;
  classSection: string;
  rollNo: string;
  leaveType?: string;
  dates: string;
  fromDate: string;
  toDate: string;
  durationDays?: number;
  totalDays?: number;
  reason: string;
  message: string;
  submittedOn: string;
  status: ParentLeaveStatus;
  attachmentName?: string;
  attachmentSize?: string;
  teacherRemarks?: string;
  reviewedBy?: string;
  reviewedOn?: string;
  decidedBy?: string;
  decisionDate?: string;
}

const STAFF_REQUESTS_STORAGE_KEY = 'offsleek_staff_requests_v4';
const PARENT_LEAVE_STORAGE_KEY = 'offsleek_parent_leave_requests_v3';

function createInitialStaffRequests(): StaffRequest[] {
  const now = getNow();
  const compactKey = formatISTDateKey(now).replace(/-/g, '');
  const leaveStart = addDaysIST(now, 3);
  const leaveEnd = addDaysIST(now, 5);
  const prevMonthDate = addDaysIST(now, -28);

  return [
    {
      id: `SL-${compactKey}-001`,
      staffId: 'T001',
      staffName: 'Ms. Priya Sharma',
      type: 'Leave',
      title: 'Casual Leave',
      subtitle: 'Casual Leave',
      leaveType: 'Casual Leave',
      fromDate: formatISTDateKey(leaveStart),
      toDate: formatISTDateKey(leaveEnd),
      duration: `${formatISTDateMedium(leaveStart)} - ${formatISTDateMedium(leaveEnd)} (3 days)`,
      details: `${formatISTDateMedium(leaveStart)} - ${formatISTDateMedium(leaveEnd)} (3 days)`,
      reason: 'Family function in hometown',
      submittedOn: formatISTDateTime(addDaysIST(now, -1)),
      status: 'Approved',
      adminRemarks: 'Approved by Principal Dr. R. K. Verma',
    },
    {
      id: `SR-${compactKey}-002`,
      staffId: 'T001',
      staffName: 'Ms. Priya Sharma',
      type: 'Salary Slip',
      title: 'Salary Slip Request',
      subtitle: formatISTMonthYear(prevMonthDate),
      monthYear: formatISTMonthYear(prevMonthDate),
      details: `${formatISTMonthYear(prevMonthDate)} • For bank loan documentation`,
      reason: 'Required for home loan verification at HDFC Bank',
      submittedOn: formatISTDateTime(addDaysIST(now, -2)),
      status: 'In Progress',
    },
  ];
}

function createInitialParentLeaveRequests(): ParentLeaveRequest[] {
  const now = getNow();
  const compactKey = formatISTDateKey(now).replace(/-/g, '');
  const p1Start = addDaysIST(now, 1);
  const p1End = addDaysIST(now, 2);
  const p2Start = addDaysIST(now, 4);
  const p2End = addDaysIST(now, 6);
  const p3Start = addDaysIST(now, -2);
  const p3End = addDaysIST(now, -1);
  const p4Start = addDaysIST(now, -5);

  return [
    {
      id: `PL-${compactKey}-101`,
      schoolId: 'greenwood-intl',
      parentId: 'p-sharma',
      parentName: 'Mr. Rajesh Sharma',
      parentInitials: 'RS',
      parentColor: '#2563eb',
      parentRelation: 'Father',
      parentPhone: '+91 98201 44510',
      studentId: 's-sharma-01',
      studentName: 'Aarav Sharma',
      rollNo: '01',
      classSection: 'Grade 5 - A',
      studentAvatar:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      leaveType: 'Medical Leave',
      dates: `${formatISTDateMedium(p1Start)} – ${formatISTDateMedium(p1End)} (2 days)`,
      fromDate: formatISTDateMedium(p1Start),
      toDate: formatISTDateMedium(p1End),
      durationDays: 2,
      totalDays: 2,
      reason: 'Medical Leave',
      message:
        'Aarav has mild viral fever and the family pediatrician has advised 2 days of complete rest at home.',
      submittedOn: `${formatISTDateMedium(now)}, 08:15 AM`,
      status: 'Pending',
      attachmentName: 'Doctor_Prescription_Aarav.pdf',
      attachmentSize: '420 KB',
    },
    {
      id: `PL-${compactKey}-102`,
      schoolId: 'greenwood-intl',
      parentId: 'p-verma',
      parentName: 'Mrs. Kavita Verma',
      parentInitials: 'KV',
      parentColor: '#7c3aed',
      parentRelation: 'Mother',
      parentPhone: '+91 98112 77890',
      studentId: 's-verma-02',
      studentName: 'Ananya Verma',
      rollNo: '02',
      classSection: 'Grade 5 - A',
      studentAvatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      leaveType: 'Family Function',
      dates: `${formatISTDateMedium(p2Start)} – ${formatISTDateMedium(p2End)} (3 days)`,
      fromDate: formatISTDateMedium(p2Start),
      toDate: formatISTDateMedium(p2End),
      durationDays: 3,
      totalDays: 3,
      reason: 'Family Function',
      message:
        'Attending elder sister’s convocation ceremony in Pune. Ananya will complete all assigned classwork in advance.',
      submittedOn: `${formatISTDateMedium(addDaysIST(now, -1))}, 06:40 PM`,
      status: 'Pending',
    },
    {
      id: `PL-${compactKey}-098`,
      schoolId: 'greenwood-intl',
      parentId: 'p-nair',
      parentName: 'Mr. Suresh Nair',
      parentInitials: 'SN',
      parentColor: '#059669',
      parentRelation: 'Father',
      parentPhone: '+91 98450 11223',
      studentId: 's-nair-05',
      studentName: 'Rohan Nair',
      rollNo: '05',
      classSection: 'Grade 5 - A',
      studentAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      leaveType: 'Medical Leave',
      dates: `${formatISTDateMedium(p3Start)} – ${formatISTDateMedium(p3End)} (2 days)`,
      fromDate: formatISTDateMedium(p3Start),
      toDate: formatISTDateMedium(p3End),
      durationDays: 2,
      totalDays: 2,
      reason: 'Medical Leave',
      message: 'Recovering from dental procedure and scheduled follow-up checkup.',
      submittedOn: `${formatISTDateMedium(addDaysIST(now, -3))}, 09:05 AM`,
      status: 'Approved',
      teacherRemarks: 'Approved. Get well soon, Rohan. Class notes shared.',
      reviewedBy: 'Ms. Priya Sharma',
      reviewedOn: `${formatISTDateMedium(addDaysIST(now, -3))}, 11:20 AM`,
      decidedBy: 'Ms. Priya Sharma (Class Teacher)',
      decisionDate: `${formatISTDateMedium(addDaysIST(now, -3))}, 11:20 AM`,
    },
    {
      id: `PL-${compactKey}-094`,
      schoolId: 'greenwood-intl',
      parentId: 'p-singh',
      parentName: 'Mr. Vikramjit Singh',
      parentInitials: 'VS',
      parentColor: '#d97706',
      parentRelation: 'Father',
      parentPhone: '+91 98990 33445',
      studentId: 's-singh-07',
      studentName: 'Kabir Singh',
      rollNo: '07',
      classSection: 'Grade 5 - A',
      studentAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      leaveType: 'Personal Reason',
      dates: `${formatISTDateMedium(p4Start)} (1 day)`,
      fromDate: formatISTDateMedium(p4Start),
      toDate: formatISTDateMedium(p4Start),
      durationDays: 1,
      totalDays: 1,
      reason: 'Personal Reason',
      message: 'Out of station travel during unit assessment.',
      submittedOn: `${formatISTDateMedium(addDaysIST(now, -6))}, 04:50 PM`,
      status: 'Rejected',
      teacherRemarks: 'Mandatory Unit Test scheduled on this date. Attendance required.',
      reviewedBy: 'Ms. Priya Sharma',
      reviewedOn: `${formatISTDateMedium(addDaysIST(now, -6))}, 05:30 PM`,
      decidedBy: 'Ms. Priya Sharma (Class Teacher)',
      decisionDate: `${formatISTDateMedium(addDaysIST(now, -6))}, 05:30 PM`,
    },
  ];
}

export function getStaffRequests(staffId = 'T001'): StaffRequest[] {
  try {
    const raw = localStorage.getItem(STAFF_REQUESTS_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialStaffRequests();
      localStorage.setItem(STAFF_REQUESTS_STORAGE_KEY, JSON.stringify(initial));
      return initial.filter((r) => r.staffId === staffId);
    }
    const parsed: StaffRequest[] = JSON.parse(raw);
    return parsed.filter((r) => r.staffId === staffId);
  } catch {
    return createInitialStaffRequests();
  }
}

export function submitStaffRequest(
  request: Omit<StaffRequest, 'id' | 'submittedOn' | 'status'>
): StaffRequest {
  const existing = getStaffRequests(request.staffId);
  const now = getNow();
  const formattedTime = formatISTDateTime(now);
  const dateCompact = formatISTDateKey(now).replace(/-/g, '');
  const seq = String(existing.length + 1).padStart(3, '0');
  const prefix = request.type === 'Leave' ? 'SL' : 'SR';

  const newRecord: StaffRequest = {
    ...request,
    subtitle: request.subtitle || request.leaveType || request.monthYear || request.documentType,
    details: request.details || request.duration || request.reason || '',
    id: `${prefix}-${dateCompact}-${seq}`,
    submittedOn: formattedTime,
    status: 'Submitted',
  };

  const updated = [newRecord, ...existing];
  try {
    localStorage.setItem(STAFF_REQUESTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return newRecord;
}

export function getParentLeaveRequests(classSection = 'Grade 5 - A'): ParentLeaveRequest[] {
  try {
    const raw = localStorage.getItem(PARENT_LEAVE_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialParentLeaveRequests();
      localStorage.setItem(PARENT_LEAVE_STORAGE_KEY, JSON.stringify(initial));
      return initial.filter((r) => r.classSection === classSection);
    }
    const parsed: ParentLeaveRequest[] = JSON.parse(raw);
    return parsed.filter((r) => r.classSection === classSection);
  } catch {
    return createInitialParentLeaveRequests();
  }
}

export function addParentLeaveRequest(
  input: Omit<ParentLeaveRequest, 'id' | 'submittedOn' | 'status'>
): ParentLeaveRequest {
  const existing = getParentLeaveRequests(input.classSection);
  const now = getNow();
  const dateCompact = formatISTDateKey(now).replace(/-/g, '');
  const seq = String(existing.length + 105).padStart(3, '0');
  const newRecord: ParentLeaveRequest = {
    ...input,
    id: `PL-${dateCompact}-${seq}`,
    submittedOn: formatISTDateTime(now),
    status: 'Pending',
  };
  const updated = [newRecord, ...existing];
  try {
    localStorage.setItem(PARENT_LEAVE_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('offsleek_parent_leave_updated'));
    }
  } catch {
    // ignore storage errors
  }
  return newRecord;
}

export function updateParentLeaveRequestStatus(
  requestId: string,
  decision: 'Approved' | 'Rejected',
  teacherRemarks?: string,
  decidedBy = 'Ms. Priya Sharma (Class Teacher)'
): ParentLeaveRequest {
  const all = getParentLeaveRequests('Grade 5 - A');
  const formattedTime = formatISTDateTime(getNow());

  let updatedItem: ParentLeaveRequest | null = null;
  const updatedList = all.map((item) => {
    if (item.id === requestId) {
      updatedItem = {
        ...item,
        status: decision,
        teacherRemarks:
          (teacherRemarks || '').trim() ||
          (decision === 'Approved' ? 'Leave request approved.' : 'Leave request declined.'),
        reviewedBy: decidedBy,
        reviewedOn: formattedTime,
        decidedBy,
        decisionDate: formattedTime,
      };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) {
    throw new Error(`Leave request ${requestId} not found.`);
  }

  try {
    localStorage.setItem(PARENT_LEAVE_STORAGE_KEY, JSON.stringify(updatedList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('offsleek_parent_leave_updated'));
    }
  } catch {
    // ignore storage errors
  }

  return updatedItem;
}

export const updateParentLeaveDecision = updateParentLeaveRequestStatus;
