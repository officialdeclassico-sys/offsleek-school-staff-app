/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Search,
  School,
  Award,
  UserX,
  Clock,
  CheckCircle2,
  Users,
  ArrowUpDown,
  X,
  Check,
  Info,
} from 'lucide-react';
import {
  AttendanceStatusCode,
  DailyAttendanceStatus,
  StudentMonthlySummary,
  ClassMonthlySummary,
  getStudentMonthlySummaries,
  getStudentMonthlySummary,
  getClassMonthlySummary,
  ASSIGNED_CLASSES,
  TiedInsightItem,
} from './services/attendanceService';
import {
  buildDateKey,
  getDaysInMonthUTC,
  getMonthLeadingPaddingDaysUTC,
} from './services/calendarService';
import StaffBottomNav from './components/StaffBottomNav';
import {
  useISTCurrentDate,
  parseMonthYearToYearMonth,
  formatMonthKeyToMonthYear,
  formatISTShortWeekdayDate,
  parseDateKeySafe,
  getRecentAndSurroundingMonthYears,
} from './utils/dateTimeUtils';
import { getAssetUrl } from './utils/assetUtils';

const CALENDAR_WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const STUDENT_STATUS_META: Record<
  AttendanceStatusCode,
  {
    label: string;
    dotClass: string;
    selectedDotClass: string;
    pillClass: string;
  }
> = {
  P: {
    label: 'Present',
    dotClass: 'bg-[#15803d]',
    selectedDotClass: 'bg-[#34d399]',
    pillClass: 'bg-[#effaf3] text-[#15803d] border border-[#bbf7d0]',
  },
  A: {
    label: 'Absent',
    dotClass: 'bg-[#dc2626]',
    selectedDotClass: 'bg-[#f87171]',
    pillClass: 'bg-[#fff1f2] text-[#dc2626] border border-[#fecdd3]',
  },
  L: {
    label: 'Leave',
    dotClass: 'bg-[#f59e0b]',
    selectedDotClass: 'bg-[#fbbf24]',
    pillClass: 'bg-[#fefce8] text-[#b45309] border border-[#fde68a]',
  },
  LT: {
    label: 'Late',
    dotClass: 'bg-[#ea580c]',
    selectedDotClass: 'bg-[#fb923c]',
    pillClass: 'bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]',
  },
  H: {
    label: 'Half Day',
    dotClass: 'bg-[#7c3aed]',
    selectedDotClass: 'bg-[#a78bfa]',
    pillClass: 'bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe]',
  },
};

interface AttendanceModuleScreenProps {
  onNavigateHome: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateProfile: () => void;
  onNavigateMyRequests?: () => void;
  onLogout: () => void;
  initialTab?: 'STUDENTS' | 'CLASS_SUMMARY';
  initialStudentId?: string;
}

export default function AttendanceModuleScreen({
  onNavigateHome,
  onNavigateAnnouncements,
  onNavigateProfile,
  onNavigateMyRequests,
  onLogout,
  initialTab = 'STUDENTS',
  initialStudentId,
}: AttendanceModuleScreenProps) {
  const { monthYearStr, todayDateKey } = useISTCurrentDate();

  // Navigation & Sub-views state
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'CLASS_SUMMARY'>(initialTab);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId || null);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState('Grade 5 - A');
  const [selectedMonth, setSelectedMonth] = useState(() => monthYearStr);
  const [isCustomMonth, setIsCustomMonth] = useState(false);

  useEffect(() => {
    if (!isCustomMonth) {
      setSelectedMonth(monthYearStr);
    }
  }, [monthYearStr, isCustomMonth]);

  const parsedSelectedMonth = useMemo(() => {
    return parseMonthYearToYearMonth(selectedMonth);
  }, [selectedMonth]);

  const monthKey = parsedSelectedMonth.monthKey;

  const monthOptions = useMemo(() => {
    return getRecentAndSurroundingMonthYears();
  }, [monthYearStr]);

  // Selected date within Student Attendance monthly calendar
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string>(todayDateKey);

  // Dropdown open states
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Search & Sorting for Screen 1
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'desc' | 'asc'>('default');

  // Toast & Tie insights modal
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [tieModalData, setTieModalData] = useState<{
    title: string;
    students: TiedInsightItem[];
  } | null>(null);

  // Data Refresh Trigger (syncs with storage updates from Take Attendance)
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const handleStorage = () => setDataVersion((v) => v + 1);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Monthly summaries
  const studentSummaries: StudentMonthlySummary[] = useMemo(() => {
    return getStudentMonthlySummaries(selectedGrade, monthKey);
  }, [selectedGrade, monthKey, dataVersion]);

  // Active student summary for Screen 2
  const activeStudent: StudentMonthlySummary | undefined = useMemo(() => {
    if (!selectedStudentId) return undefined;
    return getStudentMonthlySummary(selectedStudentId, selectedGrade, monthKey);
  }, [selectedStudentId, selectedGrade, monthKey, dataVersion]);

  // Class summary for Screen 3
  const classSummary: ClassMonthlySummary = useMemo(() => {
    return getClassMonthlySummary(selectedGrade, monthKey);
  }, [selectedGrade, monthKey, dataVersion]);

  // Filtered & Sorted Student List for Screen 1
  const filteredStudents = useMemo(() => {
    let list = studentSummaries.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.rollNo.includes(q);
    });

    if (sortOrder === 'desc') {
      list = [...list].sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    } else if (sortOrder === 'asc') {
      list = [...list].sort((a, b) => a.attendancePercentage - b.attendancePercentage);
    }
    return list;
  }, [studentSummaries, searchQuery, sortOrder]);

  const toggleSortOrder = () => {
    if (sortOrder === 'default') setSortOrder('desc');
    else if (sortOrder === 'desc') setSortOrder('asc');
    else setSortOrder('default');
  };

  // Helper for percentage pill styling
  const getPercentageBadgeStyle = (pct: number) => {
    if (pct >= 85) {
      return 'bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0]/60';
    } else if (pct >= 75) {
      return 'bg-[#fef3c7] text-[#d97706] border border-[#fde68a]/60';
    } else {
      return 'bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]/60';
    }
  };

  // Helper to render student avatar or letter fallback
  const renderStudentAvatar = (avatar: string, name: string, sizeClass: string = 'w-8 h-8 text-xs') => {
    if (avatar) {
      return (
        <img
          src={getAssetUrl(avatar)}
          alt={name}
          className={`${sizeClass} rounded-full object-cover shrink-0 border border-neutral-100 shadow-2xs`}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return (
      <div
        className={`${sizeClass} rounded-full bg-[#f3f4f6] text-neutral-800 font-bold flex items-center justify-center shrink-0 border border-[#e5e7eb] shadow-2xs`}
      >
        {initial}
      </div>
    );
  };

  // Default selected calendar date when opening a student or switching month
  useEffect(() => {
    if (!selectedStudentId || !activeStudent) return;
    if (monthKey === todayDateKey.slice(0, 7)) {
      setSelectedCalendarDateKey(todayDateKey);
    } else if (activeStudent.dailyRecords.length > 0) {
      setSelectedCalendarDateKey(activeStudent.dailyRecords[0].date);
    } else {
      setSelectedCalendarDateKey(`${monthKey}-01`);
    }
  }, [selectedStudentId, monthKey, todayDateKey]);

  const handleShiftStudentMonth = (deltaMonths: number) => {
    const shifted = new Date(
      Date.UTC(parsedSelectedMonth.year, parsedSelectedMonth.monthIndex + deltaMonths, 1, 12, 0, 0)
    );
    const nextKey = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
    const nextLabel = formatMonthKeyToMonthYear(nextKey);
    setIsCustomMonth(nextLabel !== monthYearStr);
    setSelectedMonth(nextLabel);
  };

  // Daily record lookup map for the active student's calendar month
  const activeStudentDailyMap = useMemo(() => {
    const map = new Map<string, DailyAttendanceStatus>();
    if (!activeStudent) return map;
    for (const rec of activeStudent.dailyRecords) {
      map.set(rec.date, rec);
    }
    return map;
  }, [activeStudent]);

  const effectiveSelectedDateKey = useMemo(() => {
    if (selectedCalendarDateKey.startsWith(`${monthKey}-`)) {
      return selectedCalendarDateKey;
    }
    if (monthKey === todayDateKey.slice(0, 7)) {
      return todayDateKey;
    }
    if (activeStudent && activeStudent.dailyRecords.length > 0) {
      return activeStudent.dailyRecords[0].date;
    }
    return `${monthKey}-01`;
  }, [selectedCalendarDateKey, monthKey, todayDateKey, activeStudent]);

  // Calendar grid geometry for the viewed month (UTC-anchored)
  const calendarGridData = useMemo(() => {
    const { year, monthIndex } = parsedSelectedMonth;
    const daysInMonth = getDaysInMonthUTC(year, monthIndex);
    const leadingPadding = getMonthLeadingPaddingDaysUTC(year, monthIndex);
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return { year, monthIndex, leadingCount: leadingPadding.length, days };
  }, [parsedSelectedMonth]);

  return (
    <div className="relative w-full h-full bg-white flex flex-col font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-neutral-900 text-white text-[12px] font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: INDIVIDUAL STUDENT OVERALL ATTENDANCE                           */}
      {/* ========================================================================= */}
      {selectedStudentId && activeStudent ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* 1. Student Attendance Heading */}
          <div className="px-4 pt-3 pb-2 border-b border-[#f3f4f6] shrink-0">
            <div className="flex items-start gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
                aria-label="Back to Attendance list"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] sm:text-[22px] font-extrabold text-neutral-950 tracking-tight leading-tight">
                  Student Attendance
                </h1>
                <p className="text-[12px] text-[#717684] mt-0.5">
                  View monthly attendance details
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-3 no-scrollbar">
            {/* 2. Student Profile & Overall Attendance Percentage Badge */}
            <div className="bg-[#fcfdfd] border border-[#e5e7eb] rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {renderStudentAvatar(activeStudent.avatar, activeStudent.name, 'w-11 h-11 text-sm')}
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-bold text-neutral-950 truncate leading-snug">
                    {activeStudent.name}
                  </h2>
                  <p className="text-[11.5px] text-[#717684] mt-0.5 truncate">
                    {activeStudent.grade} &nbsp;|&nbsp; Roll No. {activeStudent.rollNo}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 tabular-nums ${getPercentageBadgeStyle(
                  activeStudent.attendancePercentage
                )}`}
              >
                {activeStudent.attendancePercentage}% Overall
              </span>
            </div>

            {/* 3. Six Compact Attendance Summary Boxes in ONE Horizontal Row */}
            <div className="grid grid-cols-6 gap-1 items-stretch">
              {/* 1. Total Days (Neutral grey) */}
              <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-0.5 py-2 min-h-[60px] flex flex-col items-center justify-center text-center">
                <div className="h-5 flex items-center justify-center">
                  <span className="text-[15px] sm:text-[16px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {activeStudent.totalWorkingDays}
                  </span>
                </div>
                <span className="min-h-[22px] flex items-center justify-center text-[8.5px] sm:text-[9px] font-semibold text-[#525866] mt-0.5 leading-[1.15]">
                  Total Days
                </span>
              </div>

              {/* 2. Present (Green) */}
              <div className="bg-[#effaf3] border border-[#bbf7d0] rounded-xl px-0.5 py-2 min-h-[60px] flex flex-col items-center justify-center text-center">
                <div className="h-5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803d] shrink-0" aria-hidden="true" />
                  <span className="text-[15px] sm:text-[16px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {activeStudent.presentDays}
                  </span>
                </div>
                <span className="min-h-[22px] flex items-center justify-center text-[8.5px] sm:text-[9px] font-semibold text-[#15803d] mt-0.5 leading-[1.15]">
                  Present
                </span>
              </div>

              {/* 3. Absent (Red) */}
              <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-xl px-0.5 py-2 min-h-[60px] flex flex-col items-center justify-center text-center">
                <div className="h-5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] shrink-0" aria-hidden="true" />
                  <span className="text-[15px] sm:text-[16px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {activeStudent.absentDays}
                  </span>
                </div>
                <span className="min-h-[22px] flex items-center justify-center text-[8.5px] sm:text-[9px] font-semibold text-[#dc2626] mt-0.5 leading-[1.15]">
                  Absent
                </span>
              </div>

              {/* 4. Leave (Amber) */}
              <div className="bg-[#fefce8] border border-[#fde68a] rounded-xl px-0.5 py-2 min-h-[60px] flex flex-col items-center justify-center text-center">
                <div className="h-5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" aria-hidden="true" />
                  <span className="text-[15px] sm:text-[16px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {activeStudent.onLeaveDays}
                  </span>
                </div>
                <span className="min-h-[22px] flex items-center justify-center text-[8.5px] sm:text-[9px] font-semibold text-[#b45309] mt-0.5 leading-[1.15]">
                  Leave
                </span>
              </div>

              {/* 5. Late (Orange) */}
              <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl px-0.5 py-2 min-h-[60px] flex flex-col items-center justify-center text-center">
                <div className="h-5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] shrink-0" aria-hidden="true" />
                  <span className="text-[15px] sm:text-[16px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {activeStudent.lateDays ?? 0}
                  </span>
                </div>
                <span className="min-h-[22px] flex items-center justify-center text-[8.5px] sm:text-[9px] font-semibold text-[#c2410c] mt-0.5 leading-[1.15]">
                  Late
                </span>
              </div>

              {/* 6. Half Day (Purple) */}
              <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-xl px-0.5 py-2 min-h-[60px] flex flex-col items-center justify-center text-center">
                <div className="h-5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] shrink-0" aria-hidden="true" />
                  <span className="text-[15px] sm:text-[16px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {activeStudent.halfDayDays ?? 0}
                  </span>
                </div>
                <span className="min-h-[22px] flex items-center justify-center text-[8.5px] sm:text-[9px] font-semibold text-[#6d28d9] mt-0.5 leading-[1.15]">
                  Half Day
                </span>
              </div>
            </div>

            {/* 4 & 5. Interactive Monthly Attendance Calendar + Selected-Date Details */}
            <div className="bg-white border border-[#e5e7eb] rounded-3xl p-3.5 sm:p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between px-1 pb-2">
                <button
                  type="button"
                  onClick={() => handleShiftStudentMonth(-1)}
                  aria-label="Previous month"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-800 hover:bg-neutral-100 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <ChevronLeft className="w-4.5 h-4.5 stroke-[2.2]" />
                </button>

                <h3 className="text-[15px] font-bold text-neutral-950 tracking-tight">
                  {activeStudent.monthName}
                </h3>

                <button
                  type="button"
                  onClick={() => handleShiftStudentMonth(1)}
                  aria-label="Next month"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-800 hover:bg-neutral-100 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <ChevronRight className="w-4.5 h-4.5 stroke-[2.2]" />
                </button>
              </div>

              {/* Weekday Headings */}
              <div className="grid grid-cols-7 gap-1 pt-1 pb-1.5 text-center">
                {CALENDAR_WEEKDAYS.map((dayLabel) => (
                  <span
                    key={dayLabel}
                    className="text-[10px] font-bold text-[#8e95a2] tracking-wider"
                  >
                    {dayLabel}
                  </span>
                ))}
              </div>

              {/* Calendar Date Cells */}
              <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                {Array.from({ length: calendarGridData.leadingCount }).map((_, idx) => (
                  <div key={`lead-${idx}`} aria-hidden="true" className="h-9 sm:h-10" />
                ))}

                {calendarGridData.days.map((day) => {
                  const cellDateKey = buildDateKey(
                    calendarGridData.year,
                    calendarGridData.monthIndex,
                    day
                  );
                  const dayRecord = activeStudentDailyMap.get(cellDateKey);
                  const isSelected = effectiveSelectedDateKey === cellDateKey;
                  const isToday = todayDateKey === cellDateKey;
                  const statusMeta = dayRecord ? STUDENT_STATUS_META[dayRecord.status] : null;

                  return (
                    <div key={cellDateKey} className="flex items-center justify-center h-9 sm:h-10">
                      <button
                        type="button"
                        onClick={() => setSelectedCalendarDateKey(cellDateKey)}
                        aria-label={`${formatISTShortWeekdayDate(parseDateKeySafe(cellDateKey))}${
                          statusMeta ? ` - ${statusMeta.label}` : ' - No attendance record'
                        }`}
                        aria-pressed={isSelected}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                          isSelected
                            ? 'bg-neutral-950 text-white font-bold shadow-xs'
                            : isToday
                            ? 'bg-neutral-100 ring-1 ring-neutral-400 text-neutral-950 font-bold hover:bg-neutral-200/70'
                            : 'text-neutral-900 font-semibold hover:bg-neutral-100'
                        }`}
                      >
                        <span className="text-[12px] sm:text-[12.5px] leading-none tabular-nums">
                          {day}
                        </span>
                        {statusMeta ? (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                              isSelected ? statusMeta.selectedDotClass : statusMeta.dotClass
                            }`}
                          />
                        ) : (
                          <span className="w-1.5 h-1.5 mt-0.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Selected-Date Attendance Details (within calendar card only) */}
              {(() => {
                const selectedRecord = activeStudentDailyMap.get(effectiveSelectedDateKey);
                const selectedStatusMeta = selectedRecord
                  ? STUDENT_STATUS_META[selectedRecord.status]
                  : null;
                const selectedDateFormatted = formatISTShortWeekdayDate(
                  parseDateKeySafe(effectiveSelectedDateKey)
                );
                const isSelectedToday = effectiveSelectedDateKey === todayDateKey;

                return (
                  <div className="border-t border-[#f0f2f5] mt-3 pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[12.5px] font-bold text-neutral-950 truncate">
                        {selectedDateFormatted}
                      </span>
                      {isSelectedToday && (
                        <span className="bg-neutral-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          Today
                        </span>
                      )}
                    </div>

                    {selectedStatusMeta ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${selectedStatusMeta.pillClass}`}
                      >
                        {selectedStatusMeta.label}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 shrink-0">
                        No Record
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 6. Bottom Close Action */}
          <div className="px-4 pt-2.5 pb-2 border-t border-[#f0f2f5] bg-white shrink-0 space-y-2">
            <button
              type="button"
              onClick={() => setSelectedStudentId(null)}
              className="w-full bg-black hover:bg-neutral-900 active:scale-[0.99] text-white py-3 px-4 rounded-2xl text-[13.5px] font-bold transition cursor-pointer shadow-xs"
            >
              Close
            </button>

            {/* iOS Home Indicator */}
            <div className="w-24 sm:w-32 h-1 bg-black rounded-full mx-auto" />
          </div>
        </div>
      ) : activeTab === 'CLASS_SUMMARY' ? (
        /* ========================================================================= */
        /* SCREEN 3: MONTHLY CLASS SUMMARY                                           */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-[#f3f4f6] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('STUDENTS')}
                  className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 rounded-md hover:bg-neutral-100/60"
                  aria-label="Back to Students list"
                >
                  <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
                </button>
                <h1 className="text-[20px] sm:text-[22px] font-extrabold text-neutral-950 tracking-tight">
                  Class Summary
                </h1>
              </div>

              {/* Month Selector dropdown button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e7eb] hover:bg-neutral-100 rounded-xl px-2.5 py-1.5 text-[11.5px] font-semibold text-neutral-900 transition cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-neutral-700" />
                  <span>{selectedMonth}</span>
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                </button>

                {showMonthDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#e5e7eb] rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95">
                    {monthOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setIsCustomMonth(m !== monthYearStr);
                          setSelectedMonth(m);
                          setShowMonthDropdown(false);
                          showToast(`Viewing ${m}`);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[11.5px] transition ${
                          selectedMonth === m ? 'bg-black text-white font-bold' : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
            {/* Class Banner Card */}
            <div className="bg-[#fcfdfd] border border-[#e5e7eb] rounded-2xl p-3 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-[#e5e7eb] flex items-center justify-center shrink-0 text-neutral-900">
                <School className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold text-neutral-950 leading-tight">
                  {selectedGrade}
                </h3>
                <p className="text-[11.5px] text-[#717684] leading-tight mt-0.5">
                  Greenwood International School
                </p>
              </div>
            </div>

            {/* Section: Monthly Attendance Overview */}
            <div>
              <h2 className="text-[14px] sm:text-[14.5px] font-bold text-neutral-950 mb-2">
                Monthly Attendance Overview
              </h2>

              {/* 4 Stat Cards Grid */}
              <div className="grid grid-cols-4 gap-2">
                {/* 1. Total Working Days */}
                <div className="bg-[#f0f7ff] border border-[#bfdbfe] rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-white/80 border border-neutral-200 text-neutral-900 flex items-center justify-center mb-1">
                    <Users className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="text-[18px] sm:text-[19px] font-black text-neutral-950 leading-none">
                    {classSummary.totalStudentWorkingDays}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] text-[#717684] font-medium mt-1 leading-tight flex items-center justify-center gap-0.5">
                    Total<br />Working Days <Info className="w-2.5 h-2.5 inline" />
                  </span>
                </div>

                {/* 2. Total Present */}
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-white/80 border border-neutral-200 text-neutral-900 flex items-center justify-center mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="text-[18px] sm:text-[19px] font-black text-neutral-950 leading-none">
                    {classSummary.totalPresent}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] text-[#717684] font-medium mt-1 leading-tight">
                    Total<br />Present
                  </span>
                </div>

                {/* 3. Total Absent */}
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-white/80 border border-neutral-200 text-neutral-900 flex items-center justify-center mb-1">
                    <UserX className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="text-[18px] sm:text-[19px] font-black text-neutral-950 leading-none">
                    {classSummary.totalAbsent}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] text-[#717684] font-medium mt-1 leading-tight">
                    Total<br />Absent
                  </span>
                </div>

                {/* 4. Total On Leave */}
                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 rounded-full bg-white/80 border border-neutral-200 text-neutral-900 flex items-center justify-center mb-1">
                    <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="text-[18px] sm:text-[19px] font-black text-neutral-950 leading-none">
                    {classSummary.totalOnLeave}
                  </span>
                  <span className="text-[8.5px] sm:text-[9px] text-[#717684] font-medium mt-1 leading-tight">
                    Total<br />On Leave
                  </span>
                </div>
              </div>
            </div>

            {/* Circular Donut Gauge Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center gap-4">
              {/* Circular SVG Gauge */}
              <div className="relative w-30 h-30 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f3f4f6"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#171717"
                    strokeWidth="10"
                    strokeDasharray={`${(classSummary.overallPercentage / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[24px] font-black text-neutral-950 leading-none">
                    {classSummary.overallPercentage}%
                  </span>
                  <span className="text-[8px] text-[#717684] font-semibold leading-tight mt-1 max-w-[64px]">
                    Attendance Percentage
                  </span>
                </div>
              </div>

              {/* Right Breakdown Items */}
              <div className="flex-1 space-y-2.5 text-[12px]">
                {/* Present */}
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-[#16a34a] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-950">{classSummary.totalPresent}</span>{' '}
                    <span className="text-[#717684] text-[11px]">
                      Present (out of {classSummary.totalStudentWorkingDays})
                    </span>
                  </div>
                </div>

                {/* Absent */}
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-red-100 text-[#dc2626] flex items-center justify-center shrink-0">
                    <UserX className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-950">{classSummary.totalAbsent}</span>{' '}
                    <span className="text-[#717684] text-[11px]">
                      Absent (out of {classSummary.totalStudentWorkingDays})
                    </span>
                  </div>
                </div>

                {/* On Leave */}
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 rounded-full bg-amber-100 text-[#d97706] flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-bold text-neutral-950">{classSummary.totalOnLeave}</span>{' '}
                    <span className="text-[#717684] text-[11px]">
                      On Leave (out of {classSummary.totalStudentWorkingDays})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights Section */}
            <div>
              <div className="mb-2">
                <h2 className="text-[14px] sm:text-[14.5px] font-bold text-neutral-950">
                  Key Insights
                </h2>
                <p className="text-[11.5px] text-[#717684] mt-0.5">
                  Students with highest attendance, absence and leaves this month.
                </p>
              </div>

              {/* 3 Insight Cards Side-by-Side */}
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Most Present Student */}
                <div
                  onClick={() => {
                    if (classSummary.mostPresent.isTie) {
                      setTieModalData({
                        title: 'Most Present Students (Tied)',
                        students: classSummary.mostPresent.allStudents,
                      });
                    } else {
                      setSelectedStudentId(classSummary.mostPresent.primaryStudent.id);
                    }
                  }}
                  className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer hover:shadow-xs active:scale-[0.98] transition"
                >
                  <div className="flex items-center gap-1 text-neutral-900 mb-2">
                    <Award className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="text-[9.5px] font-bold leading-none">Most Present</span>
                  </div>
                  {renderStudentAvatar(
                    classSummary.mostPresent.primaryStudent.avatar,
                    classSummary.mostPresent.primaryStudent.name,
                    'w-11 h-11 text-sm'
                  )}
                  <span className="text-[11.5px] font-bold text-neutral-950 mt-1.5 leading-tight truncate w-full">
                    {classSummary.mostPresent.primaryStudent.name}
                  </span>
                  {classSummary.mostPresent.isTie && (
                    <span className="text-[8.5px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full mt-0.5">
                      {classSummary.mostPresent.tiedCount} students tied
                    </span>
                  )}
                  <span className="text-[12.5px] font-black text-neutral-900 mt-0.5">
                    {classSummary.mostPresent.primaryStudent.statLabel}
                  </span>
                  <div className="bg-white/80 border border-[#bbf7d0] rounded-full px-2 py-0.5 mt-1.5 w-full">
                    <span className="text-[8.5px] font-medium text-neutral-700 truncate block">
                      {classSummary.mostPresent.primaryStudent.subLabel}
                    </span>
                  </div>
                </div>

                {/* 2. Most Absent Student */}
                <div
                  onClick={() => {
                    if (classSummary.mostAbsent.isTie) {
                      setTieModalData({
                        title: 'Most Absent Students (Tied)',
                        students: classSummary.mostAbsent.allStudents,
                      });
                    } else {
                      setSelectedStudentId(classSummary.mostAbsent.primaryStudent.id);
                    }
                  }}
                  className="bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer hover:shadow-xs active:scale-[0.98] transition"
                >
                  <div className="flex items-center gap-1 text-neutral-900 mb-2">
                    <UserX className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="text-[9.5px] font-bold leading-none">Most Absent</span>
                  </div>
                  {renderStudentAvatar(
                    classSummary.mostAbsent.primaryStudent.avatar,
                    classSummary.mostAbsent.primaryStudent.name,
                    'w-11 h-11 text-sm'
                  )}
                  <span className="text-[11.5px] font-bold text-neutral-950 mt-1.5 leading-tight truncate w-full">
                    {classSummary.mostAbsent.primaryStudent.name}
                  </span>
                  {classSummary.mostAbsent.isTie && (
                    <span className="text-[8.5px] bg-red-200 text-red-800 font-bold px-1.5 py-0.2 rounded-full mt-0.5">
                      {classSummary.mostAbsent.tiedCount} students tied
                    </span>
                  )}
                  <span className="text-[12.5px] font-black text-neutral-900 mt-0.5">
                    {classSummary.mostAbsent.primaryStudent.statLabel}
                  </span>
                  <div className="bg-white/80 border border-[#fecaca] rounded-full px-2 py-0.5 mt-1.5 w-full">
                    <span className="text-[8.5px] font-medium text-neutral-700 truncate block">
                      {classSummary.mostAbsent.primaryStudent.subLabel}
                    </span>
                  </div>
                </div>

                {/* 3. Most On Leave Student */}
                <div
                  onClick={() => {
                    if (classSummary.mostOnLeave.isTie) {
                      setTieModalData({
                        title: 'Most On Leave Students (Tied)',
                        students: classSummary.mostOnLeave.allStudents,
                      });
                    } else {
                      setSelectedStudentId(classSummary.mostOnLeave.primaryStudent.id);
                    }
                  }}
                  className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer hover:shadow-xs active:scale-[0.98] transition"
                >
                  <div className="flex items-center gap-1 text-neutral-900 mb-2">
                    <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="text-[9.5px] font-bold leading-none">Most On Leave</span>
                  </div>
                  {renderStudentAvatar(
                    classSummary.mostOnLeave.primaryStudent.avatar,
                    classSummary.mostOnLeave.primaryStudent.name,
                    'w-11 h-11 text-sm'
                  )}
                  <span className="text-[11.5px] font-bold text-neutral-950 mt-1.5 leading-tight truncate w-full">
                    {classSummary.mostOnLeave.primaryStudent.name}
                  </span>
                  {classSummary.mostOnLeave.isTie && (
                    <span className="text-[8.5px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.2 rounded-full mt-0.5">
                      {classSummary.mostOnLeave.tiedCount} students tied
                    </span>
                  )}
                  <span className="text-[12.5px] font-black text-neutral-900 mt-0.5">
                    {classSummary.mostOnLeave.primaryStudent.statLabel}
                  </span>
                  <div className="bg-white/80 border border-[#fde68a] rounded-full px-2 py-0.5 mt-1.5 w-full">
                    <span className="text-[8.5px] font-medium text-neutral-700 truncate block">
                      {classSummary.mostOnLeave.primaryStudent.subLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <StaffBottomNav
            activeTab="Attendance"
            onNavigateHome={onNavigateHome}
            onNavigateAttendance={() => {}}
            onNavigateAnnouncements={onNavigateAnnouncements}
            onNavigateMyRequests={onNavigateMyRequests || (() => showToast('My Requests'))}
            onNavigateProfile={onNavigateProfile}
          />
        </div>
      ) : (
        /* ========================================================================= */
        /* SCREEN 1: STUDENT ATTENDANCE LIST (Students Tab)                          */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-[#f3f4f6] shrink-0">
            <h1 className="text-[24px] sm:text-[26px] font-extrabold text-neutral-950 tracking-tight leading-tight">
              Attendance
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] mt-0.5">
              View attendance summary and student-wise details
            </p>

            {/* Selectors Row: Grade & Month */}
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              {/* Grade Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGradeDropdown(!showGradeDropdown)}
                  className="w-full flex items-center justify-between bg-[#f8f9fa] border border-[#e5e7eb] hover:bg-neutral-100 rounded-xl px-2.5 py-2 text-[12px] font-bold text-neutral-900 transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <School className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                    <span className="truncate">{selectedGrade}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
                </button>

                {showGradeDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95">
                    {ASSIGNED_CLASSES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedGrade(c.name);
                          setShowGradeDropdown(false);
                          showToast(`Switched to ${c.name}`);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[12px] transition ${
                          selectedGrade === c.name ? 'bg-black text-white font-bold' : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {c.name} ({c.studentCount})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Month Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  className="w-full flex items-center justify-between bg-[#f8f9fa] border border-[#e5e7eb] hover:bg-neutral-100 rounded-xl px-2.5 py-2 text-[12px] font-bold text-neutral-900 transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                    <span className="truncate">{selectedMonth}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
                </button>

                {showMonthDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95">
                    {monthOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setIsCustomMonth(m !== monthYearStr);
                          setSelectedMonth(m);
                          setShowMonthDropdown(false);
                          showToast(`Viewing ${m}`);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[12px] transition ${
                          selectedMonth === m ? 'bg-black text-white font-bold' : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Segmented Control Tabs */}
            <div className="mt-2.5 bg-[#f3f4f6] p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('STUDENTS')}
                className="flex-1 py-1.5 text-[12px] font-bold rounded-lg transition text-center cursor-pointer bg-black text-white shadow-xs"
              >
                Students
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CLASS_SUMMARY')}
                className="flex-1 py-1.5 text-[12px] font-bold rounded-lg transition text-center cursor-pointer text-neutral-600 hover:text-neutral-900"
              >
                Class Summary
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-2.5">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name or roll number"
                className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl pl-9 pr-8 py-2 text-[12px] text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Header */}
          <div className="px-4 py-2 border-b border-[#f0f2f5] bg-[#fafafa] flex items-center justify-between text-[11px] font-semibold text-[#717684] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 whitespace-nowrap">Roll No.</span>
              <span>Student Name</span>
            </div>
            <button
              type="button"
              onClick={toggleSortOrder}
              className="flex items-center gap-1 hover:text-neutral-900 cursor-pointer pr-5"
              title="Click to sort by attendance percentage"
            >
              <span>Attendance %</span>
              <ArrowUpDown className="w-3 h-3 text-neutral-500" />
            </button>
          </div>

          {/* Student List Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f3f4f6] no-scrollbar">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-[#717684] text-[12.5px]">
                No student records found matching "{searchQuery}".
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.studentId}
                  onClick={() => setSelectedStudentId(student.studentId)}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition cursor-pointer group"
                >
                  {/* Left: Roll No + Avatar + Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <span className="w-12 text-center text-[12.5px] font-semibold text-neutral-700 shrink-0 whitespace-nowrap">
                      {student.rollNo}
                    </span>
                    {renderStudentAvatar(student.avatar, student.name, 'w-8 h-8 text-xs')}
                    <span className="text-[13px] font-bold text-neutral-900 truncate flex-1 min-w-0">
                      {student.name}
                    </span>
                  </div>

                  {/* Right: Attendance % Badge + Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-bold ${getPercentageBadgeStyle(
                        student.attendancePercentage
                      )}`}
                    >
                      {student.attendancePercentage}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Navigation */}
          <StaffBottomNav
            activeTab="Attendance"
            onNavigateHome={onNavigateHome}
            onNavigateAttendance={() => {}}
            onNavigateAnnouncements={onNavigateAnnouncements}
            onNavigateMyRequests={onNavigateMyRequests || (() => showToast('My Requests'))}
            onNavigateProfile={onNavigateProfile}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TIED STUDENTS LIST                                               */}
      {/* ========================================================================= */}
      {tieModalData && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[350px] rounded-3xl shadow-2xl p-4 flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between pb-2 border-b border-[#f0f2f5]">
              <h3 className="text-[14.5px] font-bold text-neutral-950">
                {tieModalData.title}
              </h3>
              <button
                type="button"
                onClick={() => setTieModalData(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 divide-y divide-[#f3f4f6]">
              {tieModalData.students.map((st) => (
                <div
                  key={st.id}
                  onClick={() => {
                    setTieModalData(null);
                    setSelectedStudentId(st.id);
                  }}
                  className="py-2 px-1 flex items-center justify-between hover:bg-neutral-50 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {renderStudentAvatar(st.avatar, st.name, 'w-8 h-8 text-xs')}
                    <div>
                      <h4 className="text-[12.5px] font-bold text-neutral-900 leading-tight">
                        {st.name}
                      </h4>
                      <p className="text-[10.5px] text-[#717684]">Roll No. {st.rollNo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-black text-neutral-900">{st.statLabel}</span>
                    <p className="text-[9.5px] text-[#717684]">{st.subLabel}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTieModalData(null)}
              className="mt-2 w-full py-2 text-[12px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
