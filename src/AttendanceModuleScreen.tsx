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
  Edit3,
  Send,
  Home,
  Megaphone,
  FileText,
  User,
  ArrowUpDown,
  X,
  Check,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  StudentMonthlySummary,
  ClassMonthlySummary,
  getStudentMonthlySummaries,
  getStudentMonthlySummary,
  getClassMonthlySummary,
  updateStudentDayAttendance,
  publishStudentMonthlyAttendance,
  ASSIGNED_CLASSES,
  TiedInsightItem,
} from './services/attendanceService';
import StaffBottomNav from './components/StaffBottomNav';
import {
  useISTCurrentDate,
  parseMonthYearToYearMonth,
  getRecentAndSurroundingMonthYears,
} from './utils/dateTimeUtils';

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
  const { monthYearStr } = useISTCurrentDate();

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

  const monthKey = useMemo(() => {
    return parseMonthYearToYearMonth(selectedMonth).monthKey;
  }, [selectedMonth]);

  const monthOptions = useMemo(() => {
    return getRecentAndSurroundingMonthYears();
  }, [monthYearStr]);

  // Dropdown open states
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Search & Sorting for Screen 1
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'default' | 'desc' | 'asc'>('default');

  // Interactive Modals
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionSelectedDate, setCorrectionSelectedDate] = useState<string | null>(null);
  const [correctionWorkingStatus, setCorrectionWorkingStatus] = useState<'P' | 'A' | 'L'>('P');

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [tieModalData, setTieModalData] = useState<{
    title: string;
    students: TiedInsightItem[];
  } | null>(null);

  // Data Refresh Trigger
  const [dataVersion, setDataVersion] = useState(0);

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
          src={avatar}
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

  // Correction handling
  const handleOpenCorrection = () => {
    if (!activeStudent || activeStudent.dailyRecords.length === 0) return;
    const firstDay = activeStudent.dailyRecords[0];
    setCorrectionSelectedDate(firstDay.date);
    setCorrectionWorkingStatus(firstDay.status);
    setShowCorrectionModal(true);
  };

  const handleApplyCorrection = () => {
    if (!activeStudent || !correctionSelectedDate) return;
    try {
      updateStudentDayAttendance(
        activeStudent.studentId,
        selectedGrade,
        monthKey,
        correctionSelectedDate,
        correctionWorkingStatus
      );
      setDataVersion((v) => v + 1);
      setShowCorrectionModal(false);
      showToast(`Attendance updated for ${correctionSelectedDate}`);
    } catch (err) {
      showToast('Failed to update record');
    }
  };

  // Publishing handling
  const handlePublish = () => {
    if (!activeStudent) return;
    const res = publishStudentMonthlyAttendance(activeStudent.studentId, selectedGrade, monthKey);
    setDataVersion((v) => v + 1);
    setShowPublishModal(false);
    showToast(res.message);
  };

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
      {/* SCREEN 2: INDIVIDUAL STUDENT ATTENDANCE SUMMARY                           */}
      {/* ========================================================================= */}
      {selectedStudentId && activeStudent ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Top Bar with Standardized Back Chevron */}
          <div className="px-4 pt-3 pb-2 border-b border-[#f3f4f6] shrink-0">
            <div className="flex items-start gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
                aria-label="Back to Students list"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-[22px] sm:text-[24px] font-extrabold text-neutral-950 tracking-tight leading-tight">
                  Student Attendance
                </h1>
                <p className="text-[12px] sm:text-[12.5px] text-[#717684] mt-0.5">
                  View monthly attendance details
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
            {/* Student Profile Card */}
            <div className="bg-[#fcfdfd] border border-[#e5e7eb] rounded-2xl p-3 flex items-center gap-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              {renderStudentAvatar(activeStudent.avatar, activeStudent.name, 'w-13 h-13 text-base')}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-neutral-950 truncate">
                    {activeStudent.name}
                  </h3>
                  {activeStudent.isPublished && (
                    <span className="text-[10px] font-bold text-neutral-800 bg-[#f8f9fa] border border-neutral-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <img
                        src="/assets/Dark Verified Check Badge.png"
                        alt="Verified"
                        className="w-3 h-3 object-contain shrink-0"
                      />
                      <span>Published</span>
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#717684] mt-0.5">
                  {activeStudent.grade} &nbsp;|&nbsp; Roll No. {activeStudent.rollNo}
                </p>
              </div>
            </div>

            {/* 4 Stat Summary Cards in a Row */}
            <div className="grid grid-cols-4 gap-2">
              {/* Stat 1: Total Working Days */}
              <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl py-2.5 px-1.5 flex flex-col items-center justify-center text-center">
                <span className="text-[19px] font-black text-neutral-900 leading-none">
                  {activeStudent.totalWorkingDays}
                </span>
                <span className="text-[9px] sm:text-[9.5px] text-[#717684] font-medium mt-1 leading-tight">
                  Total<br />Working Days
                </span>
              </div>

              {/* Stat 2: Present */}
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl py-2.5 px-1.5 flex flex-col items-center justify-center text-center">
                <span className="text-[19px] font-black text-[#16a34a] leading-none">
                  {activeStudent.presentDays}
                </span>
                <span className="text-[9px] sm:text-[9.5px] text-[#717684] font-medium mt-1 leading-tight">
                  Present
                </span>
              </div>

              {/* Stat 3: Absent */}
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded-2xl py-2.5 px-1.5 flex flex-col items-center justify-center text-center">
                <span className="text-[19px] font-black text-[#dc2626] leading-none">
                  {activeStudent.absentDays}
                </span>
                <span className="text-[9px] sm:text-[9.5px] text-[#717684] font-medium mt-1 leading-tight">
                  Absent
                </span>
              </div>

              {/* Stat 4: On Leave */}
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl py-2.5 px-1.5 flex flex-col items-center justify-center text-center">
                <span className="text-[19px] font-black text-[#2563eb] leading-none">
                  {activeStudent.onLeaveDays}
                </span>
                <span className="text-[9px] sm:text-[9.5px] text-[#717684] font-medium mt-1 leading-tight">
                  On Leave
                </span>
              </div>
            </div>

            {/* Attendance Summary Certificate Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-3.5">
              {/* Header inside Certificate */}
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-[14px] font-bold text-neutral-900 tracking-tight">
                  Attendance Summary
                </h4>
                <span className="text-[11.5px] font-medium text-[#717684]">
                  {activeStudent.monthName}
                </span>
              </div>

              {/* School Branding Row */}
              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                  <School className="w-4.5 h-4.5 stroke-[2]" />
                </div>
                <div>
                  <h5 className="text-[12.5px] font-bold text-neutral-950 leading-tight">
                    Greenwood
                  </h5>
                  <p className="text-[11.5px] font-medium text-neutral-800 leading-tight">
                    International School
                  </p>
                </div>
              </div>

              {/* Student Identification sub-block */}
              <div className="flex items-center gap-3 pt-1">
                {renderStudentAvatar(activeStudent.avatar, activeStudent.name, 'w-11 h-11 text-sm')}
                <div>
                  <h5 className="text-[13.5px] font-bold text-neutral-950">
                    {activeStudent.name}
                  </h5>
                  <p className="text-[11px] text-[#717684]">
                    {activeStudent.grade} &nbsp;|&nbsp; Roll No. {activeStudent.rollNo}
                  </p>
                  <p className="text-[10.5px] text-[#717684]">
                    Class Teacher: {activeStudent.teacherName}
                  </p>
                </div>
              </div>

              {/* Summary Table */}
              <div className="border border-[#e5e7eb] rounded-xl overflow-hidden text-[12px]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e7eb] bg-white">
                  <span className="text-neutral-700 font-medium">Total Working Days</span>
                  <span className="font-bold text-neutral-950">{activeStudent.totalWorkingDays}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e7eb] bg-white">
                  <span className="text-neutral-700 font-medium">Present Days</span>
                  <span className="font-bold text-neutral-950">{activeStudent.presentDays}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e7eb] bg-white">
                  <span className="text-neutral-700 font-medium">Absent Days</span>
                  <span className="font-bold text-neutral-950">{activeStudent.absentDays}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e7eb] bg-white">
                  <span className="text-neutral-700 font-medium">On Leave Days</span>
                  <span className="font-bold text-neutral-950">{activeStudent.onLeaveDays}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-[#f0fdf4] font-bold">
                  <span className="text-neutral-900">Attendance Percentage</span>
                  <span className="text-[13.5px] text-[#16a34a] font-black">
                    {activeStudent.attendancePercentage}%
                  </span>
                </div>
              </div>

              {/* Remarks and Teacher Signature Section */}
              <div className="flex items-end justify-between pt-2">
                <div className="max-w-[190px]">
                  <span className="text-[10.5px] font-bold text-neutral-900 block uppercase tracking-wider">
                    Remarks
                  </span>
                  <p className="text-[11.5px] text-[#6b7280] italic mt-0.5 leading-snug">
                    {activeStudent.remarks}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  {/* Stylized Handwritten Signature */}
                  <div className="h-6 flex items-center pr-1 opacity-80">
                    <span className="font-serif italic text-[16px] text-neutral-900 tracking-tighter select-none font-bold">
                      Priya S.
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-neutral-900 mt-0.5 leading-none">
                    {activeStudent.teacherName}
                  </span>
                  <span className="text-[9.5px] text-[#717684] mt-0.5 leading-none">
                    {activeStudent.teacherRole}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Fixed Action Buttons */}
          <div className="p-3 border-t border-[#f0f2f5] bg-white shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Correct Attendance Button */}
              <button
                type="button"
                onClick={handleOpenCorrection}
                className="w-full flex items-center justify-center gap-2 border border-neutral-900 text-neutral-900 hover:bg-neutral-50 active:scale-[0.98] py-2.5 px-3 rounded-2xl text-[12.5px] font-bold transition cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-4 h-4 stroke-[2]" />
                <span>Correct Attendance</span>
              </button>

              {/* Publish Button */}
              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-neutral-800 active:scale-[0.98] py-2.5 px-3 rounded-2xl text-[12.5px] font-bold transition cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4 stroke-[2]" />
                <span>{activeStudent.isPublished ? 'Re-Publish' : 'Publish'}</span>
              </button>
            </div>

            {/* iOS Home Indicator */}
            <div className="w-24 sm:w-32 h-1 bg-black rounded-full mx-auto mt-1" />
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
      {/* MODAL 1: CORRECT ATTENDANCE                                               */}
      {/* ========================================================================= */}
      {showCorrectionModal && activeStudent && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[370px] rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f2f5]">
              <div>
                <h3 className="text-[15px] font-bold text-neutral-950 leading-tight">
                  Correct Attendance
                </h3>
                <p className="text-[11px] text-[#717684]">
                  {activeStudent.name} • {activeStudent.grade}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
              <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
                Select Working Day to Update
              </span>

              {/* List of Working Days */}
              <div className="grid grid-cols-4 gap-1.5 max-h-[180px] overflow-y-auto p-1 border border-[#e5e7eb] rounded-xl">
                {activeStudent.dailyRecords.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      setCorrectionSelectedDate(d.date);
                      setCorrectionWorkingStatus(d.status);
                    }}
                    className={`py-1.5 px-1 rounded-lg text-center text-[10.5px] font-semibold transition border cursor-pointer ${
                      correctionSelectedDate === d.date
                        ? 'bg-black text-white border-black'
                        : d.status === 'P'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : d.status === 'A'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <div>{d.dayName} {d.dayNumber}</div>
                    <div className="text-[9px] font-bold uppercase mt-0.5">
                      {d.status === 'P' ? 'Present' : d.status === 'A' ? 'Absent' : 'Leave'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Status Radio options for the selected day */}
              {correctionSelectedDate && (
                <div className="bg-[#f8f9fa] p-3 rounded-2xl border border-[#e5e7eb] space-y-2">
                  <span className="text-[11.5px] font-bold text-neutral-900 block">
                    Update status for {correctionSelectedDate}:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectionWorkingStatus('P')}
                      className={`py-2 rounded-xl text-[11.5px] font-bold border transition ${
                        correctionWorkingStatus === 'P'
                          ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-xs'
                          : 'bg-white text-neutral-800 border-[#e5e7eb]'
                      }`}
                    >
                      P (Present)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCorrectionWorkingStatus('A')}
                      className={`py-2 rounded-xl text-[11.5px] font-bold border transition ${
                        correctionWorkingStatus === 'A'
                          ? 'bg-[#dc2626] text-white border-[#dc2626] shadow-xs'
                          : 'bg-white text-neutral-800 border-[#e5e7eb]'
                      }`}
                    >
                      A (Absent)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCorrectionWorkingStatus('L')}
                      className={`py-2 rounded-xl text-[11.5px] font-bold border transition ${
                        correctionWorkingStatus === 'L'
                          ? 'bg-[#d97706] text-white border-[#d97706] shadow-xs'
                          : 'bg-white text-neutral-800 border-[#e5e7eb]'
                      }`}
                    >
                      L (Leave)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#f0f2f5] flex gap-2">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="flex-1 py-2 text-[12px] font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCorrection}
                className="flex-1 py-2 text-[12px] font-bold bg-black text-white hover:bg-neutral-800 rounded-xl shadow-xs"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PUBLISH CONFIRMATION                                             */}
      {/* ========================================================================= */}
      {showPublishModal && activeStudent && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[340px] rounded-3xl shadow-2xl p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-3">
              <Send className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-[16px] font-bold text-neutral-950">
              Publish Monthly Record
            </h3>
            <p className="text-[12px] text-[#717684] mt-1 leading-relaxed">
              Are you sure you want to officially publish the {activeStudent.monthName} attendance
              summary for <span className="font-bold text-neutral-900">{activeStudent.name}</span> ({activeStudent.attendancePercentage}%)?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="flex-1 py-2.5 text-[12px] font-bold text-neutral-700 hover:bg-neutral-100 rounded-xl border border-neutral-200"
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="flex-1 py-2.5 text-[12px] font-bold bg-black text-white hover:bg-neutral-800 rounded-xl shadow-xs"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
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
