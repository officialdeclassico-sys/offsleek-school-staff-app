/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Timer,
  XCircle,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import {
  checkInStaffAttendance,
  checkOutStaffAttendance,
  computeSessionElapsedSeconds,
  formatDurationHHMMSS,
  StaffDayAttendance,
  StaffMonthlyAttendance,
  subscribeToStaffPersonalAttendance,
} from './services/staffAttendanceService';
import {
  getCalendarLeadingPaddingDays,
  getNow,
  useISTCurrentDate,
} from './utils/dateTimeUtils';

interface MyAttendanceScreenProps {
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateMyRequests: () => void;
  onNavigateProfile: () => void;
}

function getSelectedStatusBadgeClasses(status: StaffDayAttendance['status']): string {
  switch (status) {
    case 'Present':
      return 'text-[#15803d] bg-[#effaf3] border-[#c8ecd5]';
    case 'Absent':
      return 'text-[#dc2626] bg-[#fff1f2] border-[#fecdd3]';
    case 'Leave':
      return 'text-[#b45309] bg-[#fefce8] border-[#fde68a]';
    case 'Late':
      return 'text-[#c2410c] bg-[#fff7ed] border-[#fed7aa]';
    case 'Half Day':
      return 'text-[#6d28d9] bg-[#f5f3ff] border-[#ddd6fe]';
    default:
      return 'text-neutral-600 bg-neutral-100 border-neutral-200';
  }
}

export default function MyAttendanceScreen({
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateMyRequests,
  onNavigateProfile,
}: MyAttendanceScreenProps) {
  const { dayOfMonth, monthYearStr, todayDateKey } = useISTCurrentDate();
  const [currentMonth, setCurrentMonth] = useState<string>(() => monthYearStr);
  const [isCustomMonth, setIsCustomMonth] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(() => dayOfMonth);

  const [attendanceData, setAttendanceData] = useState<StaffMonthlyAttendance | null>(null);
  const [actionLoading, setActionLoading] = useState<'checkin' | 'checkout' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nowTickMs, setNowTickMs] = useState<number>(() => getNow().getTime());

  // Automatically follow current IST month across midnight/month boundaries unless user selected a past operational month
  useEffect(() => {
    if (!isCustomMonth) {
      setCurrentMonth(monthYearStr);
    }
  }, [monthYearStr, isCustomMonth]);

  // Subscribe to real-time personal attendance + calendar holidays + midnight rollover
  useEffect(() => {
    const unsubscribe = subscribeToStaffPersonalAttendance(
      {
        month: currentMonth,
        todayDateKey,
      },
      (view) => {
        setAttendanceData(view);
        if (view.month !== currentMonth) {
          setCurrentMonth(view.month);
          setIsCustomMonth(view.month !== monthYearStr);
        }
      }
    );
    return unsubscribe;
  }, [currentMonth, todayDateKey, monthYearStr]);

  // 1-second timer tick ONLY while actively checked in (stops immediately after check-out)
  const isActivelyCheckedIn = attendanceData?.todayRecord.sessionState === 'CHECKED_IN';
  useEffect(() => {
    setNowTickMs(getNow().getTime());
    if (!isActivelyCheckedIn) return;
    const intervalId = window.setInterval(() => {
      setNowTickMs(getNow().getTime());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isActivelyCheckedIn, attendanceData?.todayRecord.checkInAtMs]);

  // Keep selected day synchronized on current IST day changes and valid within month length
  useEffect(() => {
    if (!isCustomMonth && currentMonth === monthYearStr) {
      setSelectedDay(dayOfMonth);
    }
  }, [todayDateKey, dayOfMonth, monthYearStr, currentMonth, isCustomMonth]);

  useEffect(() => {
    if (!attendanceData) return;
    if (selectedDay > attendanceData.days.length || selectedDay < 1) {
      setSelectedDay(1);
    }
  }, [attendanceData, selectedDay]);

  const leadingPaddingDays = useMemo(() => {
    if (!attendanceData) return [];
    return getCalendarLeadingPaddingDays(attendanceData.year, attendanceData.monthIndex);
  }, [attendanceData]);

  const selectedRecord: StaffDayAttendance | null = useMemo(() => {
    if (!attendanceData || attendanceData.days.length === 0) return null;
    return (
      attendanceData.days.find((d) => d.day === selectedDay) ||
      attendanceData.days[0]
    );
  }, [attendanceData, selectedDay]);

  const liveElapsedSeconds = useMemo(() => {
    if (!attendanceData) return 0;
    const rec = attendanceData.todayRecord.record;
    if (!rec) return 0;
    return computeSessionElapsedSeconds(rec, nowTickMs);
  }, [attendanceData, nowTickMs]);

  const formattedSessionTimer = useMemo(
    () => formatDurationHHMMSS(liveElapsedSeconds),
    [liveElapsedSeconds]
  );

  const handleCheckIn = async () => {
    if (!attendanceData?.todayRecord.canCheckIn || actionLoading) return;
    setActionError(null);
    setActionLoading('checkin');
    try {
      await checkInStaffAttendance();
      setNowTickMs(getNow().getTime());
      if (currentMonth === monthYearStr) {
        setSelectedDay(dayOfMonth);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to record check-in.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceData?.todayRecord.canCheckOut || actionLoading) return;
    setActionError(null);
    setActionLoading('checkout');
    try {
      await checkOutStaffAttendance();
      setNowTickMs(getNow().getTime());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to record check-out.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrevMonth = () => {
    if (!attendanceData?.prevOperationalMonth) return;
    const prev = attendanceData.prevOperationalMonth;
    setIsCustomMonth(prev !== monthYearStr);
    setCurrentMonth(prev);
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (!attendanceData?.nextOperationalMonth) return;
    const next = attendanceData.nextOperationalMonth;
    setIsCustomMonth(next !== monthYearStr);
    setCurrentMonth(next);
    setSelectedDay(next === monthYearStr ? dayOfMonth : 1);
  };

  if (!attendanceData) {
    return (
      <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
        <StaffStatusBar />
        <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
          Loading attendance records...
        </div>
        <StaffBottomNav
          activeTab="Home"
          onNavigateHome={onNavigateHome}
          onNavigateAttendance={onNavigateAttendance}
          onNavigateAnnouncements={onNavigateAnnouncements}
          onNavigateMyRequests={onNavigateMyRequests}
          onNavigateProfile={onNavigateProfile}
        />
      </div>
    );
  }

  const { todayRecord, summary } = attendanceData;

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      {/* Top Status Bar */}
      <StaffStatusBar />

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-3.5">
        {/* 1. Page Header (No month dropdown beside heading) */}
        <div className="flex items-start gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={onNavigateHome}
            className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
            aria-label="Back to Home"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-900 tracking-tight leading-tight">
              My Attendance
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
              View your attendance records
            </p>
          </div>
        </div>

        {/* 2. Five Attendance Summary Boxes in One Single Horizontal Row on Mobile */}
        <div
          className="grid grid-cols-5 gap-1.5"
          aria-label="Monthly attendance summary"
        >
          {/* 1. Present (Green) */}
          <div className="bg-[#effaf3] border border-[#c8ecd5] rounded-2xl px-0.5 py-2 sm:py-2.5 text-center flex flex-col items-center justify-center min-w-0 min-h-[68px] sm:min-h-[72px]">
            <CheckCircle2 className="w-4 h-4 text-[#15803d] stroke-[2] shrink-0" />
            <div className="text-[15px] sm:text-[16px] font-bold text-neutral-950 leading-none tabular-nums mt-1.5">
              {summary.present}
            </div>
            <div className="text-[9px] min-[390px]:text-[9.5px] font-semibold text-[#15803d] leading-tight mt-1 whitespace-nowrap">
              Present
            </div>
          </div>

          {/* 2. Absent (Red) */}
          <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl px-0.5 py-2 sm:py-2.5 text-center flex flex-col items-center justify-center min-w-0 min-h-[68px] sm:min-h-[72px]">
            <XCircle className="w-4 h-4 text-[#dc2626] stroke-[2] shrink-0" />
            <div className="text-[15px] sm:text-[16px] font-bold text-neutral-950 leading-none tabular-nums mt-1.5">
              {summary.absent}
            </div>
            <div className="text-[9px] min-[390px]:text-[9.5px] font-semibold text-[#dc2626] leading-tight mt-1 whitespace-nowrap">
              Absent
            </div>
          </div>

          {/* 3. Leave (Amber/Yellow) */}
          <div className="bg-[#fefce8] border border-[#fde68a] rounded-2xl px-0.5 py-2 sm:py-2.5 text-center flex flex-col items-center justify-center min-w-0 min-h-[68px] sm:min-h-[72px]">
            <Calendar className="w-4 h-4 text-[#d97706] stroke-[2] shrink-0" />
            <div className="text-[15px] sm:text-[16px] font-bold text-neutral-950 leading-none tabular-nums mt-1.5">
              {summary.leave}
            </div>
            <div className="text-[9px] min-[390px]:text-[9.5px] font-semibold text-[#b45309] leading-tight mt-1 whitespace-nowrap">
              Leave
            </div>
          </div>

          {/* 4. Late (Orange) */}
          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-2xl px-0.5 py-2 sm:py-2.5 text-center flex flex-col items-center justify-center min-w-0 min-h-[68px] sm:min-h-[72px]">
            <Clock className="w-4 h-4 text-[#ea580c] stroke-[2] shrink-0" />
            <div className="text-[15px] sm:text-[16px] font-bold text-neutral-950 leading-none tabular-nums mt-1.5">
              {summary.late}
            </div>
            <div className="text-[9px] min-[390px]:text-[9.5px] font-semibold text-[#c2410c] leading-tight mt-1 whitespace-nowrap">
              Late
            </div>
          </div>

          {/* 5. Half Day (Purple - exact Staff Homepage Today's Class Overview styling & icon) */}
          <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-2xl px-0.5 py-2 sm:py-2.5 text-center flex flex-col items-center justify-center min-w-0 min-h-[68px] sm:min-h-[72px]">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-[#7c3aed] shrink-0"
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
            <div className="text-[15px] sm:text-[16px] font-bold text-neutral-950 leading-none tabular-nums mt-1.5">
              {summary.halfDay}
            </div>
            <div className="text-[9px] min-[390px]:text-[9.5px] font-semibold text-[#6d28d9] leading-tight mt-1 whitespace-nowrap">
              Half Day
            </div>
          </div>
        </div>

        {/* 3. Today's Attendance Card with Simple Live Check-In / Check-Out Timer */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
          {/* Card Header + Simple Elapsed Timer (Clock/Stopwatch Icon + Duration Only) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#f8f9fa] border border-[#e5e7eb] flex items-center justify-center text-neutral-900 shrink-0">
                <CalendarDays className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[14px] sm:text-[14.5px] font-bold text-neutral-900 leading-tight">
                  Today's Attendance
                </h3>
                <p className="text-[11.5px] text-[#717684] truncate mt-0.5">
                  {todayRecord.dateFormatted}
                </p>
              </div>
            </div>

            <div
              className="inline-flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e7eb] px-2.5 py-1.5 rounded-xl shrink-0"
              aria-label="Session elapsed timer"
            >
              <Timer className="w-3.5 h-3.5 text-neutral-800 stroke-[2]" />
              <span className="text-[12.5px] font-bold text-neutral-950 tabular-nums tracking-tight">
                {formattedSessionTimer}
              </span>
            </div>
          </div>

          {/* Check-In & Check-Out Time Displays + Interactive Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-900 shrink-0 shadow-2xs">
                  <LogIn className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10.5px] text-[#6b7280] font-medium">Check In</div>
                  <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 mt-0.5 tabular-nums">
                    {todayRecord.checkInDisplay}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!todayRecord.canCheckIn || actionLoading !== null}
                onClick={handleCheckIn}
                className={`w-full py-2 px-3 rounded-xl text-[12px] font-semibold transition flex items-center justify-center gap-1.5 ${
                  todayRecord.canCheckIn && actionLoading === null
                    ? 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98] cursor-pointer'
                    : 'bg-neutral-200/80 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 stroke-[2]" />
                <span>{actionLoading === 'checkin' ? 'Checking In...' : 'Check In'}</span>
              </button>
            </div>

            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-900 shrink-0 shadow-2xs">
                  <LogOut className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10.5px] text-[#6b7280] font-medium">Check Out</div>
                  <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 mt-0.5 tabular-nums">
                    {todayRecord.checkOutDisplay}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!todayRecord.canCheckOut || actionLoading !== null}
                onClick={handleCheckOut}
                className={`w-full py-2 px-3 rounded-xl text-[12px] font-semibold transition flex items-center justify-center gap-1.5 ${
                  todayRecord.canCheckOut && actionLoading === null
                    ? 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98] cursor-pointer'
                    : 'bg-neutral-200/80 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2]" />
                <span>{actionLoading === 'checkout' ? 'Checking Out...' : 'Check Out'}</span>
              </button>
            </div>
          </div>

          {actionError && (
            <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#dc2626] rounded-xl px-3 py-2 text-[11px] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
        </div>

        {/* 4. Monthly Calendar View (Centered < Month Year >, No Legend, Operational & Non-Future Restrictions) */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
          {/* Centered Month Navigation Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={!attendanceData.prevOperationalMonth}
              onClick={handlePrevMonth}
              className={`w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center transition ${
                attendanceData.prevOperationalMonth
                  ? 'bg-[#f8f9fa] text-neutral-800 hover:bg-neutral-100 active:scale-95 cursor-pointer'
                  : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
              }`}
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2]" />
            </button>

            <h3 className="flex-1 text-center text-[15px] font-bold text-neutral-900 tracking-tight">
              {attendanceData.month}
            </h3>

            <button
              type="button"
              disabled={!attendanceData.nextOperationalMonth}
              onClick={handleNextMonth}
              className={`w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center transition ${
                attendanceData.nextOperationalMonth
                  ? 'bg-[#f8f9fa] text-neutral-800 hover:bg-neutral-100 active:scale-95 cursor-pointer'
                  : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
              }`}
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#8e95a2] pt-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-y-2 text-center text-[12.5px] font-medium pt-1">
            {leadingPaddingDays.map((padDay) => (
              <span key={`pad-${padDay}`} className="text-neutral-300 py-1.5">
                {padDay}
              </span>
            ))}

            {attendanceData.days.map((item) => {
              const isSelected = selectedDay === item.day;
              const isToday = item.isToday;

              let styleClass = 'text-neutral-700 hover:bg-neutral-100';
              let dotColor = 'bg-transparent';

              if (!item.isOperational || item.isFuture) {
                styleClass = 'text-neutral-300 hover:bg-neutral-50';
              } else if (item.status === 'Present') {
                styleClass = 'text-[#15803d] bg-[#effaf3] hover:bg-emerald-100/80';
                dotColor = 'bg-[#16a34a]';
              } else if (item.status === 'Absent') {
                styleClass = 'text-[#dc2626] bg-[#fff1f2] hover:bg-rose-100/80';
                dotColor = 'bg-[#dc2626]';
              } else if (item.status === 'Leave') {
                styleClass = 'text-[#b45309] bg-[#fefce8] hover:bg-amber-100/80';
                dotColor = 'bg-[#d97706]';
              } else if (item.status === 'Late') {
                styleClass = 'text-[#c2410c] bg-[#fff7ed] hover:bg-orange-100/80';
                dotColor = 'bg-[#ea580c]';
              } else if (item.status === 'Half Day') {
                styleClass = 'text-[#6d28d9] bg-[#f5f3ff] hover:bg-purple-100/80';
                dotColor = 'bg-[#7c3aed]';
              }

              if (isToday && isSelected) {
                styleClass = 'text-white bg-black font-bold shadow-sm';
              } else if (isToday) {
                styleClass = 'text-white bg-neutral-800 font-bold shadow-sm';
              } else if (isSelected) {
                styleClass = `${styleClass} ring-2 ring-black ring-offset-1 font-bold`;
              }

              return (
                <button
                  type="button"
                  key={item.day}
                  onClick={() => setSelectedDay(item.day)}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-full flex flex-col items-center justify-center cursor-pointer transition ${styleClass}`}
                  aria-label={`${item.day} ${attendanceData.month}${item.hasRecord ? ` - ${item.status}` : ''}`}
                >
                  <span className="leading-none">{item.day}</span>
                  {!isToday && item.hasRecord && dotColor !== 'bg-transparent' && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${dotColor}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Date Details Panel */}
          {selectedRecord && (
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 space-y-2 mt-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-bold text-neutral-900">
                  {selectedRecord.day} {attendanceData.month}
                </span>
                {selectedRecord.hasRecord && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getSelectedStatusBadgeClasses(
                      selectedRecord.status
                    )}`}
                  >
                    {selectedRecord.status}
                  </span>
                )}
              </div>

              {selectedRecord.hasRecord ? (
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-[11.5px]">
                  <div>
                    <span className="text-[10px] text-[#6b7280] block">Check In</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {selectedRecord.checkIn || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6b7280] block">Check Out</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {selectedRecord.checkOut || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6b7280] block">Duration</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {selectedRecord.checkIn &&
                      selectedRecord.checkOut &&
                      selectedRecord.durationFormatted
                        ? selectedRecord.durationFormatted
                        : '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11.5px] text-[#6b7280]">
                  No attendance record available for this date.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shared 5-Button Bottom Navigation */}
      <StaffBottomNav
        activeTab="Home"
        onNavigateHome={onNavigateHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateMyRequests={onNavigateMyRequests}
        onNavigateProfile={onNavigateProfile}
      />
    </div>
  );
}
