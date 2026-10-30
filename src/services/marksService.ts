/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  // Return deep copy
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
    return { success: true, record: publishedRecord };
  } catch (err) {
    return {
      success: false,
      error: 'An unexpected database error occurred while saving marks.',
    };
  }
}
