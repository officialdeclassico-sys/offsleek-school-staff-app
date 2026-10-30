/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  UserCheck,
  UserX,
  Clock,
  LogIn,
  LogOut,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import { getStaffAttendance, StaffMonthlyAttendance } from './services/staffAttendanceService';
import {
  useISTCurrentDate,
  getCalendarLeadingPaddingDays,
  getRecentAndSurroundingMonthYears,
  shiftMonthYear,
} from './utils/dateTimeUtils';

interface MyAttendanceScreenProps {
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateMyRequests: () => void;
  onNavigateProfile: () => void;
}

export default function MyAttendanceScreen({
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateMyRequests,
  onNavigateProfile,
}: MyAttendanceScreenProps) {
  const { dayOfMonth, monthYearStr } = useISTCurrentDate();
  const [currentMonth, setCurrentMonth] = useState<string>(() => monthYearStr);
  const [isCustomMonth, setIsCustomMonth] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  useEffect(() => {
    if (!isCustomMonth) {
      setCurrentMonth(monthYearStr);
    }
  }, [monthYearStr, isCustomMonth]);

  const monthOptions = getRecentAndSurroundingMonthYears();
  const attendanceData: StaffMonthlyAttendance = getStaffAttendance(currentMonth);
  const leadingPaddingDays = getCalendarLeadingPaddingDays(
    attendanceData.year,
    attendanceData.monthIndex
  );
  const [selectedDay, setSelectedDay] = useState<number>(() => dayOfMonth);

  useEffect(() => {
    if (currentMonth === monthYearStr) {
      setSelectedDay(dayOfMonth);
    } else if (selectedDay > attendanceData.days.length) {
      setSelectedDay(1);
    }
  }, [currentMonth, monthYearStr, dayOfMonth, attendanceData.days.length]);

  const selectedRecord =
    attendanceData.days.find((d) => d.day === selectedDay) ||
    attendanceData.days[0];

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Top Status Bar with Dynamic Island */}
      <StaffStatusBar />

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-3.5">
        
        {/* Header: [Chevron Back] [My Attendance / View your attendance records] [Month Selector] */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-start gap-1.5 min-w-0">
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

          {/* Month Dropdown Selector Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMonthDropdown((prev) => !prev)}
              className="bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-full px-3 py-1.5 text-[12px] font-semibold text-neutral-900 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <span>{currentMonth}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
            </button>
            {showMonthDropdown && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#e5e7eb] rounded-xl shadow-lg py-1 z-30">
                {monthOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setIsCustomMonth(m !== monthYearStr);
                      setCurrentMonth(m);
                      setShowMonthDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] transition cursor-pointer ${
                      currentMonth === m
                        ? 'bg-black text-white font-bold'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Four Summary Cards Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Card 1: Present */}
          <div className="bg-[#ecfdf5]/70 border border-emerald-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
              <CalendarDays className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-[17px] sm:text-[20px] font-bold text-neutral-900 leading-none">
                {attendanceData.summary.present}
              </div>
              <div className="text-[11px] text-[#065f46] font-medium mt-1">Present</div>
            </div>
          </div>

          {/* Card 2: Absent */}
          <div className="bg-[#fef2f2]/70 border border-rose-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 mb-2">
              <UserX className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-[17px] sm:text-[20px] font-bold text-neutral-900 leading-none">
                {attendanceData.summary.absent}
              </div>
              <div className="text-[11px] text-[#991b1b] font-medium mt-1">Absent</div>
            </div>
          </div>

          {/* Card 3: Leave */}
          <div className="bg-[#fffbeb]/70 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-2">
              <Clock className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-[17px] sm:text-[20px] font-bold text-neutral-900 leading-none">
                {attendanceData.summary.leave}
              </div>
              <div className="text-[11px] text-[#92400e] font-medium mt-1">Leave</div>
            </div>
          </div>

          {/* Card 4: Holiday */}
          <div className="bg-[#eff6ff]/70 border border-blue-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 mb-2">
              <Calendar className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-[17px] sm:text-[20px] font-bold text-neutral-900 leading-none">
                {attendanceData.summary.holiday}
              </div>
              <div className="text-[11px] text-[#1e40af] font-medium mt-1">Holiday</div>
            </div>
          </div>
        </div>

        {/* Today's Attendance Card with Check-In / Check-Out and Progress Tracker */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <CalendarDays className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-[14px] sm:text-[14.5px] font-bold text-neutral-900">
                  Today's Attendance
                </h3>
                <p className="text-[11.5px] text-[#717684]">
                  {attendanceData.todayRecord.dateFormatted}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803d] bg-[#ecfdf5] border border-emerald-200 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Present</span>
            </span>
          </div>

          {/* Check-In & Check-Out Boxes */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-900 shrink-0 shadow-2xs">
                <LogIn className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div>
                <div className="text-[10.5px] text-[#6b7280] font-medium">Check In</div>
                <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 mt-0.5">
                  {attendanceData.todayRecord.checkIn}
                </div>
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-900 shrink-0 shadow-2xs">
                <LogOut className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div>
                <div className="text-[10.5px] text-[#6b7280] font-medium">Check Out</div>
                <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 mt-0.5">
                  {attendanceData.todayRecord.checkOut}
                </div>
              </div>
            </div>
          </div>

          {/* Three-Stage Progress Tracker: Submitted -> Under Review -> Approved */}
          <div className="pt-2 pb-1">
            <div className="relative w-full">
              {/* Connecting Line 1 */}
              <div className="absolute left-[16.666%] right-[50%] h-[2px] top-[10px] -translate-y-1/2 bg-black z-0" />
              {/* Connecting Line 2 */}
              <div className="absolute left-[50%] right-[16.666%] h-[2px] top-[10px] -translate-y-1/2 bg-black z-0" />

              <div className="grid grid-cols-3 relative z-10 w-full text-center">
                {/* Stage 1 */}
                <div className="flex flex-col items-center px-1">
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="text-[11px] font-bold text-neutral-900 leading-tight">Submitted</div>
                    <div className="text-[10px] text-[#6b7280] mt-0.5 whitespace-nowrap">
                      {attendanceData.todayRecord.tracker.submittedTime}
                    </div>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="flex flex-col items-center px-1">
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="text-[11px] font-bold text-neutral-900 leading-tight">Under Review</div>
                    <div className="text-[10px] text-[#8e95a2] mt-0.5 leading-tight whitespace-nowrap">
                      (Administration)
                    </div>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="flex flex-col items-center px-1">
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="mt-1.5 w-full">
                    <div className="text-[11px] font-bold text-neutral-900 leading-tight">Approved</div>
                    <div className="text-[10px] text-[#8e95a2] mt-0.5 leading-tight whitespace-nowrap">
                      (End of Day)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Calendar View */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5">
          {/* Calendar Header with Month Navigation and Legend Dots */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = shiftMonthYear(currentMonth, -1);
                  setIsCustomMonth(next !== monthYearStr);
                  setCurrentMonth(next);
                }}
                className="w-7 h-7 rounded-full bg-[#f8f9fa] border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2]" />
              </button>
              <h3 className="text-[15px] font-bold text-neutral-900 tracking-tight">
                {currentMonth}
              </h3>
              <button
                type="button"
                onClick={() => {
                  const next = shiftMonthYear(currentMonth, 1);
                  setIsCustomMonth(next !== monthYearStr);
                  setCurrentMonth(next);
                }}
                className="w-7 h-7 rounded-full bg-[#f8f9fa] border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-[#6b7280]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />Absent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Leave</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Half Day</span>
            </div>
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
            {/* Previous month trailing padding days */}
            {leadingPaddingDays.map((padDay) => (
              <span key={`pad-${padDay}`} className="text-neutral-300 py-1.5">
                {padDay}
              </span>
            ))}

            {/* Days of the active month */}
            {attendanceData.days.map((item) => {
              const isSelected = selectedDay === item.day;
              const isToday = item.isToday;

              let styleClass = 'text-neutral-800 hover:bg-neutral-100';
              let dotColor = 'bg-transparent';

              if (item.status === 'Present') {
                styleClass = 'text-neutral-900 bg-emerald-50/80 hover:bg-emerald-100/80';
                dotColor = 'bg-emerald-500';
              } else if (item.status === 'Absent') {
                styleClass = 'text-rose-700 bg-rose-50/80 hover:bg-rose-100/80';
                dotColor = 'bg-rose-500';
              } else if (item.status === 'Leave') {
                styleClass = 'text-amber-800 bg-amber-50/80 hover:bg-amber-100/80';
                dotColor = 'bg-amber-500';
              } else if (item.status === 'Half Day') {
                styleClass = 'text-blue-800 bg-blue-50/80 hover:bg-blue-100/80';
                dotColor = 'bg-blue-500';
              } else if (item.status === 'Holiday') {
                styleClass = 'text-neutral-400 bg-neutral-50';
              }

              if (isToday) {
                styleClass = 'text-white bg-black font-bold shadow-sm';
              }

              return (
                <div
                  key={item.day}
                  onClick={() => setSelectedDay(item.day)}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-full flex flex-col items-center justify-center cursor-pointer transition ${styleClass}`}
                >
                  <span className="leading-none">{item.day}</span>
                  {!isToday && item.status !== 'Holiday' && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${dotColor}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Date Details Strip */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 flex items-center justify-between text-[12px] mt-2">
            <div>
              <span className="font-bold text-neutral-900">
                {selectedRecord.day} {currentMonth} Details:
              </span>
              <span className="text-[#6b7280] ml-2">
                {selectedRecord.status} • {selectedRecord.checkIn || '08:58 AM'} - {selectedRecord.checkOut || '05:12 PM'}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
              {selectedRecord.status}
            </span>
          </div>
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
