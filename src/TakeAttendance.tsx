/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Calendar,
  Users,
  Search,
  Check,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Clock,
  Info,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  AttendanceStatusCode,
  saveOrUpdateAttendance,
  findAttendanceRecord,
  ASSIGNED_CLASSES,
  getInitialStudentsForGrade,
} from './services/attendanceService';
import StaffStatusBar from './components/StaffStatusBar';
import OffsleekDropdown from './components/OffsleekDropdown';
import { useISTCurrentDate } from './utils/dateTimeUtils';
import { getAssetUrl } from './utils/assetUtils';

interface StatusOptionConfig {
  code: AttendanceStatusCode;
  label: string;
  activeClass: string;
  legendBadgeClass: string;
  isWide?: boolean;
}

const ATTENDANCE_STATUS_OPTIONS: StatusOptionConfig[] = [
  {
    code: 'P',
    label: 'Present',
    activeClass: 'bg-[#15803d] border border-[#15803d]',
    legendBadgeClass: 'bg-[#15803d]',
  },
  {
    code: 'A',
    label: 'Absent',
    activeClass: 'bg-[#dc2626] border border-[#dc2626]',
    legendBadgeClass: 'bg-[#dc2626]',
  },
  {
    code: 'L',
    label: 'Leave',
    activeClass: 'bg-[#f59e0b] border border-[#f59e0b]',
    legendBadgeClass: 'bg-[#f59e0b]',
  },
  {
    code: 'LT',
    label: 'Late',
    activeClass: 'bg-[#ea580c] border border-[#ea580c]',
    legendBadgeClass: 'bg-[#ea580c]',
    isWide: true,
  },
  {
    code: 'H',
    label: 'Half Day',
    activeClass: 'bg-[#7c3aed] border border-[#7c3aed]',
    legendBadgeClass: 'bg-[#7c3aed]',
  },
];

const STATUS_LABEL_MAP: Record<AttendanceStatusCode, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Leave',
  LT: 'Late',
  H: 'Half Day',
};

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

  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const dateNoticeRef = useRef<HTMLDivElement>(null);

  // Dismiss inline date-policy notice on outside click or Escape
  useEffect(() => {
    if (!showDateModal) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dateTriggerRef.current?.contains(target);
      const inNotice = dateNoticeRef.current?.contains(target);
      if (!inTrigger && !inNotice) {
        setShowDateModal(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDateModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDateModal]);

  // When staff switches assigned class
  const handleSelectClass = (gradeName: string) => {
    setSelectedGrade(gradeName);
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

  // Real-time calculated attendance counts across all five statuses
  const presentCount = useMemo(
    () => students.filter((s) => s.status === 'P').length,
    [students]
  );
  const absentCount = useMemo(
    () => students.filter((s) => s.status === 'A').length,
    [students]
  );
  const leaveCount = useMemo(
    () => students.filter((s) => s.status === 'L').length,
    [students]
  );
  const lateCount = useMemo(
    () => students.filter((s) => s.status === 'LT').length,
    [students]
  );
  const halfDayCount = useMemo(
    () => students.filter((s) => s.status === 'H').length,
    [students]
  );

  // Status toggle handler for P, A, L, LT, H
  const handleStatusChange = (studentId: string, status: AttendanceStatusCode) => {
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
  const handleBulkStatusChange = (status: AttendanceStatusCode) => {
    setValidationError(null);
    setStudents((prev) =>
      prev.map((s) => (selectedStudentIds.has(s.id) ? { ...s, status } : s))
    );
    showToast(
      `Marked ${selectedStudentIds.size} student${
        selectedStudentIds.size > 1 ? 's' : ''
      } as ${STATUS_LABEL_MAP[status]}`
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

        {/* Compact Horizontal Status Legend */}
        <div
          aria-label="Attendance status legend"
          className="bg-[#f4f4fa] border border-[#e9eaf4] rounded-xl px-2 py-1.5"
        >
          <div className="flex flex-wrap items-center justify-between sm:justify-center gap-x-1 sm:gap-x-1.5 gap-y-1">
            {ATTENDANCE_STATUS_OPTIONS.map((opt, idx) => (
              <React.Fragment key={opt.code}>
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[4px] text-[8.5px] font-bold text-white leading-none ${opt.legendBadgeClass}`}
                  >
                    {opt.code}
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] font-medium text-neutral-800">
                    {opt.label}
                  </span>
                </div>
                {idx < ATTENDANCE_STATUS_OPTIONS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="h-3 w-px bg-neutral-300/80 shrink-0"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Date and Class Selectors (2 columns side by side) */}
        <div className="space-y-2 relative z-30">
          <div className="grid grid-cols-2 gap-2">
            {/* Date Selector */}
            <button
              ref={dateTriggerRef}
              type="button"
              aria-expanded={showDateModal}
              aria-controls="attendance-date-policy-notice"
              aria-label={`Attendance date ${dateStr}. Tap to view date policy`}
              onClick={() => setShowDateModal((prev) => !prev)}
              className="offsleek-dropdown-trigger w-full flex items-center justify-between gap-2 bg-white border border-[#e5e7eb] px-2.5 py-2 text-[12px] font-semibold text-black shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Calendar className="w-3.5 h-3.5 text-black stroke-[2] shrink-0" />
                <span className="truncate">{dateStr}</span>
              </div>
              <Info
                aria-hidden="true"
                className="w-3.5 h-3.5 text-black stroke-[2] shrink-0"
              />
            </button>

            {/* Assigned Class Selector */}
            <OffsleekDropdown
              size="sm"
              value={selectedGrade}
              options={ASSIGNED_CLASSES.map((cls) => ({
                value: cls.name,
                label: cls.name,
                description: `${cls.role} • ${cls.studentCount} students`,
              }))}
              onChange={handleSelectClass}
              icon={<Users className="w-3.5 h-3.5 stroke-[2]" />}
              ariaLabel="Select assigned class"
            />
          </div>

          {/* Compact Inline Attendance Date Policy Notice (Non-overlapping) */}
          {showDateModal && (
            <div
              ref={dateNoticeRef}
              id="attendance-date-policy-notice"
              role="note"
              className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-2 flex items-start gap-2 text-neutral-800 animate-in fade-in duration-150"
            >
              <Info className="w-3.5 h-3.5 text-neutral-700 stroke-[2] shrink-0 mt-0.5" />
              <p className="flex-1 min-w-0 text-[11px] text-[#4b5563] leading-snug">
                Attendance can only be recorded for today in accordance with school policy. Past or future dates cannot be recorded.
              </p>
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                aria-label="Close attendance date policy notice"
                className="text-neutral-400 hover:text-black p-0.5 -mr-0.5 shrink-0 cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 5 Attendance Summary Cards (Present, Absent, Leave, Late, Half Day) */}
        <div className="grid grid-cols-5 gap-1.5">
          {/* Card 1: Present */}
          <div className="bg-[#effaf3] border border-[#c8ecd5] rounded-2xl px-1 py-2 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-[#15803d] stroke-[2]" />
            <div className="text-[17px] sm:text-[18px] font-bold text-neutral-950 leading-none tabular-nums mt-1">
              {presentCount}
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-[#15803d] font-medium mt-1 leading-tight whitespace-nowrap">
              Present
            </div>
          </div>

          {/* Card 2: Absent */}
          <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl px-1 py-2 text-center flex flex-col items-center justify-center">
            <XCircle className="w-4 h-4 text-[#dc2626] stroke-[2]" />
            <div className="text-[17px] sm:text-[18px] font-bold text-neutral-950 leading-none tabular-nums mt-1">
              {absentCount}
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-[#dc2626] font-medium mt-1 leading-tight whitespace-nowrap">
              Absent
            </div>
          </div>

          {/* Card 3: Leave */}
          <div className="bg-[#fefce8] border border-[#fde68a] rounded-2xl px-1 py-2 text-center flex flex-col items-center justify-center">
            <Calendar className="w-4 h-4 text-[#d97706] stroke-[2]" />
            <div className="text-[17px] sm:text-[18px] font-bold text-neutral-950 leading-none tabular-nums mt-1">
              {leaveCount}
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-[#b45309] font-medium mt-1 leading-tight whitespace-nowrap">
              Leave
            </div>
          </div>

          {/* Card 4: Late */}
          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-2xl px-1 py-2 text-center flex flex-col items-center justify-center">
            <Clock className="w-4 h-4 text-[#ea580c] stroke-[2]" />
            <div className="text-[17px] sm:text-[18px] font-bold text-neutral-950 leading-none tabular-nums mt-1">
              {lateCount}
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-[#c2410c] font-medium mt-1 leading-tight whitespace-nowrap">
              Late
            </div>
          </div>

          {/* Card 5: Half Day */}
          <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl px-1 py-2 text-center flex flex-col items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-[#7c3aed]"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M12 3a9 9 0 0 0 0 18V3z" fill="currentColor" />
            </svg>
            <div className="text-[17px] sm:text-[18px] font-bold text-neutral-950 leading-none tabular-nums mt-1">
              {halfDayCount}
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-[#6d28d9] font-medium mt-1 leading-tight whitespace-nowrap">
              Half Day
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
          <div className="bg-neutral-900 text-white rounded-xl px-2.5 py-2 text-xs flex items-center justify-between gap-2 shadow-md animate-in fade-in duration-150">
            <span className="font-semibold text-[11px] whitespace-nowrap">
              {selectedStudentIds.size} selected
            </span>
            <div className="flex items-center gap-1 flex-nowrap">
              {ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleBulkStatusChange(opt.code)}
                  className="bg-white/20 hover:bg-white/30 text-white px-1.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition whitespace-nowrap"
                  title={`Mark selected ${opt.label}`}
                >
                  {opt.code}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="text-neutral-400 hover:text-white ml-0.5 p-0.5 cursor-pointer"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Student Table Header */}
        <div className="flex items-center justify-between gap-2 px-1 pt-0.5 text-[11px] font-medium text-neutral-500 border-b border-[#f0f2f5] pb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-9 text-center shrink-0 whitespace-nowrap">Roll No.</span>
            <span>Student Name</span>
          </div>
          <span className="w-[152px] sm:w-[162px] text-center shrink-0">Status</span>
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
                  className={`flex items-center justify-between gap-2 py-2 px-1 rounded-lg transition ${
                    isChecked ? 'bg-neutral-50/90' : 'hover:bg-neutral-50/40'
                  }`}
                >
                  {/* Left Column: Roll + Avatar + Student Name */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[12px] font-medium text-[#6b7280] w-9 text-center shrink-0 whitespace-nowrap tabular-nums">
                      {student.rollNo}
                    </span>

                    <img
                      src={getAssetUrl(student.avatar)}
                      alt={student.name}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 border border-neutral-100"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />

                    <span className="text-[12.5px] sm:text-[13px] font-semibold text-neutral-950 truncate flex-1 min-w-0">
                      {student.name}
                    </span>
                  </div>

                  {/* Right Column: Five Compact Status Buttons: P | A | L | LT | H */}
                  <div
                    role="radiogroup"
                    aria-label={`Attendance status for ${student.name}`}
                    className="flex items-center justify-end gap-1 shrink-0 flex-nowrap"
                  >
                    {ATTENDANCE_STATUS_OPTIONS.map((option) => {
                      const isSelected = student.status === option.code;
                      return (
                        <button
                          key={option.code}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`${student.name} - ${option.label}`}
                          title={option.label}
                          onClick={() => handleStatusChange(student.id, option.code)}
                          className={`${
                            option.isWide
                              ? 'min-w-[32px] sm:min-w-[34px] h-[26px] sm:h-7 px-1.5'
                              : 'w-[26px] h-[26px] sm:w-7 sm:h-7'
                          } rounded-full flex items-center justify-center text-[10.5px] sm:text-[11px] font-bold leading-none whitespace-nowrap shrink-0 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 ${
                            isSelected
                              ? `${option.activeClass} text-white shadow-xs`
                              : 'bg-white border border-[#e2e5eb] text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300'
                          }`}
                        >
                          {option.code}
                        </button>
                      );
                    })}
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
