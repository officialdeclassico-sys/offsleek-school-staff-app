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
  Users,
  Search,
  Check,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  saveOrUpdateAttendance,
  findAttendanceRecord,
  ASSIGNED_CLASSES,
  getInitialStudentsForGrade,
} from './services/attendanceService';
import StaffStatusBar from './components/StaffStatusBar';
import { useISTCurrentDate } from './utils/dateTimeUtils';
import { getAssetUrl } from './utils/assetUtils';

interface TakeAttendanceProps {
  initialRecord?: AttendanceRecord;
  onSaved: (savedRecord: AttendanceRecord) => void;
  onBack: () => void;
}

export default function TakeAttendance({
  initialRecord,
  onSaved,
  onBack,
}: TakeAttendanceProps) {
  // Assigned class selection
  const [selectedGrade, setSelectedGrade] = useState<string>(
    initialRecord ? initialRecord.grade : 'Grade 5 - A'
  );

  // Today's Date in Asia/Kolkata (auto-refreshes across midnight)
  const { shortWeekdayDateStr, todayDateKey } = useISTCurrentDate();
  const dateStr = shortWeekdayDateStr;
  const dateKey = todayDateKey;

  // Dropdown popover states
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Student roster state: initialize from initialRecord (if matching today), or existing record for today, or default roster
  const [students, setStudents] = useState<Student[]>(() => {
    if (
      initialRecord &&
      initialRecord.dateKey === dateKey &&
      initialRecord.students &&
      initialRecord.students.length > 0
    ) {
      return JSON.parse(JSON.stringify(initialRecord.students));
    }
    const existing = findAttendanceRecord('greenwood-intl', 'Grade 5 - A', dateKey);
    if (existing && existing.students && existing.students.length > 0) {
      return JSON.parse(JSON.stringify(existing.students));
    }
    return getInitialStudentsForGrade('Grade 5 - A');
  });

  // Track initial snapshot to detect unsaved changes
  const initialSnapshotRef = useRef<string>(
    JSON.stringify({
      grade: selectedGrade,
      students: students.map((s) => ({ id: s.id, status: s.status })),
    })
  );
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    const current = JSON.stringify({
      grade: selectedGrade,
      students: students.map((s) => ({ id: s.id, status: s.status })),
    });
    return current !== initialSnapshotRef.current;
  }, [selectedGrade, students]);

  // If the date rolls over at midnight and there are no unsaved edits, sync roster for the new date
  const prevDateKeyRef = useRef(dateKey);
  useEffect(() => {
    if (prevDateKeyRef.current !== dateKey) {
      prevDateKeyRef.current = dateKey;
      if (!hasUnsavedChanges) {
        const existing = findAttendanceRecord('greenwood-intl', selectedGrade, dateKey);
        const loaded =
          existing && existing.students && existing.students.length > 0
            ? JSON.parse(JSON.stringify(existing.students))
            : getInitialStudentsForGrade(selectedGrade);
        setStudents(loaded);
        initialSnapshotRef.current = JSON.stringify({
          grade: selectedGrade,
          students: loaded.map((s: Student) => ({ id: s.id, status: s.status })),
        });
      }
    }
  }, [dateKey, selectedGrade, hasUnsavedChanges]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowDiscardModal(true);
    } else {
      onBack();
    }
  };

  // Selected student IDs for row/header checkboxes
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Saving state & inline validation
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const classDropdownRef = useRef<HTMLDivElement>(null);
  const dateModalRef = useRef<HTMLDivElement>(null);

  // Dismiss dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        classDropdownRef.current &&
        !classDropdownRef.current.contains(event.target as Node)
      ) {
        setShowClassDropdown(false);
      }
      if (
        dateModalRef.current &&
        !dateModalRef.current.contains(event.target as Node)
      ) {
        setShowDateModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When staff switches assigned class
  const handleSelectClass = (gradeName: string) => {
    setSelectedGrade(gradeName);
    setShowClassDropdown(false);
    setSelectedStudentIds(new Set());
    setValidationError(null);

    const existing = findAttendanceRecord('greenwood-intl', gradeName, dateKey);
    let loaded: Student[];
    if (existing && existing.students && existing.students.length > 0) {
      loaded = JSON.parse(JSON.stringify(existing.students));
      showToast(`Loaded ${gradeName} attendance record`);
    } else {
      loaded = getInitialStudentsForGrade(gradeName);
      showToast(`Switched to ${gradeName}`);
    }
    setStudents(loaded);
    initialSnapshotRef.current = JSON.stringify({
      grade: gradeName,
      students: loaded.map((s) => ({ id: s.id, status: s.status })),
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Real-time calculated attendance counts matching reference exactly
  const totalStudents = students.length;
  const presentCount = useMemo(
    () => students.filter((s) => s.status === 'P').length,
    [students]
  );
  const absentCount = useMemo(
    () => students.filter((s) => s.status === 'A').length,
    [students]
  );
  // Not Marked includes students who are on Leave or yet to be marked
  const notMarkedCount = useMemo(
    () => students.filter((s) => s.status === 'L' || s.status === null).length,
    [students]
  );

  // Status toggle handler for P, A, L
  const handleStatusChange = (studentId: string, status: 'P' | 'A' | 'L') => {
    setValidationError(null);
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
  };

  // Checkbox selection toggle for individual rows
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Filtered student list based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Header checkbox: select / deselect all visible students
  const isAllVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  // Bulk action for selected students
  const handleBulkStatusChange = (status: 'P' | 'A' | 'L') => {
    setValidationError(null);
    setStudents((prev) =>
      prev.map((s) => (selectedStudentIds.has(s.id) ? { ...s, status } : s))
    );
    showToast(
      `Marked ${selectedStudentIds.size} student${
        selectedStudentIds.size > 1 ? 's' : ''
      } as ${status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'Leave'}`
    );
    setSelectedStudentIds(new Set());
  };

  // Quick action: mark all unmarked as Present
  const handleMarkUnmarkedPresent = () => {
    setValidationError(null);
    setStudents((prev) =>
      prev.map((s) => (s.status === null ? { ...s, status: 'P' } : s))
    );
    showToast('Marked all unmarked students as Present');
  };

  // Save attendance and transition to Attendance Saved screen
  const handleSaveAttendance = () => {
    // 1. Validate that every student has an attendance status
    const unmarked = students.filter((s) => s.status === null);
    if (unmarked.length > 0) {
      setValidationError(
        `Please mark attendance for all students before saving (${unmarked.length} student${
          unmarked.length > 1 ? 's' : ''
        } unmarked).`
      );
      return;
    }

    setValidationError(null);
    setIsSaving(true);

    setTimeout(() => {
      // 2. Persist record to data layer, preventing duplicates for same school, class, and date
      const saved = saveOrUpdateAttendance({
        schoolId: 'greenwood-intl',
        schoolName: 'Greenwood International School',
        grade: selectedGrade,
        dateStr: dateStr,
        dateKey: dateKey,
        teacherName: 'Ms. Priya Sharma',
        students: students,
      });

      setIsSaving(false);

      // 3. Direct to the existing Attendance Saved screen with updated data
      onSaved(saved);
    }, 400);
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Toast Feedback */}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-2 pb-10 space-y-3">
        
        {/* Page Heading & Subtitle with Back Button (Sticky on scroll) */}
        {/* Page Heading & Subtitle with Small Back Chevron (Sticky on scroll) */}
        <div className="sticky top-0 bg-white z-20 pt-1 pb-2 border-b border-[#f4f5f7] flex items-start gap-1.5 -mx-3.5 sm:-mx-4.5 px-3.5 sm:px-4.5">
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
              Take Attendance
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] mt-0.5 font-normal">
              Mark your class attendance for today
            </p>
          </div>
        </div>

        {/* Date and Class Selectors (2 columns side by side) */}
        <div className="grid grid-cols-2 gap-2 relative">
          
          {/* Date Selector */}
          <div className="relative" ref={dateModalRef}>
            <button
              type="button"
              onClick={() => {
                setShowDateModal(!showDateModal);
                setShowClassDropdown(false);
              }}
              className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl px-3 py-2 text-[12px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition text-left"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="truncate">{dateStr}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
            </button>

            {/* Date Policy Popover */}
            {showDateModal && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl p-3 z-40 text-neutral-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#f3f4f6]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-neutral-900 stroke-[2]" />
                    <span className="text-[12px] font-bold">Attendance Date</span>
                  </div>
                  <button
                    onClick={() => setShowDateModal(false)}
                    className="text-neutral-400 hover:text-neutral-800 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-[#f8f9fa] rounded-xl p-2.5 mb-2 border border-[#edf0f4]">
                  <div className="text-[10px] text-[#717684] font-medium uppercase tracking-wider">
                    Today's Session
                  </div>
                  <div className="text-[13px] font-bold text-neutral-950 mt-0.5">
                    {dateStr}
                  </div>
                </div>
                <p className="text-[11px] text-[#6b7280] leading-snug">
                  Attendance can only be recorded for today in accordance with school policy. Past or future dates cannot be recorded.
                </p>
              </div>
            )}
          </div>

          {/* Assigned Class Selector */}
          <div className="relative" ref={classDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowClassDropdown(!showClassDropdown);
                setShowDateModal(false);
              }}
              className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl px-3 py-2 text-[12px] font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition text-left"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Users className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="truncate">{selectedGrade}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
            </button>

            {/* Assigned Classes Dropdown */}
            {showClassDropdown && (
              <div className="absolute top-full right-0 mt-1.5 w-60 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl p-1.5 z-40 text-neutral-900 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#8e95a2] uppercase tracking-wider">
                  Permitted Assigned Classes
                </div>
                <div className="space-y-1">
                  {ASSIGNED_CLASSES.map((cls) => {
                    const isSelected = selectedGrade === cls.name;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleSelectClass(cls.name)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left cursor-pointer transition ${
                          isSelected
                            ? 'bg-neutral-900 text-white'
                            : 'hover:bg-neutral-50 text-neutral-900'
                        }`}
                      >
                        <div>
                          <div className="text-[12.5px] font-bold leading-tight">
                            {cls.name}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isSelected ? 'text-neutral-300' : 'text-[#717684]'
                            }`}
                          >
                            {cls.role} • {cls.studentCount} students
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-white stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* 4 Attendance Statistics Cards */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* Card 1: Total */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[19px] sm:text-[20px] font-bold text-neutral-950 leading-none">
              {totalStudents}
            </div>
            <div className="text-[10.5px] text-[#717684] font-normal mt-1 leading-tight">
              Total
            </div>
          </div>

          {/* Card 2: Present */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[19px] sm:text-[20px] font-bold text-neutral-950 leading-none">
              {presentCount}
            </div>
            <div className="text-[10.5px] text-[#717684] font-normal mt-1 leading-tight">
              Present
            </div>
          </div>

          {/* Card 3: Absent */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[19px] sm:text-[20px] font-bold text-neutral-950 leading-none">
              {absentCount}
            </div>
            <div className="text-[10.5px] text-[#717684] font-normal mt-1 leading-tight">
              Absent
            </div>
          </div>

          {/* Card 4: Not Marked */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[19px] sm:text-[20px] font-bold text-neutral-950 leading-none">
              {notMarkedCount}
            </div>
            <div className="text-[10.5px] text-[#717684] font-normal mt-1 leading-tight">
              Not Marked
            </div>
          </div>
        </div>

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

        {/* Inline Validation Banner */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-800 flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium">{validationError}</span>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={handleMarkUnmarkedPresent}
                  className="font-bold underline text-red-700 hover:text-red-900 cursor-pointer"
                >
                  Mark all unmarked as Present
                </button>
              </div>
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

        {/* Bulk Action Pill Bar (When students are checked) */}
        {selectedStudentIds.size > 0 && (
          <div className="bg-neutral-900 text-white rounded-xl px-3 py-2 text-xs flex items-center justify-between shadow-md animate-in fade-in duration-150">
            <span className="font-semibold text-[11.5px]">
              {selectedStudentIds.size} student{selectedStudentIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleBulkStatusChange('P')}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition"
                title="Mark selected Present"
              >
                Mark P
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusChange('A')}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition"
                title="Mark selected Absent"
              >
                Mark A
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatusChange('L')}
                className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition"
                title="Mark selected Leave"
              >
                Mark L
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="text-neutral-400 hover:text-white ml-1 p-0.5 cursor-pointer"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Student Table Header */}
        <div className="flex items-center justify-between px-1 pt-1 text-[11px] font-medium text-neutral-500 border-b border-[#f0f2f5] pb-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="w-16 shrink-0 whitespace-nowrap">Roll Number</span>
            <span>Student Name</span>
          </div>
          <span className="pr-8 sm:pr-9">Status</span>
        </div>

        {/* Student List Rows */}
        <div className="divide-y divide-[#f5f6f8]">
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No students found matching "{searchQuery}"
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isChecked = selectedStudentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  className={`flex items-center justify-between py-2 px-1 rounded-lg transition ${
                    isChecked ? 'bg-neutral-50/90' : 'hover:bg-neutral-50/40'
                  }`}
                >
                  {/* Left Column: Roll + Avatar + Student Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <span className="text-[12px] font-medium text-[#6b7280] w-16 text-center shrink-0 whitespace-nowrap">
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
                    
                    <span className="text-[13px] font-semibold text-neutral-950 truncate flex-1 min-w-0">
                      {student.name}
                    </span>
                  </div>

                  {/* Right Column: Status Radio Pills: P | A | L */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Present (P) */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'P')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition cursor-pointer ${
                        student.status === 'P'
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white border border-[#e5e7eb] text-neutral-700 hover:bg-neutral-50'
                      }`}
                      title="Present"
                    >
                      P
                    </button>

                    {/* Absent (A) */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'A')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition cursor-pointer ${
                        student.status === 'A'
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white border border-[#e5e7eb] text-neutral-700 hover:bg-neutral-50'
                      }`}
                      title="Absent"
                    >
                      A
                    </button>

                    {/* On Leave (L) */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'L')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition cursor-pointer ${
                        student.status === 'L'
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white border border-[#e5e7eb] text-neutral-700 hover:bg-neutral-50'
                      }`}
                      title="On Leave"
                    >
                      L
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Sticky Bottom Bar: Full-Width Black Save Attendance Button */}
      <div className="shrink-0 bg-white border-t border-[#f4f5f7] px-4 pt-2.5 pb-2">
        <button
          type="button"
          onClick={handleSaveAttendance}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-900 active:scale-[0.99] text-white py-3 px-4 rounded-2xl transition shadow-xs cursor-pointer font-medium text-[13.5px] disabled:opacity-75"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Save Attendance &nbsp;({presentCount} Present)</span>
          )}
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
                Discard unsaved attendance?
              </h3>
              <p className="text-[12px] text-neutral-500 mt-1 leading-snug">
                You have unsaved attendance entries. If you go back now, these changes will be discarded.
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
