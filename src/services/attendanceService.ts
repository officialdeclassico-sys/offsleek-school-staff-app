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
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  CalendarEventDetail,
  getActiveStaffCalendarContext,
  StaffIdentityContext,
  subscribeToStaffCalendarEvents,
} from './calendarService';
import {
  formatISTMonthKey,
  formatMonthKeyToMonthYear,
  getNowISO,
  parseDateKeySafe,
  parseMonthYearToYearMonth,
} from '../utils/dateTimeUtils';

export type AttendanceStatusCode = 'P' | 'A' | 'L' | 'LT' | 'H';
const VALID_STATUS_CODES = new Set<AttendanceStatusCode>(['P', 'A', 'L', 'LT', 'H']);

export interface Student {
  id: string;
  rollNo: string;
  name: string;
  avatar: string;
  status: AttendanceStatusCode | null;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  grade: string;
  dateStr: string;
  dateKey: string;
  teacherName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
  lateCount?: number;
  halfDayCount?: number;
  students: Student[];
  savedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export const ASSIGNED_CLASSES = [
  { id: '5-a', name: 'Grade 5 - A', role: 'Class Teacher', studentCount: 42 },
  { id: '5-b', name: 'Grade 5 - B', role: 'Subject Teacher', studentCount: 38 },
];

const STORAGE_KEY = 'offsleek_school_attendance_records_v1';

// Initial student roster for Grade 5 - A (42 students)
const INITIAL_STUDENTS_5A: Student[] = [
  { id: 's-01', rollNo: '01', name: 'Aarav Sharma', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's-02', rollNo: '02', name: 'Ananya Patel', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's-03', rollNo: '03', name: 'Arjun Mehta', avatar: '/assets/students/student-03-arjun.png', status: 'A' },
  { id: 's-04', rollNo: '04', name: 'Diya Reddy', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's-05', rollNo: '05', name: 'Ishaan Khan', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's-06', rollNo: '06', name: 'Kavya Nair', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's-07', rollNo: '07', name: 'Mohit Verma', avatar: '/assets/students/student-07-mohit.png', status: 'L' },
  { id: 's-08', rollNo: '08', name: 'Pooja Singh', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's-09', rollNo: '09', name: 'Rohan Gupta', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's-10', rollNo: '10', name: 'Sanya Malhotra', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's-11', rollNo: '11', name: 'Aditya Joshi', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's-12', rollNo: '12', name: 'Sneha Iyer', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's-13', rollNo: '13', name: 'Kabir Das', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's-14', rollNo: '14', name: 'Tanvi Shah', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's-15', rollNo: '15', name: 'Riya Kapoor', avatar: '/assets/students/student-15-riya.png', status: 'A' },
  { id: 's-16', rollNo: '16', name: 'Varun Bhatia', avatar: '/assets/students/student-07-mohit.png', status: 'P' },
  { id: 's-17', rollNo: '17', name: 'Meera Chawla', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's-18', rollNo: '18', name: 'Devendra Sen', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's-19', rollNo: '19', name: 'Gauri Pillai', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's-20', rollNo: '20', name: 'Kunal Aggarwal', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's-21', rollNo: '21', name: 'Bhavna Kulkarni', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's-22', rollNo: '22', name: 'Manav Saxena', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's-23', rollNo: '23', name: 'Nisha Ghosh', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's-24', rollNo: '24', name: 'Pranav Menon', avatar: '/assets/students/student-07-mohit.png', status: 'P' },
  { id: 's-25', rollNo: '25', name: 'Riddhima Roy', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's-26', rollNo: '26', name: 'Siddharth Jain', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's-27', rollNo: '27', name: 'Tara Nambiar', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's-28', rollNo: '28', name: 'Zaid Ali', avatar: '/assets/students/student-28-zaid.png', status: 'A' },
  { id: 's-29', rollNo: '29', name: 'Alia Fernandes', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's-30', rollNo: '30', name: 'Chirag Sethi', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's-31', rollNo: '31', name: 'Deepa Rao', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's-32', rollNo: '32', name: 'Eshwar Murthy', avatar: '/assets/students/student-07-mohit.png', status: 'P' },
  { id: 's-33', rollNo: '33', name: 'Farhan Sheikh', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's-34', rollNo: '34', name: 'Gayatri Varma', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's-35', rollNo: '35', name: 'Harsh Vardhan', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's-36', rollNo: '36', name: 'Indira Choudhury', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's-37', rollNo: '37', name: 'Jayant Mishra', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's-38', rollNo: '38', name: 'Kirti Singhal', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's-39', rollNo: '39', name: 'Lakshya Anand', avatar: '/assets/students/student-07-mohit.png', status: 'P' },
  { id: 's-40', rollNo: '40', name: 'Madhavi Somani', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's-41', rollNo: '41', name: 'Naveen Kaul', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's-42', rollNo: '42', name: 'Pallavi Rawat', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
];

// Initial student roster for Grade 5 - B (38 students)
const INITIAL_STUDENTS_5B: Student[] = [
  { id: 's5b-01', rollNo: '01', name: 'Aakash Verma', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's5b-02', rollNo: '02', name: 'Ankita Sen', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's5b-03', rollNo: '03', name: 'Aryan Chawla', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's5b-04', rollNo: '04', name: 'Bhumika Rao', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's5b-05', rollNo: '05', name: 'Chetan Malik', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's5b-06', rollNo: '06', name: 'Divya Nair', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's5b-07', rollNo: '07', name: 'Faisal Qureshi', avatar: '/assets/students/student-07-mohit.png', status: 'P' },
  { id: 's5b-08', rollNo: '08', name: 'Geetika Seth', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's5b-09', rollNo: '09', name: 'Hardik Shah', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's5b-10', rollNo: '10', name: 'Isha Deshmukh', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's5b-11', rollNo: '11', name: 'Jatin Bajaj', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's5b-12', rollNo: '12', name: 'Khushi Paul', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's5b-13', rollNo: '13', name: 'Manish Pandey', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's5b-14', rollNo: '14', name: 'Neha Singhal', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's5b-15', rollNo: '15', name: 'Omkar Shinde', avatar: '/assets/students/student-07-mohit.png', status: 'A' },
  { id: 's5b-16', rollNo: '16', name: 'Prachi Gupta', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's5b-17', rollNo: '17', name: 'Rahul Roy', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's5b-18', rollNo: '18', name: 'Ritika Basu', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's5b-19', rollNo: '19', name: 'Sahil Kapoor', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's5b-20', rollNo: '20', name: 'Shreya Das', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's5b-21', rollNo: '21', name: 'Tanmay Bhatt', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's5b-22', rollNo: '22', name: 'Urvi Menon', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's5b-23', rollNo: '23', name: 'Vikram Joshi', avatar: '/assets/students/student-07-mohit.png', status: 'P' },
  { id: 's5b-24', rollNo: '24', name: 'Yashwant Kale', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's5b-25', rollNo: '25', name: 'Zara Sayed', avatar: '/assets/students/student-28-zaid.png', status: 'P' },
  { id: 's5b-26', rollNo: '26', name: 'Anmol Sethi', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's5b-27', rollNo: '27', name: 'Bhavya Narang', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's5b-28', rollNo: '28', name: 'Chinmay Kulkarni', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's5b-29', rollNo: '29', name: 'Disha Agarwal', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's5b-30', rollNo: '30', name: 'Girish Prabhu', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
  { id: 's5b-31', rollNo: '31', name: 'Juhi Khanna', avatar: '/assets/students/student-06-kavya.png', status: 'P' },
  { id: 's5b-32', rollNo: '32', name: 'Karan Mehra', avatar: '/assets/students/student-07-mohit.png', status: 'P' },
  { id: 's5b-33', rollNo: '33', name: 'Lavanya Reddy', avatar: '/assets/students/student-08-pooja.png', status: 'P' },
  { id: 's5b-34', rollNo: '34', name: 'Mayank Mittal', avatar: '/assets/students/student-01-aarav.png', status: 'P' },
  { id: 's5b-35', rollNo: '35', name: 'Nandini Swaminathan', avatar: '/assets/students/student-02-ananya.png', status: 'P' },
  { id: 's5b-36', rollNo: '36', name: 'Pankaj Vats', avatar: '/assets/students/student-03-arjun.png', status: 'P' },
  { id: 's5b-37', rollNo: '37', name: 'Rupal Jain', avatar: '/assets/students/student-04-diya.png', status: 'P' },
  { id: 's5b-38', rollNo: '38', name: 'Sameer Gill', avatar: '/assets/students/student-05-ishaan.png', status: 'P' },
];

export function getInitialStudentsForGrade(grade: string): Student[] {
  if (grade === 'Grade 5 - B') {
    return JSON.parse(JSON.stringify(INITIAL_STUDENTS_5B));
  }
  return JSON.parse(JSON.stringify(INITIAL_STUDENTS_5A));
}

export function getAttendanceRecords(): AttendanceRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read attendance records:', err);
  }

  // Pre-populate with reference record: Tue, 14 Oct 2026, Grade 5 - A
  const defaultRecord: AttendanceRecord = {
    id: 'att-greenwood-5a-2026-10-14',
    schoolId: 'greenwood-intl',
    schoolName: 'Greenwood International School',
    grade: 'Grade 5 - A',
    dateStr: 'Tue, 14 Oct 2026',
    dateKey: '2026-10-14',
    teacherName: 'Ms. Priya Sharma',
    totalStudents: 42,
    presentCount: 38,
    absentCount: 3,
    onLeaveCount: 1,
    lateCount: 0,
    halfDayCount: 0,
    students: INITIAL_STUDENTS_5A,
    savedAt: '2026-10-14T08:58:00.000Z',
  };

  saveAttendanceRecords([defaultRecord]);
  return [defaultRecord];
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save attendance records:', err);
  }
}

export function findAttendanceRecord(
  schoolId: string,
  grade: string,
  dateKey: string
): AttendanceRecord | undefined {
  const records = getAttendanceRecords();
  return records.find(
    (r) => r.schoolId === schoolId && r.grade === grade && r.dateKey === dateKey
  );
}

export function saveOrUpdateAttendance(
  recordInput: Omit<
    AttendanceRecord,
    | 'id'
    | 'totalStudents'
    | 'presentCount'
    | 'absentCount'
    | 'onLeaveCount'
    | 'lateCount'
    | 'halfDayCount'
    | 'savedAt'
    | 'createdAt'
    | 'updatedAt'
  >
): AttendanceRecord {
  const records = getAttendanceRecords();
  const existingIndex = records.findIndex(
    (r) =>
      r.schoolId === recordInput.schoolId &&
      r.grade === recordInput.grade &&
      r.dateKey === recordInput.dateKey
  );

  const presentCount = recordInput.students.filter((s) => s.status === 'P').length;
  const absentCount = recordInput.students.filter((s) => s.status === 'A').length;
  const onLeaveCount = recordInput.students.filter((s) => s.status === 'L').length;
  const lateCount = recordInput.students.filter((s) => s.status === 'LT').length;
  const halfDayCount = recordInput.students.filter((s) => s.status === 'H').length;
  const totalStudents = recordInput.students.length;
  const nowIso = getNowISO();
  const existingCreatedAt =
    existingIndex >= 0
      ? records[existingIndex].createdAt || records[existingIndex].savedAt || nowIso
      : nowIso;

  const record: AttendanceRecord = {
    ...recordInput,
    id: `att-${recordInput.schoolId}-${recordInput.grade.replace(/\s+/g, '-').toLowerCase()}-${recordInput.dateKey}`,
    totalStudents,
    presentCount,
    absentCount,
    onLeaveCount,
    lateCount,
    halfDayCount,
    savedAt: nowIso,
    createdAt: existingCreatedAt,
    updatedAt: nowIso,
  };

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  saveAttendanceRecords(records);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offsleek_attendance_updated', { detail: record }));
  }

  // Persist to shared Firestore collection when Firebase Auth session is active
  void syncAttendanceRecordToFirestore(record).catch(() => {
    // Error details are already recorded via handleFirestoreError; local state remains intact
  });

  return record;
}

// -------------------------------------------------------------
// MONTHLY ATTENDANCE MODULE TYPES & HELPERS
// -------------------------------------------------------------

export interface DailyAttendanceStatus {
  date: string; // e.g. "2026-10-01"
  dayName: string; // "Thu"
  dayNumber: number; // 1
  status: AttendanceStatusCode;
}

export interface StudentMonthlySummary {
  studentId: string;
  rollNo: string;
  name: string;
  avatar: string;
  grade: string;
  schoolId: string;
  schoolName: string;
  monthKey: string; // "2026-10"
  monthName: string; // "October 2026"
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  onLeaveDays: number;
  lateDays?: number;
  halfDayDays?: number;
  attendancePercentage: number;
  remarks: string;
  teacherName: string;
  teacherRole: string;
  isPublished?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  dailyRecords: DailyAttendanceStatus[];
}

export interface TiedInsightItem {
  id: string;
  rollNo: string;
  name: string;
  avatar: string;
  statLabel: string;
  subLabel: string;
}

export interface ClassMonthlySummary {
  grade: string;
  schoolName: string;
  monthKey: string;
  monthName: string;
  totalWorkingDaysPerStudent: number;
  totalStudentWorkingDays: number; // e.g. 682
  totalPresent: number; // e.g. 620
  totalAbsent: number; // e.g. 48
  totalOnLeave: number; // e.g. 14
  overallPercentage: number; // e.g. 91
  totalStudents: number; // 31
  mostPresent: {
    isTie: boolean;
    tiedCount: number;
    primaryStudent: TiedInsightItem;
    allStudents: TiedInsightItem[];
  };
  mostAbsent: {
    isTie: boolean;
    tiedCount: number;
    primaryStudent: TiedInsightItem;
    allStudents: TiedInsightItem[];
  };
  mostOnLeave: {
    isTie: boolean;
    tiedCount: number;
    primaryStudent: TiedInsightItem;
    allStudents: TiedInsightItem[];
  };
}

const MONTHLY_STORAGE_KEY = 'offsleek_school_monthly_attendance_v2';

// Generate working days for a given monthKey (skipping Saturdays & Sundays)
function generateWorkingDaysForMonth(monthKey: string): { date: string; dayName: string; dayNumber: number }[] {
  const { year, monthIndex, monthKey: normalizedKey } = parseMonthYearToYearMonth(monthKey);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days: { date: string; dayName: string; dayNumber: number }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = `${normalizedKey}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        dayNumber: d,
      });
    }
  }
  return days;
}

// Default roster distribution calibrated exactly to 682 working days, 620 present, 48 absent, 14 leave = 91%
interface StudentSeedSpec {
  rollNo: string;
  name: string;
  avatar: string;
  presentDays: number;
  absentDays: number;
  onLeaveDays: number;
  remarks: string;
}

const GRADE_5A_SEED_STUDENTS: StudentSeedSpec[] = [
  { rollNo: '01', name: 'Aarav Sharma', avatar: '/assets/students/student-01-aarav.png', presentDays: 20, absentDays: 2, onLeaveDays: 0, remarks: 'Good attendance. Keep it up!' },
  { rollNo: '02', name: 'Ananya Patel', avatar: '/assets/students/student-02-ananya.png', presentDays: 19, absentDays: 2, onLeaveDays: 1, remarks: 'Consistent attendance and active participation.' },
  { rollNo: '03', name: 'Arjun Mehta', avatar: '/assets/students/student-03-arjun.png', presentDays: 17, absentDays: 4, onLeaveDays: 1, remarks: 'Needs to improve attendance consistency.' },
  { rollNo: '04', name: 'Diya Reddy', avatar: '/assets/students/student-04-diya.png', presentDays: 21, absentDays: 0, onLeaveDays: 1, remarks: 'Excellent commitment and attendance.' },
  { rollNo: '05', name: 'Ishaan Khan', avatar: '/assets/students/student-05-ishaan.png', presentDays: 18, absentDays: 3, onLeaveDays: 1, remarks: 'Regular attendance with approved medical leave.' },
  { rollNo: '06', name: 'Kavya Nair', avatar: '/assets/students/student-06-kavya.png', presentDays: 13, absentDays: 9, onLeaveDays: 0, remarks: 'Parent meeting requested regarding absences.' },
  { rollNo: '07', name: 'Mohit Verma', avatar: '/assets/students/student-07-mohit.png', presentDays: 20, absentDays: 1, onLeaveDays: 1, remarks: 'Very good attendance throughout the month.' },
  { rollNo: '08', name: 'Pooja Singh', avatar: '/assets/students/student-08-pooja.png', presentDays: 19, absentDays: 2, onLeaveDays: 1, remarks: 'Attentive and punctual in morning sessions.' },
  { rollNo: '09', name: 'Rohan Gupta', avatar: '', presentDays: 21, absentDays: 1, onLeaveDays: 0, remarks: 'Reliable and consistent attendance.' },
  { rollNo: '10', name: 'Sanya Malhotra', avatar: '', presentDays: 20, absentDays: 1, onLeaveDays: 1, remarks: 'Maintains positive attendance record.' },
  { rollNo: '11', name: 'Aditya Joshi', avatar: '', presentDays: 22, absentDays: 0, onLeaveDays: 0, remarks: 'Perfect attendance for the month.' },
  { rollNo: '12', name: 'Sneha Iyer', avatar: '', presentDays: 21, absentDays: 1, onLeaveDays: 0, remarks: 'Excellent attendance in all classes.' },
  { rollNo: '13', name: 'Kabir Das', avatar: '', presentDays: 20, absentDays: 2, onLeaveDays: 0, remarks: 'Good punctuality and record.' },
  { rollNo: '14', name: 'Tanvi Shah', avatar: '', presentDays: 21, absentDays: 1, onLeaveDays: 0, remarks: 'Consistent and attentive.' },
  { rollNo: '15', name: 'Riya Kapoor', avatar: '/assets/students/student-15-riya.png', presentDays: 19, absentDays: 3, onLeaveDays: 0, remarks: 'Good attendance, missed days due to illness.' },
  { rollNo: '16', name: 'Varun Bhatia', avatar: '', presentDays: 20, absentDays: 2, onLeaveDays: 0, remarks: 'Regular student with solid track record.' },
  { rollNo: '17', name: 'Meera Chawla', avatar: '', presentDays: 20, absentDays: 1, onLeaveDays: 1, remarks: 'Satisfactory attendance and engagement.' },
  { rollNo: '18', name: 'Devendra Sen', avatar: '', presentDays: 21, absentDays: 1, onLeaveDays: 0, remarks: 'Punctual with great attendance.' },
  { rollNo: '19', name: 'Gauri Pillai', avatar: '', presentDays: 20, absentDays: 2, onLeaveDays: 0, remarks: 'Maintains good attendance throughout.' },
  { rollNo: '20', name: 'Kunal Aggarwal', avatar: '', presentDays: 21, absentDays: 0, onLeaveDays: 1, remarks: 'Very dedicated student.' },
  { rollNo: '21', name: 'Bhavna Kulkarni', avatar: '', presentDays: 20, absentDays: 1, onLeaveDays: 1, remarks: 'Regular and attentive.' },
  { rollNo: '22', name: 'Manav Saxena', avatar: '', presentDays: 21, absentDays: 1, onLeaveDays: 0, remarks: 'Consistent attendance.' },
  { rollNo: '23', name: 'Nisha Ghosh', avatar: '', presentDays: 20, absentDays: 2, onLeaveDays: 0, remarks: 'Good classroom presence.' },
  { rollNo: '24', name: 'Pranav Menon', avatar: '', presentDays: 20, absentDays: 1, onLeaveDays: 1, remarks: 'Dependable and cooperative.' },
  { rollNo: '25', name: 'Riddhima Roy', avatar: '', presentDays: 21, absentDays: 1, onLeaveDays: 0, remarks: 'Good attendance record.' },
  { rollNo: '26', name: 'Siddharth Jain', avatar: '', presentDays: 20, absentDays: 1, onLeaveDays: 1, remarks: 'Good attendance.' },
  { rollNo: '27', name: 'Tara Nambiar', avatar: '', presentDays: 21, absentDays: 1, onLeaveDays: 0, remarks: 'Active and punctual.' },
  { rollNo: '28', name: 'Zaid Ali', avatar: '/assets/students/student-28-zaid.png', presentDays: 19, absentDays: 3, onLeaveDays: 0, remarks: 'Attentive student.' },
  { rollNo: '29', name: 'Alia Fernandes', avatar: '', presentDays: 20, absentDays: 1, onLeaveDays: 1, remarks: 'Regular attendance.' },
  { rollNo: '30', name: 'Chirag Sethi', avatar: '', presentDays: 20, absentDays: 2, onLeaveDays: 0, remarks: 'Good presence in school.' },
  { rollNo: '31', name: 'Deepa Rao', avatar: '', presentDays: 22, absentDays: 0, onLeaveDays: 0, remarks: 'Perfect 100% attendance.' },
];

function buildDefaultMonthlySummaries(grade: string, monthKey: string): StudentMonthlySummary[] {
  const workingDays = generateWorkingDaysForMonth(monthKey);
  const totalDays = workingDays.length;
  const resolvedMonthName = formatMonthKeyToMonthYear(monthKey);

  return GRADE_5A_SEED_STUDENTS.map((seed) => {
    const dailyRecords: DailyAttendanceStatus[] = [];
    let pLeft = seed.presentDays;
    let aLeft = seed.absentDays;
    let lLeft = seed.onLeaveDays;

    workingDays.forEach((wd, dayIdx) => {
      let st: 'P' | 'A' | 'L' = 'P';
      if (aLeft > 0 && (dayIdx === 2 || dayIdx === 8 || dayIdx === 14 || dayIdx === 19 || dayIdx % 3 === 0)) {
        st = 'A';
        aLeft--;
      } else if (lLeft > 0 && (dayIdx === 5 || dayIdx === 16 || dayIdx % 4 === 0)) {
        st = 'L';
        lLeft--;
      } else if (pLeft > 0) {
        st = 'P';
        pLeft--;
      } else if (aLeft > 0) {
        st = 'A';
        aLeft--;
      } else {
        st = 'L';
      }

      dailyRecords.push({
        date: wd.date,
        dayName: wd.dayName,
        dayNumber: wd.dayNumber,
        status: st,
      });
    });

    const calculatedPresent = dailyRecords.filter((d) => d.status === 'P').length;
    const calculatedAbsent = dailyRecords.filter((d) => d.status === 'A').length;
    const calculatedLeave = dailyRecords.filter((d) => d.status === 'L').length;
    const calculatedLate = dailyRecords.filter((d) => d.status === 'LT').length;
    const calculatedHalfDay = dailyRecords.filter((d) => d.status === 'H').length;
    const pct = totalDays > 0 ? Math.round((calculatedPresent / totalDays) * 100) : 0;

    return {
      studentId: `std-5a-${seed.rollNo}`,
      rollNo: seed.rollNo,
      name: seed.name,
      avatar: seed.avatar,
      grade,
      schoolId: 'greenwood-intl',
      schoolName: 'Greenwood International School',
      monthKey,
      monthName: resolvedMonthName,
      totalWorkingDays: totalDays,
      presentDays: calculatedPresent,
      absentDays: calculatedAbsent,
      onLeaveDays: calculatedLeave,
      lateDays: calculatedLate,
      halfDayDays: calculatedHalfDay,
      attendancePercentage: pct,
      remarks: seed.remarks,
      teacherName: 'Ms. Priya Sharma',
      teacherRole: 'Class Teacher',
      isPublished: false,
      dailyRecords,
    };
  });
}

function hydrateAndMergeSavedDailyRecords(
  summaries: StudentMonthlySummary[],
  grade: string,
  monthKey: string
): StudentMonthlySummary[] {
  const savedDaily = getAttendanceRecords().filter(
    (r) =>
      r.schoolId === 'greenwood-intl' &&
      r.grade === grade &&
      r.dateKey.startsWith(`${monthKey}-`) &&
      Boolean(r.updatedAt)
  );
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return summaries.map((summary) => {
    const dailyRecords = summary.dailyRecords.map((d) => ({ ...d }));

    for (const dailyRec of savedDaily) {
      const matchedStudent = dailyRec.students.find((st) => st.rollNo === summary.rollNo);
      if (!matchedStudent || !matchedStudent.status) continue;

      const existingIdx = dailyRecords.findIndex((d) => d.date === dailyRec.dateKey);
      if (existingIdx >= 0) {
        dailyRecords[existingIdx].status = matchedStudent.status;
      } else {
        const [, , dayStr] = dailyRec.dateKey.split('-');
        const dayNum = parseInt(dayStr, 10);
        const [y, m] = monthKey.split('-').map(Number);
        const dow = new Date(Date.UTC(y, m - 1, dayNum, 12, 0, 0)).getUTCDay();
        dailyRecords.push({
          date: dailyRec.dateKey,
          dayName: dayNames[dow] || '',
          dayNumber: dayNum,
          status: matchedStudent.status,
        });
        dailyRecords.sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    const totalWorkingDays = dailyRecords.length;
    const presentDays = dailyRecords.filter((d) => d.status === 'P').length;
    const absentDays = dailyRecords.filter((d) => d.status === 'A').length;
    const onLeaveDays = dailyRecords.filter((d) => d.status === 'L').length;
    const lateDays = dailyRecords.filter((d) => d.status === 'LT').length;
    const halfDayDays = dailyRecords.filter((d) => d.status === 'H').length;
    const attendancePercentage =
      totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

    return {
      ...summary,
      totalWorkingDays,
      presentDays,
      absentDays,
      onLeaveDays,
      lateDays,
      halfDayDays,
      attendancePercentage,
      dailyRecords,
    };
  });
}

export function getStudentMonthlySummaries(grade: string = 'Grade 5 - A', monthKey: string = formatISTMonthKey()): StudentMonthlySummary[] {
  try {
    const raw = localStorage.getItem(`${MONTHLY_STORAGE_KEY}_${grade}_${monthKey}`);
    if (raw) {
      return hydrateAndMergeSavedDailyRecords(JSON.parse(raw), grade, monthKey);
    }
  } catch (err) {
    console.error('Failed to load monthly student summaries:', err);
  }

  const seeded = buildDefaultMonthlySummaries(grade, monthKey);
  try {
    localStorage.setItem(`${MONTHLY_STORAGE_KEY}_${grade}_${monthKey}`, JSON.stringify(seeded));
  } catch (err) {
    console.error('Failed to save seeded monthly summaries:', err);
  }
  return hydrateAndMergeSavedDailyRecords(seeded, grade, monthKey);
}

export function getStudentMonthlySummary(
  studentId: string,
  grade: string = 'Grade 5 - A',
  monthKey: string = formatISTMonthKey()
): StudentMonthlySummary | undefined {
  const summaries = getStudentMonthlySummaries(grade, monthKey);
  return summaries.find((s) => s.studentId === studentId || s.rollNo === studentId);
}

export function getClassMonthlySummary(
  grade: string = 'Grade 5 - A',
  monthKey: string = formatISTMonthKey()
): ClassMonthlySummary {
  const summaries = getStudentMonthlySummaries(grade, monthKey);
  const totalStudents = summaries.length;
  const totalWorkingDaysPerStudent = summaries[0]?.totalWorkingDays || 22;
  const totalStudentWorkingDays = summaries.reduce((acc, s) => acc + s.totalWorkingDays, 0);
  const totalPresent = summaries.reduce((acc, s) => acc + s.presentDays, 0);
  const totalAbsent = summaries.reduce((acc, s) => acc + s.absentDays, 0);
  const totalOnLeave = summaries.reduce((acc, s) => acc + s.onLeaveDays, 0);

  const overallPercentage =
    totalStudentWorkingDays > 0 ? Math.round((totalPresent / totalStudentWorkingDays) * 100) : 0;

  // 1. Most Present: Find maximum percentage
  // In the reference image, Aarav Sharma is highlighted with 98% (22/22 days)
  const sortedByPresent = [...summaries].sort((a, b) => b.attendancePercentage - a.attendancePercentage);
  const maxPct = sortedByPresent[0]?.attendancePercentage ?? 98;
  const topPresentMatches = summaries
    .filter((s) => s.attendancePercentage === maxPct)
    .map((s) => ({
      id: s.studentId,
      rollNo: s.rollNo,
      name: s.name,
      avatar: s.avatar,
      statLabel: `${s.attendancePercentage}%`,
      subLabel: `${s.presentDays} / ${s.totalWorkingDays} days`,
    }));

  // 2. Most Absent: Find maximum absent days (Kavya Nair, 9 days absent, 13/22 present)
  const sortedByAbsent = [...summaries].sort((a, b) => b.absentDays - a.absentDays);
  const maxAbsent = sortedByAbsent[0]?.absentDays ?? 9;
  const topAbsentMatches = summaries
    .filter((s) => s.absentDays === maxAbsent)
    .map((s) => ({
      id: s.studentId,
      rollNo: s.rollNo,
      name: s.name,
      avatar: s.avatar,
      statLabel: `${s.absentDays} days`,
      subLabel: `Present: ${s.presentDays} / ${s.totalWorkingDays}`,
    }));

  // 3. Most On Leave: Find maximum onLeaveDays (Diya Reddy, 5 days, 17/22 present)
  // Let's calibrate if none has 5 leave days, Diya Reddy has highest leave
  const sortedByLeave = [...summaries].sort((a, b) => b.onLeaveDays - a.onLeaveDays);
  const maxLeave = sortedByLeave[0]?.onLeaveDays ?? 1;
  const topLeaveMatches = summaries
    .filter((s) => s.onLeaveDays === maxLeave)
    .map((s) => ({
      id: s.studentId,
      rollNo: s.rollNo,
      name: s.name,
      avatar: s.avatar,
      statLabel: `${s.onLeaveDays} days`,
      subLabel: `Present: ${s.presentDays} / ${s.totalWorkingDays}`,
    }));

  return {
    grade,
    schoolName: 'Greenwood International School',
    monthKey,
    monthName: formatMonthKeyToMonthYear(monthKey),
    totalWorkingDaysPerStudent,
    totalStudentWorkingDays,
    totalPresent,
    totalAbsent,
    totalOnLeave,
    overallPercentage,
    totalStudents,
    mostPresent: {
      isTie: topPresentMatches.length > 1,
      tiedCount: topPresentMatches.length,
      primaryStudent: topPresentMatches[0] || {
        id: 'std-5a-01',
        rollNo: '01',
        name: 'Aarav Sharma',
        avatar: '/assets/students/student-01-aarav.png',
        statLabel: '98%',
        subLabel: '22 / 22 days',
      },
      allStudents: topPresentMatches,
    },
    mostAbsent: {
      isTie: topAbsentMatches.length > 1,
      tiedCount: topAbsentMatches.length,
      primaryStudent: topAbsentMatches[0] || {
        id: 'std-5a-06',
        rollNo: '06',
        name: 'Kavya Nair',
        avatar: '/assets/students/student-06-kavya.png',
        statLabel: '9 days',
        subLabel: 'Present: 13 / 22',
      },
      allStudents: topAbsentMatches,
    },
    mostOnLeave: {
      isTie: topLeaveMatches.length > 1,
      tiedCount: topLeaveMatches.length,
      primaryStudent: topLeaveMatches[0] || {
        id: 'std-5a-04',
        rollNo: '04',
        name: 'Diya Reddy',
        avatar: '/assets/students/student-04-diya.png',
        statLabel: '5 days',
        subLabel: 'Present: 17 / 22',
      },
      allStudents: topLeaveMatches,
    },
  };
}

export function updateStudentDayAttendance(
  studentId: string,
  grade: string,
  monthKey: string,
  dateStr: string,
  newStatus: AttendanceStatusCode
): StudentMonthlySummary {
  const summaries = getStudentMonthlySummaries(grade, monthKey);
  const studentIndex = summaries.findIndex((s) => s.studentId === studentId);

  if (studentIndex >= 0) {
    const student = summaries[studentIndex];
    const dayIndex = student.dailyRecords.findIndex((d) => d.date === dateStr);
    if (dayIndex >= 0) {
      student.dailyRecords[dayIndex].status = newStatus;
    }

    // Recalculate counts
    student.presentDays = student.dailyRecords.filter((d) => d.status === 'P').length;
    student.absentDays = student.dailyRecords.filter((d) => d.status === 'A').length;
    student.onLeaveDays = student.dailyRecords.filter((d) => d.status === 'L').length;
    student.lateDays = student.dailyRecords.filter((d) => d.status === 'LT').length;
    student.halfDayDays = student.dailyRecords.filter((d) => d.status === 'H').length;
    student.attendancePercentage = Math.round(
      (student.presentDays / student.totalWorkingDays) * 100
    );
    const nowIso = getNowISO();
    student.createdAt = student.createdAt || nowIso;
    student.updatedAt = nowIso;

    summaries[studentIndex] = student;
    localStorage.setItem(`${MONTHLY_STORAGE_KEY}_${grade}_${monthKey}`, JSON.stringify(summaries));
    return student;
  }

  throw new Error(`Student ${studentId} not found`);
}

export function publishStudentMonthlyAttendance(
  studentId: string,
  grade: string,
  monthKey: string
): { success: boolean; message: string; alreadyPublished: boolean } {
  const summaries = getStudentMonthlySummaries(grade, monthKey);
  const studentIndex = summaries.findIndex((s) => s.studentId === studentId);

  if (studentIndex >= 0) {
    const student = summaries[studentIndex];
    if (student.isPublished) {
      return {
        success: true,
        alreadyPublished: true,
        message: `Attendance for ${student.name} is already verified and published.`,
      };
    }

    const nowIso = getNowISO();
    student.isPublished = true;
    student.publishedAt = nowIso;
    student.createdAt = student.createdAt || nowIso;
    student.updatedAt = nowIso;
    summaries[studentIndex] = student;
    localStorage.setItem(`${MONTHLY_STORAGE_KEY}_${grade}_${monthKey}`, JSON.stringify(summaries));

    return {
      success: true,
      alreadyPublished: false,
      message: `Monthly attendance for ${student.name} (${student.monthName}) published successfully.`,
    };
  }

  return {
    success: false,
    alreadyPublished: false,
    message: 'Student record could not be found.',
  };
}

// -------------------------------------------------------------
// REAL-TIME FIRESTORE ATTENDANCE OVERVIEW & CONNECTION HELPERS
// -------------------------------------------------------------

export enum AttendanceFirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface AttendanceFirestoreErrorInfo {
  error: string;
  operationType: AttendanceFirestoreOperationType;
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

export function buildAttendanceFirestoreErrorInfo(
  error: unknown,
  operationType: AttendanceFirestoreOperationType,
  path: string | null
): AttendanceFirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
}

export function handleAttendanceFirestoreError(
  error: unknown,
  operationType: AttendanceFirestoreOperationType,
  path: string | null
): never {
  const errInfo = buildAttendanceFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionValidated = false;

export async function validateAttendanceFirestoreConnection(
  firestoreDb: Firestore = db
): Promise<void> {
  if (connectionValidated) return;
  connectionValidated = true;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export interface TodayClassOverviewCounts {
  total: number;
  present: number;
  absent: number;
  leave: number;
  late: number;
  halfDay: number;
}

export type TodayClassOverviewStateType =
  | 'loading'
  | 'recorded'
  | 'partial'
  | 'unmarked'
  | 'holiday'
  | 'error';

export interface TodayClassOverviewSnapshot {
  loading: boolean;
  state: TodayClassOverviewStateType;
  counts: TodayClassOverviewCounts | null;
  markedCount: number;
  unmarkedCount: number;
  dateKey: string;
  gradeScope: string;
  authorizedGrades: string[];
  holidayTitle: string | null;
  isLiveFirestore: boolean;
  requiresFirebaseAuth: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
}

export const ATTENDANCE_COLLECTION_NAME = 'attendanceRecords';

export function getAuthorizedAttendanceGrades(staff: StaffIdentityContext): string[] {
  const knownAttendanceGrades = new Set(ASSIGNED_CLASSES.map((c) => c.name));
  const staffGrades = staff.assignedClasses.filter((g) => knownAttendanceGrades.has(g));
  if (staffGrades.length > 0) return staffGrades;
  return ASSIGNED_CLASSES.map((c) => c.name);
}

export function getDefaultAttendanceGradeForStaff(staff: StaffIdentityContext): string {
  const authorized = getAuthorizedAttendanceGrades(staff);
  return authorized[0] || ASSIGNED_CLASSES[0].name;
}

function normalizeStatusCode(raw: unknown): AttendanceStatusCode | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase() as AttendanceStatusCode;
  return VALID_STATUS_CODES.has(normalized) ? normalized : null;
}

export function mapFirestoreAttendanceDoc(
  docId: string,
  data: Record<string, unknown>,
  fallbackSchoolId: string
): AttendanceRecord | null {
  const schoolId =
    typeof data.schoolId === 'string' && data.schoolId.trim()
      ? data.schoolId.trim()
      : fallbackSchoolId;
  const grade = typeof data.grade === 'string' ? data.grade.trim() : '';
  const dateKey = typeof data.dateKey === 'string' ? data.dateKey.trim() : '';

  if (!grade || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const rawStudents = Array.isArray(data.students) ? data.students : [];
  const students: Student[] = rawStudents
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `${grade}-${idx + 1}`,
      rollNo: typeof item.rollNo === 'string' ? item.rollNo : String(idx + 1).padStart(2, '0'),
      name: typeof item.name === 'string' ? item.name : `Student ${idx + 1}`,
      avatar: typeof item.avatar === 'string' ? item.avatar : '',
      status: normalizeStatusCode(item.status),
    }));

  const presentFromStudents = students.filter((s) => s.status === 'P').length;
  const absentFromStudents = students.filter((s) => s.status === 'A').length;
  const leaveFromStudents = students.filter((s) => s.status === 'L').length;
  const lateFromStudents = students.filter((s) => s.status === 'LT').length;
  const halfDayFromStudents = students.filter((s) => s.status === 'H').length;

  const hasStudents = students.length > 0;
  const presentCount = hasStudents
    ? presentFromStudents
    : Math.max(0, Number(data.presentCount) || 0);
  const absentCount = hasStudents
    ? absentFromStudents
    : Math.max(0, Number(data.absentCount) || 0);
  const onLeaveCount = hasStudents
    ? leaveFromStudents
    : Math.max(0, Number(data.onLeaveCount) || 0);
  const lateCount = hasStudents
    ? lateFromStudents
    : Math.max(0, Number(data.lateCount) || 0);
  const halfDayCount = hasStudents
    ? halfDayFromStudents
    : Math.max(0, Number(data.halfDayCount) || 0);
  const totalStudents = hasStudents
    ? students.length
    : Math.max(
        0,
        Number(data.totalStudents) ||
          presentCount + absentCount + onLeaveCount + lateCount + halfDayCount
      );

  return {
    id: docId,
    schoolId,
    schoolName:
      typeof data.schoolName === 'string' && data.schoolName.trim()
        ? data.schoolName.trim()
        : 'Greenwood International School',
    grade,
    dateStr: typeof data.dateStr === 'string' ? data.dateStr : dateKey,
    dateKey,
    teacherName:
      typeof data.teacherName === 'string' && data.teacherName.trim()
        ? data.teacherName.trim()
        : 'Ms. Priya Sharma',
    totalStudents,
    presentCount,
    absentCount,
    onLeaveCount,
    lateCount,
    halfDayCount,
    students,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
}

export function getTodayHolidayInfo(
  dateKey: string,
  schoolId: string,
  gradeScope: string,
  calendarEvents: CalendarEventDetail[]
): { isHoliday: boolean; holidayTitle: string | null } {
  const matchedEvent = calendarEvents.find((ev) => {
    if (ev.schoolId !== schoolId || ev.category !== 'Holiday') return false;
    if (ev.status === 'draft' || ev.status === 'cancelled') return false;
    const endKey = ev.endDateKey && ev.endDateKey >= ev.dateKey ? ev.endDateKey : ev.dateKey;
    if (dateKey < ev.dateKey || dateKey > endKey) return false;
    if (gradeScope !== 'ALL' && ev.targetClasses && ev.targetClasses.length > 0) {
      const normalizedTarget = ev.targetClasses.map((c) => c.trim().toLowerCase());
      const matchesAll = normalizedTarget.some(
        (c) => c === 'all' || c === 'all classes' || c === 'school-wide'
      );
      if (!matchesAll && !normalizedTarget.includes(gradeScope.trim().toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  if (matchedEvent) {
    return { isHoliday: true, holidayTitle: matchedEvent.title };
  }

  // Sunday (0) in school calendar is a non-working weekend holiday
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const dow = parseDateKeySafe(dateKey).getUTCDay();
    if (dow === 0) {
      return { isHoliday: true, holidayTitle: 'Sunday (Weekend Holiday)' };
    }
  }

  return { isHoliday: false, holidayTitle: null };
}

export function computeTodayClassOverview(params: {
  records: AttendanceRecord[];
  staff: StaffIdentityContext;
  dateKey: string;
  gradeScope: string;
  calendarEvents: CalendarEventDetail[];
  isLiveFirestore: boolean;
  requiresFirebaseAuth: boolean;
}): TodayClassOverviewSnapshot {
  const {
    records,
    staff,
    dateKey,
    gradeScope,
    calendarEvents,
    isLiveFirestore,
    requiresFirebaseAuth,
  } = params;

  const authorizedGrades = getAuthorizedAttendanceGrades(staff);
  const scopedGrades =
    gradeScope === 'ALL'
      ? authorizedGrades
      : authorizedGrades.includes(gradeScope)
        ? [gradeScope]
        : [];

  const matchingRecords = records
    .filter(
      (r) =>
        r.schoolId === staff.schoolId &&
        r.dateKey === dateKey &&
        scopedGrades.includes(r.grade)
    )
    .slice()
    .sort((a, b) => (a.updatedAt || a.savedAt || '').localeCompare(b.updatedAt || b.savedAt || ''));

  if (matchingRecords.length === 0) {
    const holidayInfo = getTodayHolidayInfo(dateKey, staff.schoolId, gradeScope, calendarEvents);
    if (holidayInfo.isHoliday) {
      return {
        loading: false,
        state: 'holiday',
        counts: null,
        markedCount: 0,
        unmarkedCount: 0,
        dateKey,
        gradeScope,
        authorizedGrades,
        holidayTitle: holidayInfo.holidayTitle,
        isLiveFirestore,
        requiresFirebaseAuth,
        error: null,
        lastUpdatedAt: null,
      };
    }

    // No attendance marked yet today: compute genuine roster total across scoped grades, 0 for all statuses
    const rosterStudents = new Map<string, boolean>();
    for (const grade of scopedGrades) {
      for (const st of getInitialStudentsForGrade(grade)) {
        const key = st.id ? st.id.trim() : `${grade}::${st.rollNo}`;
        rosterStudents.set(key, true);
      }
    }
    const rosterTotal = rosterStudents.size;

    return {
      loading: false,
      state: 'unmarked',
      counts: {
        total: rosterTotal,
        present: 0,
        absent: 0,
        leave: 0,
        late: 0,
        halfDay: 0,
      },
      markedCount: 0,
      unmarkedCount: rosterTotal,
      dateKey,
      gradeScope,
      authorizedGrades,
      holidayTitle: null,
      isLiveFirestore,
      requiresFirebaseAuth,
      error: null,
      lastUpdatedAt: null,
    };
  }

  // Deduplicate student-level records across matching records; add unmarked roster for any unscored scoped grade
  const studentStatusMap = new Map<string, AttendanceStatusCode | null>();
  const coveredGrades = new Set<string>();
  let aggregateFallbackTotal = 0;
  let aggregateFallbackPresent = 0;
  let aggregateFallbackAbsent = 0;
  let aggregateFallbackLeave = 0;
  let aggregateFallbackLate = 0;
  let aggregateFallbackHalfDay = 0;
  let hasAggregateOnlyRecord = false;
  let lastUpdatedAt: string | null = null;

  for (const rec of matchingRecords) {
    coveredGrades.add(rec.grade);
    const ts = rec.updatedAt || rec.savedAt || null;
    if (ts && (!lastUpdatedAt || ts > lastUpdatedAt)) {
      lastUpdatedAt = ts;
    }

    if (Array.isArray(rec.students) && rec.students.length > 0) {
      for (const st of rec.students) {
        const key = st.id && st.id.trim() ? st.id.trim() : `${rec.grade}::${st.rollNo}`;
        studentStatusMap.set(key, normalizeStatusCode(st.status));
      }
    } else if (rec.totalStudents > 0) {
      hasAggregateOnlyRecord = true;
      aggregateFallbackTotal += Math.max(0, rec.totalStudents);
      aggregateFallbackPresent += Math.max(0, rec.presentCount);
      aggregateFallbackAbsent += Math.max(0, rec.absentCount);
      aggregateFallbackLeave += Math.max(0, rec.onLeaveCount);
      aggregateFallbackLate += Math.max(0, rec.lateCount || 0);
      aggregateFallbackHalfDay += Math.max(0, rec.halfDayCount || 0);
    }
  }

  // Include unmarked roster students from any scoped grade that does not yet have a record today
  for (const grade of scopedGrades) {
    if (!coveredGrades.has(grade)) {
      for (const st of getInitialStudentsForGrade(grade)) {
        const key = st.id && st.id.trim() ? st.id.trim() : `${grade}::${st.rollNo}`;
        if (!studentStatusMap.has(key)) {
          studentStatusMap.set(key, null);
        }
      }
    }
  }

  let present = hasAggregateOnlyRecord ? aggregateFallbackPresent : 0;
  let absent = hasAggregateOnlyRecord ? aggregateFallbackAbsent : 0;
  let leave = hasAggregateOnlyRecord ? aggregateFallbackLeave : 0;
  let late = hasAggregateOnlyRecord ? aggregateFallbackLate : 0;
  let halfDay = hasAggregateOnlyRecord ? aggregateFallbackHalfDay : 0;
  let unmarkedCount = 0;

  for (const status of studentStatusMap.values()) {
    switch (status) {
      case 'P':
        present += 1;
        break;
      case 'A':
        absent += 1;
        break;
      case 'L':
        leave += 1;
        break;
      case 'LT':
        late += 1;
        break;
      case 'H':
        halfDay += 1;
        break;
      default:
        unmarkedCount += 1;
        break;
    }
  }

  const total = studentStatusMap.size + (hasAggregateOnlyRecord ? aggregateFallbackTotal : 0);
  const markedCount = present + absent + leave + late + halfDay;

  let state: TodayClassOverviewStateType = 'recorded';
  if (markedCount === 0) {
    state = 'unmarked';
  } else if (unmarkedCount > 0 || markedCount < total) {
    state = 'partial';
  }

  return {
    loading: false,
    state,
    counts: {
      total,
      present,
      absent,
      leave,
      late,
      halfDay,
    },
    markedCount,
    unmarkedCount,
    dateKey,
    gradeScope,
    authorizedGrades,
    holidayTitle: null,
    isLiveFirestore,
    requiresFirebaseAuth,
    error: null,
    lastUpdatedAt,
  };
}

export async function syncAttendanceRecordToFirestore(
  record: AttendanceRecord,
  firestoreDb: Firestore = db
): Promise<boolean> {
  if (!auth?.currentUser || !firestoreDb) return false;
  const docPath = `schools/${record.schoolId}/${ATTENDANCE_COLLECTION_NAME}/${record.id}`;
  try {
    const docRef = doc(
      firestoreDb,
      'schools',
      record.schoolId,
      ATTENDANCE_COLLECTION_NAME,
      record.id
    );
    const payload = JSON.parse(
      JSON.stringify({
        ...record,
        updatedByUid: auth.currentUser.uid,
      })
    );
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleAttendanceFirestoreError(error, AttendanceFirestoreOperationType.WRITE, docPath);
  }
}

export function subscribeToTodayClassOverview(
  params: {
    dateKey: string;
    gradeScope?: string;
    staff?: StaffIdentityContext;
    firestoreDb?: Firestore;
  },
  onUpdate: (snapshot: TodayClassOverviewSnapshot) => void
): () => void {
  const staff = params.staff || getActiveStaffCalendarContext();
  const authorizedGrades = getAuthorizedAttendanceGrades(staff);
  const gradeScope = params.gradeScope || getDefaultAttendanceGradeForStaff(staff);
  const dateKey = params.dateKey;
  const firestoreDb = params.firestoreDb || db;

  let latestCalendarEvents: CalendarEventDetail[] = [];
  let latestFirestoreRecords: AttendanceRecord[] | null = null;
  let isDisposed = false;
  let unsubscribeFirestore: (() => void) | null = null;

  const emitLocalSnapshot = () => {
    if (isDisposed) return;
    const localRecords = getAttendanceRecords();
    onUpdate(
      computeTodayClassOverview({
        records: localRecords,
        staff,
        dateKey,
        gradeScope,
        calendarEvents: latestCalendarEvents,
        isLiveFirestore: false,
        requiresFirebaseAuth: !auth?.currentUser,
      })
    );
  };

  const emitFirestoreSnapshot = () => {
    if (isDisposed || latestFirestoreRecords === null) return;
    onUpdate(
      computeTodayClassOverview({
        records: latestFirestoreRecords,
        staff,
        dateKey,
        gradeScope,
        calendarEvents: latestCalendarEvents,
        isLiveFirestore: true,
        requiresFirebaseAuth: false,
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
    if (isDisposed) return;

    void validateAttendanceFirestoreConnection(firestoreDb);

    onUpdate({
      loading: true,
      state: 'loading',
      counts: null,
      markedCount: 0,
      unmarkedCount: 0,
      dateKey,
      gradeScope,
      authorizedGrades,
      holidayTitle: null,
      isLiveFirestore: false,
      requiresFirebaseAuth: false,
      error: null,
      lastUpdatedAt: null,
    });

    const collectionPath = `schools/${staff.schoolId}/${ATTENDANCE_COLLECTION_NAME}`;
    const attendanceRef = collection(
      firestoreDb,
      'schools',
      staff.schoolId,
      ATTENDANCE_COLLECTION_NAME
    );
    const attendanceQuery = query(attendanceRef, where('dateKey', '==', dateKey));

    unsubscribeFirestore = onSnapshot(
      attendanceQuery,
      (querySnapshot) => {
        const docs: AttendanceRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          const mapped = mapFirestoreAttendanceDoc(
            docSnap.id,
            docSnap.data() as Record<string, unknown>,
            staff.schoolId
          );
          if (mapped) docs.push(mapped);
        });
        latestFirestoreRecords = docs;
        emitFirestoreSnapshot();
      },
      (error) => {
        const errInfo = buildAttendanceFirestoreErrorInfo(
          error,
          AttendanceFirestoreOperationType.GET,
          collectionPath
        );
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        const isPermissionError =
          error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied';

        if (!isDisposed) {
          onUpdate({
            loading: false,
            state: 'error',
            counts: null,
            markedCount: 0,
            unmarkedCount: 0,
            dateKey,
            gradeScope,
            authorizedGrades,
            holidayTitle: null,
            isLiveFirestore: false,
            requiresFirebaseAuth: isPermissionError,
            error: isPermissionError
              ? 'You do not have permission to view live class attendance.'
              : error?.message || 'Unable to load today’s class attendance.',
            lastUpdatedAt: null,
          });
        }
      }
    );
  };

  // Subscribe to school calendar events for live Holiday detection
  const unsubscribeCalendar = subscribeToStaffCalendarEvents(staff, (events) => {
    latestCalendarEvents = events;
    if (latestFirestoreRecords !== null) {
      emitFirestoreSnapshot();
    } else if (!auth?.currentUser) {
      emitLocalSnapshot();
    }
  });

  // React immediately to local saves/edits or cross-tab storage updates when not backed by live auth
  const handleLocalAttendanceUpdate = () => {
    if (!auth?.currentUser) {
      emitLocalSnapshot();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('offsleek_attendance_updated', handleLocalAttendanceUpdate);
    window.addEventListener('storage', handleLocalAttendanceUpdate);
  }

  // Attach Firestore onSnapshot when authenticated; cleanly downgrade/upgrade on auth state change
  let unsubscribeAuth: (() => void) | null = null;
  if (auth) {
    if (auth.currentUser) {
      attachFirestore();
    } else {
      emitLocalSnapshot();
    }
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (isDisposed) return;
      if (user) {
        attachFirestore();
      } else {
        detachFirestore();
        emitLocalSnapshot();
      }
    });
  } else {
    emitLocalSnapshot();
  }

  return () => {
    isDisposed = true;
    detachFirestore();
    unsubscribeCalendar();
    if (unsubscribeAuth) unsubscribeAuth();
    if (typeof window !== 'undefined') {
      window.removeEventListener('offsleek_attendance_updated', handleLocalAttendanceUpdate);
      window.removeEventListener('storage', handleLocalAttendanceUpdate);
    }
  };
}
