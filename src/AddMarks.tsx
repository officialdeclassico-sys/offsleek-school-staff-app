/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Bell,
  ChevronDown,
  Calendar,
  BookOpen,
  Search,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Sliders,
  Settings,
  UserX,
} from 'lucide-react';
import {
  StudentMark,
  AssessmentRecord,
  AVAILABLE_SUBJECTS,
  AVAILABLE_ASSESSMENTS,
  getInitialMarksForGrade,
} from './services/marksService';
import { ASSIGNED_CLASSES } from './services/attendanceService';
import StaffStatusBar from './components/StaffStatusBar';
import { formatISTDateMedium } from './utils/dateTimeUtils';
import { getAssetUrl } from './utils/assetUtils';

interface AddMarksProps {
  initialData?: {
    grade: string;
    subject: string;
    assessmentType: string;
    totalMarks: number;
    passingMarks: number;
    examDate: string;
    showMarksToStudents: boolean;
    addRemarks: boolean;
    studentMarks: StudentMark[];
  };
  onContinue: (assessmentData: {
    grade: string;
    subject: string;
    assessmentType: string;
    totalMarks: number;
    passingMarks: number;
    examDate: string;
    showMarksToStudents: boolean;
    addRemarks: boolean;
    studentMarks: StudentMark[];
  }) => void;
  onBack: () => void;
}

export default function AddMarks({
  initialData,
  onContinue,
  onBack,
}: AddMarksProps) {
  // Class, Subject, Assessment selections
  const [selectedGrade, setSelectedGrade] = useState<string>(
    initialData ? initialData.grade : 'Grade 5 - A'
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialData ? initialData.subject : 'Mathematics'
  );
  const [selectedAssessment, setSelectedAssessment] = useState<string>(
    initialData ? initialData.assessmentType : 'Unit Test 1'
  );

  // Assessment configurations
  const [totalMarks, setTotalMarks] = useState<number>(
    initialData ? initialData.totalMarks : 50
  );
  const [passingMarks, setPassingMarks] = useState<number>(
    initialData ? initialData.passingMarks : 20
  );
  const [examDate, setExamDate] = useState<string>(
    initialData ? initialData.examDate : formatISTDateMedium()
  );
  const [showMarksToStudents, setShowMarksToStudents] = useState<boolean>(
    initialData ? initialData.showMarksToStudents : false
  );
  const [addRemarks, setAddRemarks] = useState<boolean>(
    initialData ? initialData.addRemarks : true
  );

  // Student marks state
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>(() => {
    if (initialData && initialData.studentMarks && initialData.studentMarks.length > 0) {
      return JSON.parse(JSON.stringify(initialData.studentMarks));
    }
    return getInitialMarksForGrade(selectedGrade);
  });

  // Track initial snapshot to detect unsaved changes
  const initialMarksSnapshotRef = useRef<string>(
    JSON.stringify({
      grade: selectedGrade,
      subject: selectedSubject,
      assessment: selectedAssessment,
      marks: studentMarks.map((s) => ({
        id: s.studentId,
        marks: s.marks,
        isAbsent: s.isAbsent,
        remarks: s.remarks,
      })),
    })
  );
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    const current = JSON.stringify({
      grade: selectedGrade,
      subject: selectedSubject,
      assessment: selectedAssessment,
      marks: studentMarks.map((s) => ({
        id: s.studentId,
        marks: s.marks,
        isAbsent: s.isAbsent,
        remarks: s.remarks,
      })),
    });
    return current !== initialMarksSnapshotRef.current;
  }, [selectedGrade, selectedSubject, selectedAssessment, studentMarks]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowDiscardModal(true);
    } else {
      onBack();
    }
  };

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const classRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (classRef.current && !classRef.current.contains(e.target as Node)) {
        setShowClassDropdown(false);
      }
      if (subjectRef.current && !subjectRef.current.contains(e.target as Node)) {
        setShowSubjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Real-time calculation of statistics
  const totalStudents = studentMarks.length;
  const marksEntered = useMemo(() => {
    return studentMarks.filter(
      (s) => s.isAbsent || (s.marks !== null && !isNaN(s.marks))
    ).length;
  }, [studentMarks]);

  const pendingCount = totalStudents - marksEntered;

  // Handle individual student mark change
  const handleMarkChange = (studentId: string, val: string) => {
    setValidationError(null);
    setStudentMarks((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;

        // If user typed 'A' or 'a' for absent
        if (val.trim().toUpperCase() === 'A') {
          return {
            ...s,
            isAbsent: true,
            marks: null,
            remarks: s.remarks && s.remarks !== '-' ? s.remarks : 'Absent',
          };
        }

        if (val === '') {
          return { ...s, marks: null, isAbsent: false };
        }

        const num = parseFloat(val);
        if (isNaN(num)) return s;

        return {
          ...s,
          marks: num,
          isAbsent: false,
          remarks: s.remarks === 'Absent' ? '-' : s.remarks,
        };
      })
    );
  };

  // Toggle student absent status
  const handleToggleAbsent = (studentId: string) => {
    setValidationError(null);
    setStudentMarks((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        if (s.isAbsent) {
          return { ...s, isAbsent: false, marks: null, remarks: '-' };
        } else {
          return { ...s, isAbsent: true, marks: null, remarks: 'Absent' };
        }
      })
    );
  };

  // Handle remarks change
  const handleRemarkChange = (studentId: string, text: string) => {
    setStudentMarks((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks: text } : s))
    );
  };

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentMarks;
    const q = searchQuery.toLowerCase().trim();
    return studentMarks.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q)
    );
  }, [studentMarks, searchQuery]);

  // Checkbox select all visible
  const isAllVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.has(s.studentId));

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.studentId));
        return next;
      });
    } else {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.studentId));
        return next;
      });
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Quick action: Autofill remaining pending marks with default passing marks
  const handleAutofillPending = () => {
    setValidationError(null);
    setStudentMarks((prev) =>
      prev.map((s) => {
        if (!s.isAbsent && (s.marks === null || isNaN(s.marks))) {
          return { ...s, marks: 35, remarks: '-' };
        }
        return s;
      })
    );
    showToast('Filled pending marks with standard score (35/50)');
  };

  // Validation & Proceed to Screen 2 (Review & Save)
  const handleContinue = () => {
    // 1. Check for any marks exceeding total marks or negative
    for (const s of studentMarks) {
      if (!s.isAbsent && s.marks !== null) {
        if (s.marks < 0 || s.marks > totalMarks) {
          setValidationError(
            `Mark for ${s.name} (${s.marks}) exceeds the maximum total marks of ${totalMarks}.`
          );
          return;
        }
      }
    }

    // 2. Check if there are pending marks
    if (pendingCount > 0) {
      setValidationError(
        `${pendingCount} student(s) still have pending marks. Please enter marks or mark them as absent before continuing.`
      );
      return;
    }

    setValidationError(null);

    // Proceed to Screen 2
    onContinue({
      grade: selectedGrade,
      subject: selectedSubject,
      assessmentType: selectedAssessment,
      totalMarks,
      passingMarks,
      examDate,
      showMarksToStudents,
      addRemarks,
      studentMarks,
    });
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-3.5 right-3.5 z-50 bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <StaffStatusBar />

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-2 pb-12 space-y-3">
        
        {/* Page Heading & Subtitle with Small Back Chevron (Sticky on scroll) */}
        <div className="sticky top-0 bg-white z-20 pt-1 pb-2 border-b border-[#f4f5f7] flex items-start justify-between gap-2 -mx-3.5 sm:-mx-4.5 px-3.5 sm:px-4.5">
          <div className="flex items-start gap-1.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleBackClick}
              className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] sm:text-[23px] font-bold text-neutral-950 tracking-tight leading-tight">
                Add Marks
              </h1>
              <p className="text-[12px] sm:text-[12.5px] text-[#717684] mt-0.5 font-normal">
                Enter and manage student marks
              </p>
            </div>
          </div>
          
          {/* Assessment Settings Toggle Button */}
          <button
            type="button"
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 mt-0.5 ${
              showConfigDrawer
                ? 'bg-black text-white border-black'
                : 'bg-[#f8f9fa] text-neutral-800 border-[#e5e7eb] hover:bg-neutral-100'
            }`}
            title="Configure Assessment Details"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>

        {/* Class & Subject Selectors (2 columns) */}
        <div className="grid grid-cols-2 gap-2 relative">
          
          {/* Class Selector */}
          <div className="relative" ref={classRef}>
            <button
              type="button"
              onClick={() => {
                setShowClassDropdown(!showClassDropdown);
                setShowSubjectDropdown(false);
              }}
              className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl px-3 py-2 text-[12px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition text-left"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="truncate">{selectedGrade}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
            </button>

            {showClassDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl p-1.5 z-40 text-neutral-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#8e95a2] uppercase tracking-wider">
                  Select Class
                </div>
                {ASSIGNED_CLASSES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(c.name);
                      setShowClassDropdown(false);
                      showToast(`Selected ${c.name}`);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-[12px] font-semibold transition cursor-pointer flex items-center justify-between ${
                      selectedGrade === c.name
                        ? 'bg-black text-white'
                        : 'hover:bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    <span>{c.name}</span>
                    {selectedGrade === c.name && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject Selector */}
          <div className="relative" ref={subjectRef}>
            <button
              type="button"
              onClick={() => {
                setShowSubjectDropdown(!showSubjectDropdown);
                setShowClassDropdown(false);
              }}
              className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl px-3 py-2 text-[12px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition text-left"
            >
              <div className="flex items-center gap-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="truncate">{selectedSubject}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
            </button>

            {showSubjectDropdown && (
              <div className="absolute top-full right-0 mt-1.5 w-56 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl p-1.5 z-40 text-neutral-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#8e95a2] uppercase tracking-wider">
                  Select Subject
                </div>
                {AVAILABLE_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub);
                      setShowSubjectDropdown(false);
                      showToast(`Selected ${sub}`);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-[12px] font-semibold transition cursor-pointer flex items-center justify-between ${
                      selectedSubject === sub
                        ? 'bg-black text-white'
                        : 'hover:bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    <span>{sub}</span>
                    {selectedSubject === sub && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Assessment Tabs: Unit Test 1, Unit Test 2, Term 1, Term 2 */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#f4f5f7] p-1 rounded-xl">
          {AVAILABLE_ASSESSMENTS.map((assessment) => {
            const isActive = selectedAssessment === assessment;
            return (
              <button
                key={assessment}
                type="button"
                onClick={() => {
                  setSelectedAssessment(assessment);
                  showToast(`Selected ${assessment}`);
                }}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold transition cursor-pointer text-center truncate ${
                  isActive
                    ? 'bg-black text-white shadow-xs'
                    : 'text-[#6b7280] hover:text-neutral-900 hover:bg-white/60'
                }`}
              >
                {assessment}
              </button>
            );
          })}
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: Total Students */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[20px] font-bold text-neutral-950 leading-none">
              {totalStudents}
            </div>
            <div className="text-[10.5px] text-[#717684] font-normal mt-1 leading-tight">
              Total Students
            </div>
          </div>

          {/* Card 2: Marks Entered */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[20px] font-bold text-neutral-950 leading-none">
              {marksEntered}
            </div>
            <div className="text-[10.5px] text-[#717684] font-normal mt-1 leading-tight">
              Marks Entered
            </div>
          </div>

          {/* Card 3: Pending */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[20px] font-bold text-neutral-950 leading-none">
              {pendingCount}
            </div>
            <div className="text-[10.5px] text-[#717684] font-normal mt-1 leading-tight">
              Pending
            </div>
          </div>
        </div>

        {/* Assessment Details Drawer/Panel (Matching Panel 2 in screenshot) */}
        {showConfigDrawer && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 shadow-sm space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[#f3f4f6]">
              <h3 className="text-[13.5px] font-bold text-neutral-950">
                Assessment Details
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigDrawer(false)}
                className="text-neutral-400 hover:text-black p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                  Assessment Type <span className="text-red-500">*</span>
                </label>
                <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900">
                  {selectedAssessment}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                    Total Marks <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Math.max(1, parseInt(e.target.value) || 50))}
                    className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                    Passing Marks (Optional)
                  </label>
                  <input
                    type="number"
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(Math.max(0, parseInt(e.target.value) || 20))}
                    className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                  Exam Date <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-between bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                    <span>{examDate}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              </div>

              {/* Toggle 1: Show marks to students */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-[12px] font-semibold text-neutral-900">
                    Show marks to students
                  </div>
                  <div className="text-[10px] text-[#717684]">
                    Students and parents can view marks
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMarksToStudents(!showMarksToStudents)}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    showMarksToStudents ? 'bg-black' : 'bg-neutral-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      showMarksToStudents ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Add remarks */}
              <div className="flex items-center justify-between pt-1 border-t border-[#f3f4f6]">
                <div>
                  <div className="text-[12px] font-semibold text-neutral-900">
                    Add remarks (optional)
                  </div>
                  <div className="text-[10px] text-[#717684]">
                    Allow individual remarks for each student
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddRemarks(!addRemarks)}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    addRemarks ? 'bg-black' : 'bg-neutral-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      addRemarks ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Search Field */}
        <div className="relative flex items-center bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-2 text-[12.5px] transition focus-within:border-neutral-900 focus-within:bg-white">
          <Search className="w-4 h-4 text-neutral-400 mr-2.5 shrink-0 stroke-[1.8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name or roll number"
            className="w-full bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-neutral-400 hover:text-neutral-700 ml-1.5 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-800 flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium">{validationError}</span>
              {pendingCount > 0 && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={handleAutofillPending}
                    className="font-bold underline text-red-700 hover:text-red-900 cursor-pointer"
                  >
                    Quickly fill pending students with passing mark (35)
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-red-400 hover:text-red-800 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Student Table Header */}
        <div className="flex items-center justify-between px-1 pt-1 text-[11px] font-medium text-neutral-500 border-b border-[#f0f2f5] pb-2">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={isAllVisibleSelected}
              onClick={handleToggleSelectAll}
              className={`w-4 h-4 rounded-[4px] border flex items-center justify-center cursor-pointer transition ${
                isAllVisibleSelected
                  ? 'bg-black border-black text-white'
                  : 'border-[#d1d5db] bg-white hover:border-neutral-500'
              }`}
              title="Select / Deselect all"
            >
              {isAllVisibleSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <span className="w-5 text-center">#</span>
            <span>Student Name</span>
          </div>
          
          <div className="flex items-center gap-4 pr-1">
            <span className="text-right w-16">Marks / {totalMarks}</span>
            <span className="w-7 text-center">Status</span>
          </div>
        </div>

        {/* Student Marks List Rows */}
        <div className="divide-y divide-[#f5f6f8]">
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No students found matching "{searchQuery}"
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isChecked = selectedStudentIds.has(student.studentId);
              const isEntered =
                student.isAbsent ||
                (student.marks !== null && !isNaN(student.marks));

              return (
                <div
                  key={student.studentId}
                  className={`py-2 px-1 rounded-lg transition ${
                    isChecked ? 'bg-neutral-50/90' : 'hover:bg-neutral-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Checkbox + Roll + Avatar + Name */}
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        onClick={() => toggleStudentSelection(student.studentId)}
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center cursor-pointer shrink-0 transition ${
                          isChecked
                            ? 'bg-black border-black text-white'
                            : 'border-[#d1d5db] bg-white hover:border-neutral-500'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <span className="text-[12px] font-medium text-[#6b7280] w-5 text-center shrink-0">
                        {student.rollNo}
                      </span>

                      <img
                        src={getAssetUrl(student.avatar)}
                        alt={student.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-100"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold text-neutral-950 truncate block max-w-[110px] min-[360px]:max-w-[130px] sm:max-w-[150px]">
                          {student.name}
                        </span>
                        {/* Quick absent indicator or remarks preview */}
                        {student.isAbsent ? (
                          <span className="text-[10px] font-bold text-red-600">
                            Marked Absent
                          </span>
                        ) : addRemarks && student.remarks && student.remarks !== '-' ? (
                          <span className="text-[10px] text-neutral-500 italic truncate block max-w-[110px]">
                            {student.remarks}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: Marks Input Box + Quick Absent toggle + Status Icon */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Mark Input Box */}
                      {student.isAbsent ? (
                        <div
                          onClick={() => handleToggleAbsent(student.studentId)}
                          className="w-14 h-9 bg-neutral-100 border border-neutral-300 rounded-xl flex items-center justify-center text-xs font-bold text-neutral-600 cursor-pointer hover:bg-neutral-200"
                          title="Click to remove absent mark"
                        >
                          A
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={student.marks !== null ? student.marks : ''}
                            onChange={(e) =>
                              handleMarkChange(student.studentId, e.target.value)
                            }
                            placeholder="-"
                            className="w-14 h-9 bg-white border border-[#e5e7eb] focus:border-black rounded-xl text-center text-[13px] font-bold text-neutral-900 focus:outline-none transition shadow-2xs"
                          />
                        </div>
                      )}

                      {/* Quick Absent Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleAbsent(student.studentId)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition cursor-pointer ${
                          student.isAbsent
                            ? 'bg-neutral-800 text-white'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-500'
                        }`}
                        title={student.isAbsent ? 'Remove Absent' : 'Mark Absent'}
                      >
                        A
                      </button>

                      {/* Status Icon: Green Checkmark or Orange Clock */}
                      <div className="w-6 h-6 flex items-center justify-center">
                        {isEntered ? (
                          <div className="w-5 h-5 rounded-full bg-[#16a34a] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#f97316] text-white flex items-center justify-center shadow-xs">
                            <Clock className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional Remarks input row if expanded / enabled */}
                  {addRemarks && !student.isAbsent && (
                    <div className="mt-1.5 pl-14 pr-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Remark:
                      </span>
                      <input
                        type="text"
                        value={student.remarks === '-' ? '' : student.remarks}
                        onChange={(e) =>
                          handleRemarkChange(student.studentId, e.target.value)
                        }
                        placeholder="e.g. Good, Needs improvement"
                        className="flex-1 text-[11px] text-neutral-800 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-2 py-0.5 focus:outline-none focus:border-black"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Sticky Bottom Bar: Full-Width Continue Button */}
      <div className="shrink-0 bg-white border-t border-[#f4f5f7] px-4 pt-2.5 pb-2">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-900 active:scale-[0.99] text-white py-3 px-4 rounded-2xl transition shadow-xs cursor-pointer font-medium text-[13.5px]"
        >
          <span>Continue to Review ({marksEntered}/{totalStudents} Entered)</span>
        </button>

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-black rounded-full mx-auto mt-2 mb-0.5" />
      </div>

      {/* Confirmation Modal: Discard Unsaved Changes */}
      {showDiscardModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[320px] rounded-2xl shadow-xl p-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-neutral-950">
                Discard unsaved marks?
              </h3>
              <p className="text-[12px] text-neutral-500 mt-1 leading-snug">
                You have entered or edited student marks. If you go back now, these changes will be discarded.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="py-2.5 px-3 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardModal(false);
                  onBack();
                }}
                className="py-2.5 px-3 rounded-xl bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition cursor-pointer"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
