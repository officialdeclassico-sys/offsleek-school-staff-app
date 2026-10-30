/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addDaysIST,
  formatISTDateMedium,
  formatISTDateTime,
  formatISTTime12h,
  getNow,
  getNowISO,
  parseDateKeySafe,
} from '../utils/dateTimeUtils';

export interface HomeworkAttachment {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  type: 'pdf' | 'jpg' | 'png' | 'doc' | 'docx' | 'generic';
  dataUrl?: string; // Stored Base64 data for files
  uploadedAt: string;
}

export interface HomeworkStudentItem {
  id: string;
  rollNo: string;
  name: string;
  avatar: string;
  isSelected: boolean;
}

export interface HomeworkDraft {
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  teacherRole: string;
  grade: string;
  subject: string;
  assignedDateStr: string;
  assignedDateKey: string;
  dueDateStr: string;
  instructions: string;
  attachments: HomeworkAttachment[];
  totalEligibleStudents: number;
  assignedStudentIds: string[];
  assignedStudentCount: number;
  students: HomeworkStudentItem[];
  studentsSnapshot: {
    id: string;
    rollNo: string;
    name: string;
    avatar: string;
  }[];
}

export interface HomeworkRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  teacherRole?: string;
  grade: string;
  subject: string;
  assignedDateStr: string;
  assignedDateKey: string;
  dueDateStr?: string;
  assignedOnDateStr?: string;
  assignedOnTimeStr?: string;
  assignedOnFormatted?: string;
  instructions: string;
  attachments: HomeworkAttachment[];
  totalEligibleStudents: number;
  assignedStudentIds: string[];
  assignedStudentCount: number;
  studentsSnapshot: {
    id: string;
    rollNo: string;
    name: string;
    avatar: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export function formatDueDateFromDateKey(dateKey: string): string {
  const baseDate = parseDateKeySafe(dateKey);
  const dueDate = addDaysIST(baseDate, 2);
  return formatISTDateMedium(dueDate);
}

export function downloadHomeworkAttachment(attachment: HomeworkAttachment): void {
  try {
    let href = attachment.dataUrl;
    let revokeAfter = false;

    if (!href) {
      const content = `OFFSLEEK School OS - Homework Attachment\nFile: ${attachment.name}\nSize: ${attachment.sizeFormatted}\nUploaded: ${attachment.uploadedAt}\n`;
      const blob = new Blob([content], { type: 'application/octet-stream' });
      href = URL.createObjectURL(blob);
      revokeAfter = true;
    }

    const link = document.createElement('a');
    link.href = href;
    link.download = attachment.name || 'homework-attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (revokeAfter && href) {
      setTimeout(() => URL.revokeObjectURL(href!), 2000);
    }
  } catch (err) {
    console.error('Failed to download attachment:', err);
  }
}

const STORAGE_KEY = 'offsleek_school_homework_records_v1';

// Staff Authorization Rules
export interface StaffClassAssignment {
  classId: string;
  className: string;
  role: string;
  studentCount: number;
  subjects: string[];
}

export const STAFF_ASSIGNMENTS: Record<string, StaffClassAssignment[]> = {
  'T001': [
    {
      classId: '5-a',
      className: 'Grade 5 - A',
      role: 'Class Teacher & Subject Teacher',
      studentCount: 42,
      subjects: ['Mathematics', 'Science'],
    },
    {
      classId: '5-b',
      className: 'Grade 5 - B',
      role: 'Subject Teacher',
      studentCount: 38,
      subjects: ['English'],
    },
    {
      classId: '6-a',
      className: 'Grade 6 - A',
      role: 'Subject Teacher',
      studentCount: 36,
      subjects: ['Mathematics'],
    },
  ],
};

// Initial student roster for Grade 5 - A (42 students matching reference screenshot)
export const STUDENTS_GRADE_5A: HomeworkStudentItem[] = [
  { id: 's-01', rollNo: '01', name: 'Aarav Sharma', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's-02', rollNo: '02', name: 'Ananya Patel', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's-03', rollNo: '03', name: 'Arjun Mehta', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's-04', rollNo: '04', name: 'Diya Reddy', avatar: '/assets/students/student-04-diya.png', isSelected: false },
  { id: 's-05', rollNo: '05', name: 'Ishaan Khan', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's-06', rollNo: '06', name: 'Kavya Nair', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's-07', rollNo: '07', name: 'Mohit Verma', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's-08', rollNo: '08', name: 'Pooja Singh', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's-09', rollNo: '09', name: 'Rohan Gupta', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's-10', rollNo: '10', name: 'Sanya Malhotra', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's-11', rollNo: '11', name: 'Aditya Joshi', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's-12', rollNo: '12', name: 'Sneha Iyer', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's-13', rollNo: '13', name: 'Kabir Das', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's-14', rollNo: '14', name: 'Tanvi Shah', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's-15', rollNo: '15', name: 'Riya Kapoor', avatar: '/assets/students/student-15-riya.png', isSelected: true },
  { id: 's-16', rollNo: '16', name: 'Varun Bhatia', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's-17', rollNo: '17', name: 'Meera Chawla', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's-18', rollNo: '18', name: 'Devendra Sen', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's-19', rollNo: '19', name: 'Gauri Pillai', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's-20', rollNo: '20', name: 'Kunal Aggarwal', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's-21', rollNo: '21', name: 'Bhavna Kulkarni', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's-22', rollNo: '22', name: 'Manav Saxena', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's-23', rollNo: '23', name: 'Nisha Ghosh', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's-24', rollNo: '24', name: 'Pranav Menon', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's-25', rollNo: '25', name: 'Riddhima Roy', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's-26', rollNo: '26', name: 'Siddharth Jain', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's-27', rollNo: '27', name: 'Tara Nambiar', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's-28', rollNo: '28', name: 'Zaid Ali', avatar: '/assets/students/student-28-zaid.png', isSelected: true },
  { id: 's-29', rollNo: '29', name: 'Alia Fernandes', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's-30', rollNo: '30', name: 'Chirag Sethi', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's-31', rollNo: '31', name: 'Deepa Rao', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's-32', rollNo: '32', name: 'Eshwar Murthy', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's-33', rollNo: '33', name: 'Farhan Sheikh', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's-34', rollNo: '34', name: 'Gayatri Varma', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's-35', rollNo: '35', name: 'Harsh Vardhan', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's-36', rollNo: '36', name: 'Indira Choudhury', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's-37', rollNo: '37', name: 'Jayant Mishra', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's-38', rollNo: '38', name: 'Kirti Singhal', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's-39', rollNo: '39', name: 'Lakshya Anand', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's-40', rollNo: '40', name: 'Madhavi Somani', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's-41', rollNo: '41', name: 'Naveen Kaul', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's-42', rollNo: '42', name: 'Pallavi Rawat', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
];

// Initial student roster for Grade 5 - B (38 students)
export const STUDENTS_GRADE_5B: HomeworkStudentItem[] = [
  { id: 's5b-01', rollNo: '01', name: 'Aakash Verma', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's5b-02', rollNo: '02', name: 'Ankita Sen', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's5b-03', rollNo: '03', name: 'Aryan Chawla', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's5b-04', rollNo: '04', name: 'Bhumika Rao', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's5b-05', rollNo: '05', name: 'Chetan Malik', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's5b-06', rollNo: '06', name: 'Divya Nair', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's5b-07', rollNo: '07', name: 'Faisal Qureshi', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's5b-08', rollNo: '08', name: 'Geetika Seth', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's5b-09', rollNo: '09', name: 'Hardik Shah', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's5b-10', rollNo: '10', name: 'Isha Deshmukh', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's5b-11', rollNo: '11', name: 'Jatin Bajaj', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's5b-12', rollNo: '12', name: 'Khushi Paul', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's5b-13', rollNo: '13', name: 'Manish Pandey', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's5b-14', rollNo: '14', name: 'Neha Singhal', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's5b-15', rollNo: '15', name: 'Omkar Shinde', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's5b-16', rollNo: '16', name: 'Prachi Gupta', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's5b-17', rollNo: '17', name: 'Rahul Roy', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's5b-18', rollNo: '18', name: 'Ritika Basu', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's5b-19', rollNo: '19', name: 'Sahil Kapoor', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's5b-20', rollNo: '20', name: 'Shreya Das', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's5b-21', rollNo: '21', name: 'Tanmay Bhatt', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's5b-22', rollNo: '22', name: 'Urvi Menon', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's5b-23', rollNo: '23', name: 'Vikram Joshi', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's5b-24', rollNo: '24', name: 'Yashwant Kale', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's5b-25', rollNo: '25', name: 'Zara Sayed', avatar: '/assets/students/student-28-zaid.png', isSelected: true },
  { id: 's5b-26', rollNo: '26', name: 'Anmol Sethi', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's5b-27', rollNo: '27', name: 'Bhavya Narang', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's5b-28', rollNo: '28', name: 'Chinmay Kulkarni', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's5b-29', rollNo: '29', name: 'Disha Agarwal', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's5b-30', rollNo: '30', name: 'Girish Prabhu', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
  { id: 's5b-31', rollNo: '31', name: 'Juhi Khanna', avatar: '/assets/students/student-06-kavya.png', isSelected: true },
  { id: 's5b-32', rollNo: '32', name: 'Karan Mehra', avatar: '/assets/students/student-07-mohit.png', isSelected: true },
  { id: 's5b-33', rollNo: '33', name: 'Lavanya Reddy', avatar: '/assets/students/student-08-pooja.png', isSelected: true },
  { id: 's5b-34', rollNo: '34', name: 'Mayank Mittal', avatar: '/assets/students/student-01-aarav.png', isSelected: true },
  { id: 's5b-35', rollNo: '35', name: 'Nandini Swaminathan', avatar: '/assets/students/student-02-ananya.png', isSelected: true },
  { id: 's5b-36', rollNo: '36', name: 'Pankaj Vats', avatar: '/assets/students/student-03-arjun.png', isSelected: true },
  { id: 's5b-37', rollNo: '37', name: 'Richa Pathak', avatar: '/assets/students/student-04-diya.png', isSelected: true },
  { id: 's5b-38', rollNo: '38', name: 'Sameer Kothari', avatar: '/assets/students/student-05-ishaan.png', isSelected: true },
];

export function getStudentsForClass(className: string): HomeworkStudentItem[] {
  if (className.includes('5 - B') || className.includes('5-B')) {
    return STUDENTS_GRADE_5B.map((s) => ({ ...s }));
  }
  return STUDENTS_GRADE_5A.map((s) => ({ ...s }));
}

export function getAuthorizedClassesForStaff(staffId: string = 'T001'): StaffClassAssignment[] {
  return STAFF_ASSIGNMENTS[staffId] || STAFF_ASSIGNMENTS['T001'];
}

export function getAuthorizedSubjectsForClass(staffId: string = 'T001', className: string): string[] {
  const assignments = getAuthorizedClassesForStaff(staffId);
  const found = assignments.find((a) => a.className === className);
  return found ? found.subjects : ['Mathematics'];
}

// Seed Initial Homework Records if none exist
function getInitialHomeworkRecords(): HomeworkRecord[] {
  return [
    {
      id: 'hw-20261014-01',
      schoolId: 'greenwood-intl',
      schoolName: 'Greenwood International School',
      teacherId: 'T001',
      teacherName: 'Ms. Priya Sharma',
      grade: 'Grade 5 - A',
      subject: 'Mathematics',
      assignedDateStr: 'Tue, 14 Oct 2026',
      assignedDateKey: '2026-10-14',
      instructions: 'Complete exercises 4.1 to 4.3 from Chapter 4: Fractions and Decimals. Show all working steps neatly in the class notebook.',
      attachments: [],
      totalEligibleStudents: 42,
      assignedStudentIds: STUDENTS_GRADE_5A.map((s) => s.id),
      assignedStudentCount: 42,
      studentsSnapshot: STUDENTS_GRADE_5A.map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.name,
        avatar: s.avatar,
      })),
      createdAt: '2026-10-14T10:15:00.000Z',
      updatedAt: '2026-10-14T10:15:00.000Z',
    },
  ];
}

export function getStoredHomeworkRecords(): HomeworkRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialHomeworkRecords();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return getInitialHomeworkRecords();
  } catch (err) {
    console.error('Error reading homework records from storage:', err);
    return getInitialHomeworkRecords();
  }
}

export async function saveHomeworkRecord(
  data: Omit<HomeworkRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<HomeworkRecord> {
  // Simulate network latency / server processing
  await new Promise((resolve) => setTimeout(resolve, 350));

  // Server authorization validation
  const authorizedClasses = getAuthorizedClassesForStaff(data.teacherId);
  const targetClass = authorizedClasses.find((c) => c.className === data.grade);
  if (!targetClass) {
    throw new Error(`Unauthorized: Staff member ${data.teacherId} is not authorized for class ${data.grade}.`);
  }

  if (!targetClass.subjects.includes(data.subject)) {
    throw new Error(`Unauthorized: Staff member ${data.teacherId} is not authorized to assign ${data.subject} for ${data.grade}.`);
  }

  if (!data.instructions || data.instructions.trim().length === 0) {
    throw new Error('Homework instructions are required.');
  }

  if (data.instructions.length > 500) {
    throw new Error('Homework instructions cannot exceed 500 characters.');
  }

  if (!data.assignedStudentIds || data.assignedStudentIds.length === 0) {
    throw new Error('At least 1 student must be selected to assign homework.');
  }

  const now = getNow();
  const nowIso = getNowISO();
  const existing = getStoredHomeworkRecords();
  const existingIndex = data.id ? existing.findIndex((r) => r.id === data.id) : -1;

  const dueDateStr = data.dueDateStr || formatDueDateFromDateKey(data.assignedDateKey);
  const assignedOnDateStr = data.assignedOnDateStr || formatISTDateMedium(now);
  const assignedOnTimeStr = data.assignedOnTimeStr || formatISTTime12h(now);
  const assignedOnFormatted = data.assignedOnFormatted || formatISTDateTime(now);
  const teacherRole = data.teacherRole || 'Class Teacher';

  const newRecord: HomeworkRecord = {
    ...data,
    dueDateStr,
    assignedOnDateStr,
    assignedOnTimeStr,
    assignedOnFormatted,
    teacherRole,
    id: data.id || `hw-${now.getTime()}-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: existingIndex >= 0 ? existing[existingIndex].createdAt : nowIso,
    updatedAt: nowIso,
  };

  let updated: HomeworkRecord[];
  if (existingIndex >= 0) {
    updated = [...existing];
    updated[existingIndex] = newRecord;
  } else {
    updated = [newRecord, ...existing];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist homework record to storage:', err);
    throw new Error('Storage limit exceeded or file data too large. Please remove some attachments and try again.');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offsleek_homework_updated', { detail: newRecord }));
  }

  return newRecord;
}

export function updateHomeworkRecord(
  id: string,
  updates: Partial<Omit<HomeworkRecord, 'id' | 'createdAt'>>
): HomeworkRecord {
  const existing = getStoredHomeworkRecords();
  const index = existing.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error(`Homework record ${id} not found.`);
  }
  const nowIso = getNowISO();
  const updatedRecord: HomeworkRecord = {
    ...existing[index],
    ...updates,
    id: existing[index].id,
    createdAt: existing[index].createdAt,
    updatedAt: nowIso,
  };
  existing[index] = updatedRecord;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return updatedRecord;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtensionType(fileName: string): 'pdf' | 'jpg' | 'png' | 'doc' | 'docx' | 'generic' {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  if (ext === 'png') return 'png';
  if (ext === 'doc') return 'doc';
  if (ext === 'docx') return 'docx';
  return 'generic';
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
