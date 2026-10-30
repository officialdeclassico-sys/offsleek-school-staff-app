/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  UserCheck,
  ClipboardCheck,
  Users,
  UserX,
  BarChart2,
} from 'lucide-react';
import { getParentLeaveRequests } from './services/requestsService';
import { findAttendanceRecord, getAttendanceRecords } from './services/attendanceService';
import { getStoredHomeworkRecords } from './services/homeworkService';
import { getSavedMarksRecords } from './services/marksService';
import { formatISTTime12h, useISTCurrentDate } from './utils/dateTimeUtils';
import StaffBottomNav from './components/StaffBottomNav';
import StaffStatusBar from './components/StaffStatusBar';

interface StaffDashboardProps {
  onLogout?: () => void;
  onOpenAttendance?: () => void;
  onTakeAttendance?: () => void;
  onOpenAddMarks?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenProfile?: () => void;
  onOpenMyRequests?: () => void;
  onOpenParentLeaveApprovals?: () => void;
  onOpenMyDocuments?: () => void;
  onOpenMyAttendance?: () => void;
  onLogHomework?: () => void;
}

// Scheduled periods for Ms. Priya Sharma
const SCHEDULE_ITEMS = [
  { id: 'math-1', time: '09:00 - 09:45', subject: 'Mathematics', classSection: '5 - A', isCurrent: true },
  { id: 'sci-1', time: '09:50 - 10:35', subject: 'Science', classSection: '5 - A', isCurrent: false },
  { id: 'eng-1', time: '10:50 - 11:35', subject: 'English', classSection: '5 - B', isCurrent: false },
  { id: 'math-2', time: '11:40 - 12:25', subject: 'Mathematics', classSection: '6 - A', isCurrent: false },
  { id: 'evs-1', time: '01:15 - 02:00', subject: 'EVS', classSection: '5 - A', isCurrent: false },
  { id: 'rem-1', time: '02:05 - 02:50', subject: 'Remedial Math', classSection: '5 - A', isCurrent: false },
  { id: 'staff-1', time: '02:55 - 03:30', subject: 'Staff Meeting', classSection: 'Hall', isCurrent: false },
];

export default function StaffDashboard({
  onLogout,
  onOpenAttendance,
  onTakeAttendance,
  onOpenAddMarks,
  onOpenAnnouncements,
  onOpenProfile,
  onOpenMyRequests,
  onOpenParentLeaveApprovals,
  onOpenMyDocuments,
  onOpenMyAttendance,
  onLogHomework,
}: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'Announcements' | 'Profile'>('Home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('Mathematics');
  const [pendingLeaveCount, setPendingLeaveCount] = useState(() => {
    return getParentLeaveRequests().filter((r) => r.status === 'Pending').length;
  });

  useEffect(() => {
    const updateCount = () => {
      setPendingLeaveCount(getParentLeaveRequests().filter((r) => r.status === 'Pending').length);
    };
    window.addEventListener('offsleek_parent_leave_updated', updateCount);
    return () => window.removeEventListener('offsleek_parent_leave_updated', updateCount);
  }, []);

  const { fullDateStr, todayDateKey } = useISTCurrentDate();

  // Dynamic class statistics synced with today's saved attendance if present
  const classStats = React.useMemo(() => {
    const todayRecord = findAttendanceRecord('greenwood-intl', 'Grade 5 - A', todayDateKey);
    if (todayRecord) {
      return {
        total: todayRecord.totalStudents,
        present: todayRecord.presentCount,
        absent: todayRecord.absentCount,
        onLeave: todayRecord.onLeaveCount,
      };
    }
    return {
      total: 42,
      present: 38,
      absent: 3,
      onLeave: 1,
    };
  }, [todayDateKey]);

  const recentActivityTimes = React.useMemo(() => {
    const attRecords = getAttendanceRecords();
    const latestAtt = attRecords.length > 0 ? attRecords[attRecords.length - 1] : undefined;
    const attTime =
      latestAtt && latestAtt.id !== 'att-greenwood-5a-2026-10-14'
        ? formatISTTime12h(latestAtt.updatedAt || latestAtt.savedAt)
        : '08:58 AM';

    const hwRecords = getStoredHomeworkRecords();
    const latestHw = hwRecords.length > 0 ? hwRecords[0] : undefined;
    const hwTime =
      latestHw && latestHw.id !== 'hw-20261014-01'
        ? formatISTTime12h(latestHw.updatedAt || latestHw.createdAt)
        : '10:15 AM';

    const marksRecords = getSavedMarksRecords();
    const latestMarks = marksRecords.length > 0 ? marksRecords[marksRecords.length - 1] : undefined;
    const marksTime =
      latestMarks && (latestMarks.updatedAt || latestMarks.publishedAt)
        ? formatISTTime12h(latestMarks.updatedAt || latestMarks.publishedAt)
        : '02:30 PM';

    return { attTime, hwTime, marksTime };
  }, [todayDateKey]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Toast Notification for demonstration feedback */}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-3 space-y-3">
        
        {/* A. School Header with Logo and Tagline */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200/80">
            <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5 text-neutral-900">
              <path
                d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6h10M6 10h10M6 14h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-[16px] font-bold tracking-tight text-neutral-900 leading-tight truncate">
              Greenwood International School
            </h1>
            <p className="text-[9.5px] text-neutral-500 font-normal tracking-wide">
              Learn &nbsp;•&nbsp; Grow &nbsp;•&nbsp; Belong
            </p>
          </div>
        </div>

        {/* B. Welcome Section & Staff Profile Card */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 pt-0.5">
          {/* Left Greeting */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="text-[9px] min-[360px]:text-[9.5px] sm:text-[10px] font-semibold tracking-[0.2em] text-[#8e95a2] uppercase">
              WELCOME BACK
            </div>
            <h2 className="text-[18px] min-[360px]:text-[20px] sm:text-[22px] leading-[1.18] font-bold text-[#0f172a] tracking-tight mt-0.5">
              <span className="block whitespace-nowrap">Miss Priya</span>
            </h2>
            <div className="text-[10.5px] min-[360px]:text-[11px] sm:text-[11.5px] text-[#717684] mt-1 font-normal leading-tight">
              {fullDateStr}
            </div>
          </div>

          {/* Right Staff Profile Card (No Dropdown Arrow) */}
          <div
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else showToast('Viewing Ms. Priya Sharma Profile');
            }}
            className="shrink-0 flex items-center gap-2 sm:gap-2.5 bg-white border border-[#e5e7eb] rounded-2xl p-2 sm:p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] cursor-pointer hover:border-neutral-400 transition"
          >
            <img
              src="/assets/priya-sharma.png"
              alt="Ms. Priya Sharma"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shrink-0 border border-neutral-100"
            />
            <div className="text-left leading-tight">
              <div className="text-[11.5px] sm:text-[12.5px] font-bold text-neutral-900 whitespace-nowrap">
                Ms. Priya Sharma
              </div>
              <div className="text-[10px] sm:text-[10.5px] text-[#6b7280] font-normal mt-0.5 whitespace-nowrap">
                Class Teacher
              </div>
              <div className="text-[10px] sm:text-[10.5px] text-[#6b7280] font-normal whitespace-nowrap">
                Grade 5 - A
              </div>
            </div>
          </div>
        </div>

        {/* C. Three Quick-Action Cards (Centered Icon Above Label) */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {/* Card 1: Take Attendance */}
          <button
            type="button"
            onClick={() => {
              if (onTakeAttendance) onTakeAttendance();
              else if (onOpenAttendance) onOpenAttendance();
              else showToast('Action: Opening Attendance Register');
            }}
            className="w-full min-w-0 flex flex-col items-center justify-center bg-white border border-[#e5e7eb] hover:bg-neutral-50 active:scale-[0.98] py-2.5 px-1.5 rounded-2xl transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer min-h-[64px]"
          >
            <UserCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-neutral-900 stroke-[1.8] mb-1.5" />
            <span className="text-[11px] sm:text-[11.5px] font-semibold text-neutral-900 text-center tracking-tight leading-tight whitespace-nowrap">
              Take Attendance
            </span>
          </button>

          {/* Card 2: Log Homework */}
          <button
            type="button"
            onClick={() => {
              if (onLogHomework) onLogHomework();
              else showToast('Action: Opening Homework Logger');
            }}
            className="w-full min-w-0 flex flex-col items-center justify-center bg-white border border-[#e5e7eb] hover:bg-neutral-50 active:scale-[0.98] py-2.5 px-1.5 rounded-2xl transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer min-h-[64px]"
          >
            <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-neutral-900 stroke-[1.8] mb-1.5" />
            <span className="text-[11px] sm:text-[11.5px] font-semibold text-neutral-900 text-center tracking-tight leading-tight whitespace-nowrap">
              Log Homework
            </span>
          </button>

          {/* Card 3: Add Marks */}
          <button
            type="button"
            onClick={() => {
              if (onOpenAddMarks) onOpenAddMarks();
              else showToast('Action: Opening Gradebook & Marks');
            }}
            className="w-full min-w-0 flex flex-col items-center justify-center bg-white border border-[#e5e7eb] hover:bg-neutral-50 active:scale-[0.98] py-2.5 px-1.5 rounded-2xl transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer min-h-[64px]"
          >
            <ClipboardCheck className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-neutral-900 stroke-[1.8] mb-1.5" />
            <span className="text-[11px] sm:text-[11.5px] font-semibold text-neutral-900 text-center tracking-tight leading-tight whitespace-nowrap">
              Add Marks
            </span>
          </button>
        </div>

        {/* Quick Access Section: Horizontally Scrollable Row of 5 Tiles with Full Single-Line Labels */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-neutral-900 tracking-tight">
              Quick Access
            </h3>
          </div>

          <div className="flex items-stretch gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth touch-pan-x">
            {/* 1. Parent Leave */}
            <button
              type="button"
              onClick={() => {
                if (onOpenParentLeaveApprovals) onOpenParentLeaveApprovals();
                else showToast('Action: Parent Leave Approvals');
              }}
              className="shrink-0 flex-1 min-w-[96px] sm:min-w-[104px] bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-2xl py-2.5 px-3 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98] min-h-[74px]"
            >
              <div className="relative w-7 h-7 flex items-center justify-center text-neutral-900 mb-1.5 shrink-0">
                <Users className="w-[19px] h-[19px] sm:w-5 sm:h-5 stroke-[1.85]" />
                {pendingLeaveCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#e11d48] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {pendingLeaveCount}
                  </span>
                )}
              </div>
              <span className="text-center text-[10.5px] sm:text-[11px] font-semibold text-neutral-900 leading-tight whitespace-nowrap">
                Parent Leave
              </span>
            </button>

            {/* 2. My Requests */}
            <button
              type="button"
              onClick={() => {
                if (onOpenMyRequests) onOpenMyRequests();
                else showToast('Navigation: My Requests');
              }}
              className="shrink-0 flex-1 min-w-[96px] sm:min-w-[104px] bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-2xl py-2.5 px-3 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98] min-h-[74px]"
            >
              <div className="w-7 h-7 flex items-center justify-center text-neutral-900 mb-1.5 shrink-0">
                <FileText className="w-[19px] h-[19px] sm:w-5 sm:h-5 stroke-[1.85]" />
              </div>
              <span className="text-center text-[10.5px] sm:text-[11px] font-semibold text-neutral-900 leading-tight whitespace-nowrap">
                My Requests
              </span>
            </button>

            {/* 3. My Attendance */}
            <button
              type="button"
              onClick={() => {
                if (onOpenMyAttendance) onOpenMyAttendance();
                else showToast('Action: My Staff Attendance');
              }}
              className="shrink-0 flex-1 min-w-[102px] sm:min-w-[108px] bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-2xl py-2.5 px-3 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98] min-h-[74px]"
            >
              <div className="w-7 h-7 flex items-center justify-center text-neutral-900 mb-1.5 shrink-0">
                <BarChart2 className="w-[19px] h-[19px] sm:w-5 sm:h-5 stroke-[1.85]" />
              </div>
              <span className="text-center text-[10.5px] sm:text-[11px] font-semibold text-neutral-900 leading-tight whitespace-nowrap">
                My Attendance
              </span>
            </button>

            {/* 4. My Documents */}
            <button
              type="button"
              onClick={() => {
                if (onOpenMyDocuments) onOpenMyDocuments();
                else showToast('Action: My Official Documents');
              }}
              className="shrink-0 flex-1 min-w-[102px] sm:min-w-[108px] bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-2xl py-2.5 px-3 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98] min-h-[74px]"
            >
              <div className="w-7 h-7 flex items-center justify-center text-neutral-900 mb-1.5 shrink-0">
                <FileText className="w-[19px] h-[19px] sm:w-5 sm:h-5 stroke-[1.85]" />
              </div>
              <span className="text-center text-[10.5px] sm:text-[11px] font-semibold text-neutral-900 leading-tight whitespace-nowrap">
                My Documents
              </span>
            </button>

            {/* 5. Calendar */}
            <button
              type="button"
              onClick={() => showToast('Action: School Calendar')}
              className="shrink-0 flex-1 min-w-[92px] sm:min-w-[98px] bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-2xl py-2.5 px-3 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98] min-h-[74px]"
            >
              <div className="w-7 h-7 flex items-center justify-center text-neutral-900 mb-1.5 shrink-0">
                <Calendar className="w-[19px] h-[19px] sm:w-5 sm:h-5 stroke-[1.85]" />
              </div>
              <span className="text-center text-[10.5px] sm:text-[11px] font-semibold text-neutral-900 leading-tight whitespace-nowrap">
                Calendar
              </span>
            </button>
          </div>
        </div>

        {/* D. Today's Schedule Section (Horizontally Scrollable, No View Full Day, No Arrow) */}
        <div className="bg-white border border-[#e5e7eb] rounded-[20px] sm:rounded-[22px] p-3 sm:p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <Calendar className="w-4 h-4 text-neutral-900 stroke-[2] shrink-0" />
            <h3 className="text-[14px] sm:text-[15px] font-bold text-neutral-900">
              Today's Schedule
            </h3>
          </div>

          {/* Horizontally Scrollable Subjects Container */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
            {SCHEDULE_ITEMS.map((item) => {
              const isSelected = selectedSchedule === item.subject;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedSchedule(item.subject)}
                  className={`shrink-0 w-[116px] sm:w-[122px] rounded-xl sm:rounded-2xl p-2.5 cursor-pointer transition flex flex-col justify-between h-[86px] sm:h-[92px] select-none ${
                    isSelected
                      ? 'bg-black text-white shadow-md'
                      : 'bg-[#f8f9fa] border border-[#eef0f3] text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <div
                    className={`text-[9px] sm:text-[9.5px] font-normal leading-tight truncate ${
                      isSelected ? 'text-neutral-400' : 'text-[#6b7280]'
                    }`}
                  >
                    {item.time}
                  </div>
                  <div
                    className={`text-[12px] sm:text-[12.5px] font-bold my-0.5 leading-tight truncate ${
                      isSelected ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {item.subject}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-auto pt-1">
                    <span
                      className={`text-[9.5px] sm:text-[10px] leading-none ${
                        isSelected ? 'text-neutral-300' : 'text-[#6b7280]'
                      }`}
                    >
                      {item.classSection}
                    </span>
                    {item.isCurrent && (
                      <span
                        className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-medium leading-none shrink-0 ${
                          isSelected ? 'bg-[#222] text-neutral-200' : 'bg-neutral-200 text-neutral-800'
                        }`}
                      >
                        Current
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* E. Class Overview Section (Side-by-side Icon & Number, Label Below, No View All Students) */}
        <div className="bg-white border border-[#e5e7eb] rounded-[20px] sm:rounded-[22px] p-3 sm:p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <Users className="w-4 h-4 text-neutral-900 stroke-[2] shrink-0" />
            <h3 className="text-[14px] sm:text-[15px] font-bold text-neutral-900">
              Today’s Class Overview
            </h3>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {/* Stat 1: Total */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-1.5 sm:p-2 text-center flex flex-col items-center justify-center min-w-0 h-[66px] sm:h-[70px]">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 leading-none">
                <Users className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="text-[14px] sm:text-[15px] font-bold text-neutral-900 leading-none">
                  {classStats.total}
                </span>
              </div>
              <div className="text-[9.5px] sm:text-[10.5px] text-[#4b5563] font-medium leading-tight text-center mt-1.5 w-full whitespace-nowrap truncate">
                Total
              </div>
            </div>

            {/* Stat 2: Present */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-1.5 sm:p-2 text-center flex flex-col items-center justify-center min-w-0 h-[66px] sm:h-[70px]">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 leading-none">
                <UserCheck className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="text-[14px] sm:text-[15px] font-bold text-neutral-900 leading-none">
                  {classStats.present}
                </span>
              </div>
              <div className="text-[9.5px] sm:text-[10.5px] text-[#4b5563] font-medium leading-tight text-center mt-1.5 w-full whitespace-nowrap truncate">
                Present
              </div>
            </div>

            {/* Stat 3: Absent */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-1.5 sm:p-2 text-center flex flex-col items-center justify-center min-w-0 h-[66px] sm:h-[70px]">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 leading-none">
                <UserX className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="text-[14px] sm:text-[15px] font-bold text-neutral-900 leading-none">
                  {classStats.absent}
                </span>
              </div>
              <div className="text-[9.5px] sm:text-[10.5px] text-[#4b5563] font-medium leading-tight text-center mt-1.5 w-full whitespace-nowrap truncate">
                Absent
              </div>
            </div>

            {/* Stat 4: Leave */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-1.5 sm:p-2 text-center flex flex-col items-center justify-center min-w-0 h-[66px] sm:h-[70px]">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 leading-none">
                <Clock className="w-3.5 h-3.5 text-neutral-800 stroke-[2] shrink-0" />
                <span className="text-[14px] sm:text-[15px] font-bold text-neutral-900 leading-none">
                  {classStats.onLeave}
                </span>
              </div>
              <div className="text-[9.5px] sm:text-[10.5px] text-[#4b5563] font-medium leading-tight text-center mt-1.5 w-full whitespace-nowrap truncate">
                Leave
              </div>
            </div>
          </div>
        </div>

        {/* F. Recent Activities Section */}
        <div className="bg-white border border-[#e5e7eb] rounded-[20px] sm:rounded-[22px] p-3 sm:p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <FileText className="w-4 h-4 text-neutral-900 stroke-[2] shrink-0" />
              <h3 className="text-[14px] sm:text-[15px] font-bold text-neutral-900">
                Recent Activities
              </h3>
            </div>
            <button
              type="button"
              onClick={() => showToast('Opening Activity Logs')}
              className="text-[11px] sm:text-[11.5px] font-normal text-[#6b7280] hover:text-black transition cursor-pointer"
            >
              View All
            </button>
          </div>

          {/* Activity Rows */}
          <div className="divide-y divide-[#f0f2f5]">
            {/* Row 1 */}
            <div
              onClick={() => showToast('Activity: Attendance 5 - A details')}
              className="flex items-start sm:items-center justify-between py-2 gap-2 cursor-pointer hover:bg-neutral-50 px-1 rounded-lg transition"
            >
              <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
                <Calendar className="w-4 h-4 text-[#6b7280] stroke-[1.8] shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-[11.5px] sm:text-[12px] font-medium text-neutral-900 leading-snug break-words">
                  Attendance marked for 5 - A
                </span>
              </div>
              <span className="text-[10px] sm:text-[10.5px] text-[#8e95a2] font-normal shrink-0 whitespace-nowrap self-start sm:self-center mt-0.5 sm:mt-0">
                {recentActivityTimes.attTime}
              </span>
            </div>

            {/* Row 2 */}
            <div
              onClick={() => showToast('Activity: Mathematics homework details')}
              className="flex items-start sm:items-center justify-between py-2 gap-2 cursor-pointer hover:bg-neutral-50 px-1 rounded-lg transition"
            >
              <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-[#6b7280] stroke-[1.8] shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-[11.5px] sm:text-[12px] font-medium text-neutral-900 leading-snug break-words">
                  Homework assigned - Mathematics
                </span>
              </div>
              <span className="text-[10px] sm:text-[10.5px] text-[#8e95a2] font-normal shrink-0 whitespace-nowrap self-start sm:self-center mt-0.5 sm:mt-0">
                {recentActivityTimes.hwTime}
              </span>
            </div>

            {/* Row 3 */}
            <div
              onClick={() => showToast('Activity: Science Unit Test 1 marks')}
              className="flex items-start sm:items-center justify-between py-2 gap-2 cursor-pointer hover:bg-neutral-50 px-1 rounded-lg transition"
            >
              <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
                <ClipboardCheck className="w-4 h-4 text-[#6b7280] stroke-[1.8] shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-[11.5px] sm:text-[12px] font-medium text-neutral-900 leading-snug break-words">
                  Marks updated - Unit Test 1 (Science)
                </span>
              </div>
              <span className="text-[10px] sm:text-[10.5px] text-[#8e95a2] font-normal shrink-0 whitespace-nowrap self-start sm:self-center mt-0.5 sm:mt-0">
                {recentActivityTimes.marksTime}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* G. Fixed Bottom Navigation Bar (4 Tabs: Home, Attendance, Announcements, Profile) */}
      <StaffBottomNav
        activeTab="Home"
        onNavigateHome={() => setActiveTab('Home')}
        onNavigateAttendance={() => {
          setActiveTab('Attendance');
          if (onOpenAttendance) onOpenAttendance();
          else showToast('Navigation: Attendance');
        }}
        onNavigateAnnouncements={() => {
          setActiveTab('Announcements');
          if (onOpenAnnouncements) onOpenAnnouncements();
          else showToast('Navigation: Announcements');
        }}
        onNavigateProfile={() => {
          setActiveTab('Profile');
          if (onOpenProfile) {
            onOpenProfile();
          } else if (onLogout) {
            showToast('Signed out of Staff Session');
            setTimeout(() => onLogout(), 700);
          } else {
            showToast('Navigation: Staff Profile');
          }
        }}
      />

    </div>
  );
}
