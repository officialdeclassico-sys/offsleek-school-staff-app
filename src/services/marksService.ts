/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  ASSIGNED_CLASSES,
  AttendanceFirestoreOperationType,
  buildAttendanceFirestoreErrorInfo,
  getInitialStudentsForGrade,
  handleAttendanceFirestoreError,
} from './attendanceService';
import { getActiveStaffCalendarContext, StaffIdentityContext } from './calendarService';
import { getNowISO } from '../utils/dateTimeUtils';

export interface StudentMark {
  studentId: string;
  rollNo: string;
  name: string;
  avatar: string;
  marks: number | null; // null if absent or not yet entered
  isAbsent: boolean;
  remarks: string;
}

export interface AssessmentRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  grade: string;
  subject: string;
  assessmentType: string;
  totalMarks: number;
  passingMarks: number;
  examDate: string;
  showMarksToStudents: boolean;
  addRemarks: boolean;
  isPublished: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  totalStudents: number;
  marksEntered: number;
  absentCount: number;
  studentMarks: StudentMark[];
}

const STORAGE_KEY = 'offsleek_school_marks_records_v1';

export const AVAILABLE_SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Studies'];
export const AVAILABLE_ASSESSMENTS = ['Unit Test 1', 'Unit Test 2', 'Term 1', 'Term 2'];

// Initial 42 students for Grade 5 - A with marks matching reference
const DEFAULT_STUDENT_MARKS_5A: StudentMark[] = [
  { studentId: 's-01', rollNo: '01', name: 'Aarav Sharma', avatar: '/assets/students/student-01-aarav.png', marks: 42, isAbsent: false, remarks: '-' },
  { studentId: 's-02', rollNo: '02', name: 'Ananya Patel', avatar: '/assets/students/student-02-ananya.png', marks: 38, isAbsent: false, remarks: 'Good' },
  { studentId: 's-03', rollNo: '03', name: 'Arjun Mehta', avatar: '/assets/students/student-03-arjun.png', marks: 45, isAbsent: false, remarks: 'Excellent' },
  { studentId: 's-04', rollNo: '04', name: 'Diya Reddy', avatar: '/assets/students/student-04-diya.png', marks: 36, isAbsent: false, remarks: '-' },
  { studentId: 's-05', rollNo: '05', name: 'Ishaan Khan', avatar: '/assets/students/student-05-ishaan.png', marks: 28, isAbsent: false, remarks: 'Needs improvement' },
  { studentId: 's-06', rollNo: '06', name: 'Kavya Nair', avatar: '/assets/students/student-06-kavya.png', marks: 32, isAbsent: false, remarks: '-' },
  { studentId: 's-07', rollNo: '07', name: 'Mohit Verma', avatar: '/assets/students/student-07-mohit.png', marks: null, isAbsent: true, remarks: 'Absent' },
  { studentId: 's-08', rollNo: '08', name: 'Pooja Singh', avatar: '/assets/students/student-08-pooja.png', marks: 40, isAbsent: false, remarks: '-' },
  { studentId: 's-09', rollNo: '09', name: 'Rohan Gupta', avatar: '/assets/students/student-01-aarav.png', marks: 44, isAbsent: false, remarks: '-' },
  { studentId: 's-10', rollNo: '10', name: 'Sanya Malhotra', avatar: '/assets/students/student-02-ananya.png', marks: 48, isAbsent: false, remarks: 'Outstanding' },
  { studentId: 's-11', rollNo: '11', name: 'Aditya Joshi', avatar: '/assets/students/student-03-arjun.png', marks: 35, isAbsent: false, remarks: '-' },
  { studentId: 's-12', rollNo: '12', name: 'Sneha Iyer', avatar: '/assets/students/student-04-diya.png', marks: 41, isAbsent: false, remarks: 'Consistent' },
  { studentId: 's-13', rollNo: '13', name: 'Kabir Das', avatar: '/assets/students/student-05-ishaan.png', marks: 30, isAbsent: false, remarks: '-' },
  { studentId: 's-14', rollNo: '14', name: 'Tanvi Shah', avatar: '/assets/students/student-06-kavya.png', marks: 39, isAbsent: false, remarks: '-' },
  { studentId: 's-15', rollNo: '15', name: 'Riya Kapoor', avatar: '/assets/students/student-15-riya.png', marks: 46, isAbsent: false, remarks: 'Very Good' },
  { studentId: 's-16', rollNo: '16', name: 'Varun Bhatia', avatar: '/assets/students/student-07-mohit.png', marks: 33, isAbsent: false, remarks: '-' },
  { studentId: 's-17', rollNo: '17', name: 'Meera Chawla', avatar: '/assets/students/student-08-pooja.png', marks: 43, isAbsent: false, remarks: '-' },
  { studentId: 's-18', rollNo: '18', name: 'Devendra Sen', avatar: '/assets/students/student-01-aarav.png', marks: 37, isAbsent: false, remarks: '-' },
  { studentId: 's-19', rollNo: '19', name: 'Gauri Pillai', avatar: '/assets/students/student-02-ananya.png', marks: 47, isAbsent: false, remarks: 'Excellent' },
  { studentId: 's-20', rollNo: '20', name: 'Kunal Aggarwal', avatar: '/assets/students/student-03-arjun.png', marks: 34, isAbsent: false, remarks: '-' },
  { studentId: 's-21', rollNo: '21', name: 'Bhavna Kulkarni', avatar: '/assets/students/student-04-diya.png', marks: 42, isAbsent: false, remarks: '-' },
  { studentId: 's-22', rollNo: '22', name: 'Manav Saxena', avatar: '/assets/students/student-05-ishaan.png', marks: 31, isAbsent: false, remarks: '-' },
  { studentId: 's-23', rollNo: '23', name: 'Nisha Ghosh', avatar: '/assets/students/student-06-kavya.png', marks: 39, isAbsent: false, remarks: '-' },
  { studentId: 's-24', rollNo: '24', name: 'Pranav Menon', avatar: '/assets/students/student-07-mohit.png', marks: 45, isAbsent: false, remarks: 'Great work' },
  { studentId: 's-25', rollNo: '25', name: 'Riddhima Roy', avatar: '/assets/students/student-08-pooja.png', marks: 41, isAbsent: false, remarks: '-' },
  { studentId: 's-26', rollNo: '26', name: 'Siddharth Jain', avatar: '/assets/students/student-01-aarav.png', marks: 36, isAbsent: false, remarks: '-' },
  { studentId: 's-27', rollNo: '27', name: 'Tara Nambiar', avatar: '/assets/students/student-02-ananya.png', marks: 44, isAbsent: false, remarks: '-' },
  { studentId: 's-28', rollNo: '28', name: 'Zaid Ali', avatar: '/assets/students/student-28-zaid.png', marks: 38, isAbsent: false, remarks: '-' },
  { studentId: 's-29', rollNo: '29', name: 'Alia Fernandes', avatar: '/assets/students/student-04-diya.png', marks: 40, isAbsent: false, remarks: '-' },
  { studentId: 's-30', rollNo: '30', name: 'Chirag Sethi', avatar: '/assets/students/student-05-ishaan.png', marks: 32, isAbsent: false, remarks: '-' },
  { studentId: 's-31', rollNo: '31', name: 'Deepa Rao', avatar: '/assets/students/student-06-kavya.png', marks: 47, isAbsent: false, remarks: 'Top scorer' },
  { studentId: 's-32', rollNo: '32', name: 'Eshwar Murthy', avatar: '/assets/students/student-07-mohit.png', marks: 35, isAbsent: false, remarks: '-' },
  { studentId: 's-33', rollNo: '33', name: 'Farhan Sheikh', avatar: '/assets/students/student-03-arjun.png', marks: 43, isAbsent: false, remarks: '-' },
  { studentId: 's-34', rollNo: '34', name: 'Gayatri Varma', avatar: '/assets/students/student-08-pooja.png', marks: 39, isAbsent: false, remarks: '-' },
  { studentId: 's-35', rollNo: '35', name: 'Harsh Vardhan', avatar: '/assets/students/student-01-aarav.png', marks: 41, isAbsent: false, remarks: '-' },
  { studentId: 's-36', rollNo: '36', name: 'Indira Choudhury', avatar: '/assets/students/student-02-ananya.png', marks: 46, isAbsent: false, remarks: '-' },
  { studentId: 's-37', rollNo: '37', name: 'Jayant Mishra', avatar: '/assets/students/student-05-ishaan.png', marks: 34, isAbsent: false, remarks: '-' },
  { studentId: 's-38', rollNo: '38', name: 'Kirti Singhal', avatar: '/assets/students/student-04-diya.png', marks: 42, isAbsent: false, remarks: '-' },
  { studentId: 's-39', rollNo: '39', name: 'Lakshya Anand', avatar: '/assets/students/student-07-mohit.png', marks: 37, isAbsent: false, remarks: '-' },
  { studentId: 's-40', rollNo: '40', name: 'Madhavi Somani', avatar: '/assets/students/student-06-kavya.png', marks: 44, isAbsent: false, remarks: '-' },
  { studentId: 's-41', rollNo: '41', name: 'Naveen Kaul', avatar: '/assets/students/student-03-arjun.png', marks: 36, isAbsent: false, remarks: '-' },
  { studentId: 's-42', rollNo: '42', name: 'Pallavi Rawat', avatar: '/assets/students/student-08-pooja.png', marks: 45, isAbsent: false, remarks: '-' },
];

export function getInitialMarksForGrade(grade: string): StudentMark[] {
  if (grade === 'Grade 5 - B') {
    return getInitialStudentsForGrade('Grade 5 - B').map((st) => ({
      studentId: st.id,
      rollNo: st.rollNo,
      name: st.name,
      avatar: st.avatar,
      marks: null,
      isAbsent: false,
      remarks: '-',
    }));
  }
  return JSON.parse(JSON.stringify(DEFAULT_STUDENT_MARKS_5A));
}

export function getSavedMarksRecords(): AssessmentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read marks records:', err);
  }
  return [];
}

export function saveMarksRecords(records: AssessmentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save marks records:', err);
  }
}

export function findMarksRecord(
  schoolId: string,
  grade: string,
  subject: string,
  assessmentType: string
): AssessmentRecord | undefined {
  const records = getSavedMarksRecords();
  return records.find(
    (r) =>
      r.schoolId === schoolId &&
      r.grade === grade &&
      r.subject === subject &&
      r.assessmentType === assessmentType
  );
}

export function saveAndPublishMarks(
  assessmentData: Omit<AssessmentRecord, 'id' | 'isPublished' | 'publishedAt' | 'totalStudents' | 'marksEntered' | 'absentCount'>
): { success: boolean; record?: AssessmentRecord; error?: string } {
  try {
    const totalStudents = assessmentData.studentMarks.length;
    const absentCount = assessmentData.studentMarks.filter((s) => s.isAbsent).length;
    const marksEntered = assessmentData.studentMarks.filter(
      (s) => s.isAbsent || (s.marks !== null && !isNaN(s.marks))
    ).length;

    // Validate that every student has either a mark or is marked absent
    if (marksEntered < totalStudents) {
      const pendingCount = totalStudents - marksEntered;
      return {
        success: false,
        error: `Cannot publish: ${pendingCount} student(s) still have pending marks. Please enter marks or mark as absent.`,
      };
    }

    // Validate marks are within valid range
    for (const sm of assessmentData.studentMarks) {
      if (!sm.isAbsent && sm.marks !== null) {
        if (sm.marks < 0 || sm.marks > assessmentData.totalMarks) {
          return {
            success: false,
            error: `Invalid mark for ${sm.name}: ${sm.marks}. Marks must be between 0 and ${assessmentData.totalMarks}.`,
          };
        }
      }
    }

    const records = getSavedMarksRecords();
    const id = `marks-${assessmentData.schoolId}-${assessmentData.grade.replace(/\s+/g, '-').toLowerCase()}-${assessmentData.subject.toLowerCase()}-${assessmentData.assessmentType.replace(/\s+/g, '-').toLowerCase()}`;

    const existingIndex = records.findIndex((r) => r.id === id);
    const nowIso = getNowISO();
    const existingCreatedAt =
      existingIndex >= 0
        ? records[existingIndex].createdAt || records[existingIndex].publishedAt || nowIso
        : nowIso;

    const publishedRecord: AssessmentRecord = {
      ...assessmentData,
      id,
      totalStudents,
      marksEntered,
      absentCount,
      isPublished: true,
      publishedAt: nowIso,
      createdAt: existingCreatedAt,
      updatedAt: nowIso,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = publishedRecord;
    } else {
      records.push(publishedRecord);
    }

    saveMarksRecords(records);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offsleek_marks_updated', { detail: publishedRecord }));
    }

    void syncMarksRecordToFirestore(publishedRecord).catch(() => {
      // Structured Firestore error is already logged; local persistence remains intact
    });

    return { success: true, record: publishedRecord };
  } catch (err) {
    return {
      success: false,
      error: 'An unexpected database error occurred while saving marks.',
    };
  }
}

// -------------------------------------------------------------
// STUDENT RESULTS DATA, PERMISSIONS & REAL-TIME SUBSCRIPTION
// -------------------------------------------------------------

export const MARKS_COLLECTION_NAME = 'marksRecords';

export interface AuthorizedStudentProfile {
  studentId: string;
  rollNo: string;
  admissionNo?: string;
  name: string;
  avatar: string;
  grade: string;
  classTeacher?: string;
  schoolId: string;
}

export interface SubjectResultRow {
  recordId: string;
  subject: string;
  marksObtained: number | null;
  maxMarks: number;
  passingMarks: number;
  isAbsent: boolean;
  grade: string;
  status: 'Pass' | 'Fail' | 'Absent';
  remarks: string;
}

export interface StudentExamResultSummary {
  totalSubjects: number;
  totalMaxMarks: number;
  totalMarksObtained: number;
  percentage: number;
  overallGrade: string;
  overallResult: 'PASS' | 'FAIL';
  remarksText: string | null;
  academicYearLabel: string;
  examDate: string | null;
}

export interface StudentExamResultData {
  student: AuthorizedStudentProfile;
  examName: string;
  schoolName: string;
  boardAndLocation: string;
  subjects: SubjectResultRow[];
  summary: StudentExamResultSummary | null;
}

export interface PublishedMarksSubscriptionSnapshot {
  loading: boolean;
  records: AssessmentRecord[];
  isLiveFirestore: boolean;
  requiresFirebaseAuth: boolean;
  error: string | null;
}

export function computeLetterGradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export function formatMarksPercentage(percentage: number): string {
  const rounded = Number(percentage.toFixed(1));
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function isGradeAuthorizedForStaff(
  grade: string,
  staff: StaffIdentityContext
): boolean {
  if (staff.role === 'SCHOOL_ADMIN' || staff.role === 'PRINCIPAL') return true;
  const normalizedTarget = grade.trim().toLowerCase();
  return staff.assignedClasses.some((c) => c.trim().toLowerCase() === normalizedTarget);
}

export function getClassTeacherForGrade(
  grade: string,
  staff: StaffIdentityContext
): string | undefined {
  const assigned = ASSIGNED_CLASSES.find(
    (c) => c.name.trim().toLowerCase() === grade.trim().toLowerCase()
  );
  if (assigned && assigned.role === 'Class Teacher') {
    return staff.name;
  }
  return undefined;
}

export function getAuthorizedStudentsForStaff(
  staff: StaffIdentityContext = getActiveStaffCalendarContext(),
  publishedRecords: AssessmentRecord[] = []
): AuthorizedStudentProfile[] {
  const studentMap = new Map<string, AuthorizedStudentProfile>();

  // 1. Authorized class rosters from existing attendance/class assignments
  for (const cls of ASSIGNED_CLASSES) {
    if (!isGradeAuthorizedForStaff(cls.name, staff)) continue;
    const classTeacher = getClassTeacherForGrade(cls.name, staff);
    const roster = getInitialStudentsForGrade(cls.name);
    for (const st of roster) {
      const key = `${cls.name}::${st.id}`;
      studentMap.set(key, {
        studentId: st.id,
        rollNo: st.rollNo,
        name: st.name,
        avatar: st.avatar,
        grade: cls.name,
        classTeacher,
        schoolId: staff.schoolId,
      });
    }
  }

  // 2. Include any additional students present in school-scoped, authorized published marks records
  for (const rec of publishedRecords) {
    if (rec.schoolId !== staff.schoolId || !rec.isPublished) continue;
    if (!isGradeAuthorizedForStaff(rec.grade, staff)) continue;
    const classTeacher = getClassTeacherForGrade(rec.grade, staff);

    for (const sm of rec.studentMarks) {
      const key = `${rec.grade}::${sm.studentId}`;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId: sm.studentId,
          rollNo: sm.rollNo,
          name: sm.name,
          avatar: sm.avatar,
          grade: rec.grade,
          classTeacher,
          schoolId: rec.schoolId,
        });
      }
    }
  }

  return Array.from(studentMap.values()).sort((a, b) => {
    const gradeCmp = a.grade.localeCompare(b.grade);
    if (gradeCmp !== 0) return gradeCmp;
    return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });
  });
}

export function computeStudentExamResult(params: {
  student: AuthorizedStudentProfile;
  examName: string;
  publishedRecords: AssessmentRecord[];
  staff: StaffIdentityContext;
}): StudentExamResultData {
  const { student, examName, publishedRecords, staff } = params;

  const isAuthorized =
    student.schoolId === staff.schoolId &&
    isGradeAuthorizedForStaff(student.grade, staff);

  const academicYearStart = (staff.academicYear || '2026-27').split('-')[0] || '2026';

  if (!isAuthorized) {
    return {
      student,
      examName,
      schoolName: staff.schoolName,
      boardAndLocation: 'CBSE | Bengaluru',
      subjects: [],
      summary: null,
    };
  }

  const matchingExamRecords = publishedRecords
    .filter(
      (r) =>
        r.schoolId === staff.schoolId &&
        r.isPublished &&
        r.grade === student.grade &&
        r.assessmentType === examName
    )
    .slice()
    .sort((a, b) => a.subject.localeCompare(b.subject));

  // Deduplicate by subject (latest updated record wins if duplicate exists)
  const latestBySubject = new Map<string, AssessmentRecord>();
  for (const rec of matchingExamRecords) {
    const prev = latestBySubject.get(rec.subject);
    if (!prev) {
      latestBySubject.set(rec.subject, rec);
    } else {
      const prevTs = prev.updatedAt || prev.publishedAt || '';
      const nextTs = rec.updatedAt || rec.publishedAt || '';
      if (nextTs >= prevTs) {
        latestBySubject.set(rec.subject, rec);
      }
    }
  }

  const subjects: SubjectResultRow[] = [];
  const remarkSnippets: string[] = [];
  let totalMaxMarks = 0;
  let totalMarksObtained = 0;
  let allPassed = true;
  let latestExamDate: string | null = null;

  for (const rec of latestBySubject.values()) {
    const matchedStudentMark = rec.studentMarks.find(
      (sm) =>
        sm.studentId === student.studentId ||
        (sm.rollNo === student.rollNo &&
          sm.name.trim().toLowerCase() === student.name.trim().toLowerCase())
    );
    if (!matchedStudentMark) continue;

    if (rec.examDate && !latestExamDate) {
      latestExamDate = rec.examDate;
    }

    const isAbsent = Boolean(matchedStudentMark.isAbsent);
    const obtained =
      isAbsent || matchedStudentMark.marks === null ? null : matchedStudentMark.marks;
    const numericScore = obtained !== null ? obtained : 0;
    const pct = rec.totalMarks > 0 ? (numericScore / rec.totalMarks) * 100 : 0;

    let status: 'Pass' | 'Fail' | 'Absent' = 'Pass';
    if (isAbsent) {
      status = 'Absent';
      allPassed = false;
    } else if (obtained === null || obtained < rec.passingMarks) {
      status = 'Fail';
      allPassed = false;
    }

    const grade = isAbsent ? 'AB' : computeLetterGradeFromPercentage(pct);

    const cleanedRemark = (matchedStudentMark.remarks || '').trim();
    if (
      rec.addRemarks !== false &&
      cleanedRemark &&
      cleanedRemark !== '-' &&
      cleanedRemark.toLowerCase() !== 'absent'
    ) {
      remarkSnippets.push(`${rec.subject}: ${cleanedRemark}`);
    }

    totalMaxMarks += rec.totalMarks;
    totalMarksObtained += numericScore;

    subjects.push({
      recordId: rec.id,
      subject: rec.subject,
      marksObtained: obtained,
      maxMarks: rec.totalMarks,
      passingMarks: rec.passingMarks,
      isAbsent,
      grade,
      status,
      remarks: cleanedRemark && cleanedRemark !== '-' ? cleanedRemark : '',
    });
  }

  if (subjects.length === 0) {
    return {
      student,
      examName,
      schoolName: staff.schoolName,
      boardAndLocation: 'CBSE | Bengaluru',
      subjects: [],
      summary: null,
    };
  }

  const overallPct = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
  const overallGrade = computeLetterGradeFromPercentage(overallPct);

  let remarksText: string | null = null;
  if (remarkSnippets.length === 1) {
    remarksText = remarkSnippets[0];
  } else if (remarkSnippets.length > 1) {
    remarksText = remarkSnippets.join(' • ');
  }

  return {
    student,
    examName,
    schoolName: staff.schoolName,
    boardAndLocation: 'CBSE | Bengaluru',
    subjects,
    summary: {
      totalSubjects: subjects.length,
      totalMaxMarks,
      totalMarksObtained,
      percentage: Number(overallPct.toFixed(1)),
      overallGrade,
      overallResult: allPassed ? 'PASS' : 'FAIL',
      remarksText,
      academicYearLabel: academicYearStart,
      examDate: latestExamDate,
    },
  };
}

export function mapFirestoreMarksDoc(
  docId: string,
  data: Record<string, unknown>,
  fallbackSchoolId: string
): AssessmentRecord | null {
  const schoolId =
    typeof data.schoolId === 'string' && data.schoolId.trim()
      ? data.schoolId.trim()
      : fallbackSchoolId;
  const grade = typeof data.grade === 'string' ? data.grade.trim() : '';
  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const assessmentType =
    typeof data.assessmentType === 'string' ? data.assessmentType.trim() : '';

  if (!grade || !subject || !assessmentType) return null;

  const rawMarks = Array.isArray(data.studentMarks) ? data.studentMarks : [];
  const studentMarks: StudentMark[] = rawMarks
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, idx) => ({
      studentId:
        typeof item.studentId === 'string' && item.studentId.trim()
          ? item.studentId.trim()
          : `${grade}-${idx + 1}`,
      rollNo: typeof item.rollNo === 'string' ? item.rollNo : String(idx + 1).padStart(2, '0'),
      name: typeof item.name === 'string' ? item.name : `Student ${idx + 1}`,
      avatar: typeof item.avatar === 'string' ? item.avatar : '',
      marks:
        typeof item.marks === 'number' && !Number.isNaN(item.marks) ? item.marks : null,
      isAbsent: Boolean(item.isAbsent),
      remarks: typeof item.remarks === 'string' ? item.remarks : '-',
    }));

  return {
    id: docId,
    schoolId,
    schoolName:
      typeof data.schoolName === 'string' && data.schoolName.trim()
        ? data.schoolName.trim()
        : 'Greenwood International School',
    grade,
    subject,
    assessmentType,
    totalMarks: Math.max(1, Number(data.totalMarks) || 50),
    passingMarks: Math.max(0, Number(data.passingMarks) || 20),
    examDate: typeof data.examDate === 'string' ? data.examDate : '',
    showMarksToStudents: Boolean(data.showMarksToStudents),
    addRemarks: data.addRemarks !== false,
    isPublished: Boolean(data.isPublished),
    publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    totalStudents: Number(data.totalStudents) || studentMarks.length,
    marksEntered: Number(data.marksEntered) || studentMarks.length,
    absentCount: Number(data.absentCount) || studentMarks.filter((s) => s.isAbsent).length,
    studentMarks,
  };
}

export async function syncMarksRecordToFirestore(
  record: AssessmentRecord,
  firestoreDb: Firestore = db
): Promise<boolean> {
  if (!auth?.currentUser || !firestoreDb) return false;
  const docPath = `schools/${record.schoolId}/${MARKS_COLLECTION_NAME}/${record.id}`;
  try {
    const docRef = doc(
      firestoreDb,
      'schools',
      record.schoolId,
      MARKS_COLLECTION_NAME,
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

export function subscribeToPublishedStudentMarks(
  params: {
    staff?: StaffIdentityContext;
    firestoreDb?: Firestore;
  },
  onUpdate: (snapshot: PublishedMarksSubscriptionSnapshot) => void
): () => void {
  const staff = params.staff || getActiveStaffCalendarContext();
  const firestoreDb = params.firestoreDb || db;
  let isDisposed = false;
  let unsubscribeFirestore: (() => void) | null = null;

  const filterAuthorizedPublished = (records: AssessmentRecord[]): AssessmentRecord[] =>
    records.filter(
      (r) =>
        r.schoolId === staff.schoolId &&
        r.isPublished &&
        isGradeAuthorizedForStaff(r.grade, staff)
    );

  const emitLocal = () => {
    if (isDisposed) return;
    onUpdate({
      loading: false,
      records: filterAuthorizedPublished(getSavedMarksRecords()),
      isLiveFirestore: false,
      requiresFirebaseAuth: !auth?.currentUser,
      error: null,
    });
  };

  const detachFirestore = () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
  };

  const attachFirestore = () => {
    detachFirestore();
    if (isDisposed) return;

    onUpdate({
      loading: true,
      records: [],
      isLiveFirestore: false,
      requiresFirebaseAuth: false,
      error: null,
    });

    const collectionPath = `schools/${staff.schoolId}/${MARKS_COLLECTION_NAME}`;
    const marksRef = collection(
      firestoreDb,
      'schools',
      staff.schoolId,
      MARKS_COLLECTION_NAME
    );
    const marksQuery = query(marksRef, where('isPublished', '==', true));

    unsubscribeFirestore = onSnapshot(
      marksQuery,
      (snapshot) => {
        const docs: AssessmentRecord[] = [];
        snapshot.forEach((docSnap) => {
          const mapped = mapFirestoreMarksDoc(
            docSnap.id,
            docSnap.data() as Record<string, unknown>,
            staff.schoolId
          );
          if (mapped) docs.push(mapped);
        });
        if (!isDisposed) {
          onUpdate({
            loading: false,
            records: filterAuthorizedPublished(docs),
            isLiveFirestore: true,
            requiresFirebaseAuth: false,
            error: null,
          });
        }
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
            records: [],
            isLiveFirestore: false,
            requiresFirebaseAuth: isPermissionError,
            error: isPermissionError
              ? 'You do not have permission to view published student results.'
              : error?.message || 'Unable to load published student results.',
          });
        }
      }
    );
  };

  const handleLocalMarksUpdate = () => {
    if (!auth?.currentUser) {
      emitLocal();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('offsleek_marks_updated', handleLocalMarksUpdate);
    window.addEventListener('storage', handleLocalMarksUpdate);
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
    if (unsubscribeAuth) unsubscribeAuth();
    if (typeof window !== 'undefined') {
      window.removeEventListener('offsleek_marks_updated', handleLocalMarksUpdate);
      window.removeEventListener('storage', handleLocalMarksUpdate);
    }
  };
}
