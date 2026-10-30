/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Edit3,
  BarChart2,
  Users,
  FileText,
  Home,
  ChevronRight,
} from 'lucide-react';
import { AttendanceRecord } from './services/attendanceService';
import AnimatedStaffVerifiedBadge from './components/AnimatedStaffVerifiedBadge';
import StaffStatusBar from './components/StaffStatusBar';
import { triggerSuccessFeedback } from './utils/feedback';

interface AttendanceSavedProps {
  record: AttendanceRecord;
  onEdit: () => void;
  onViewReport: () => void;
  onBackToHome: () => void;
}

export default function AttendanceSaved({
  record,
  onEdit,
  onViewReport,
  onBackToHome,
}: AttendanceSavedProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    triggerSuccessFeedback();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const absentStudents = record.students.filter((s) => s.status === 'A');
  const onLeaveStudents = record.students.filter((s) => s.status === 'L');

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-3.5 right-3.5 z-50 bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <StaffStatusBar />

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 sm:px-5 pt-3 pb-4 space-y-3.5">
        
        {/* Status Banner */}
        <div className="flex items-center gap-3.5 pt-1">
          {/* Animated Dark Verified Check Badge */}
          <AnimatedStaffVerifiedBadge
            size="md"
            alt="Attendance Saved & Verified"
          />
          <div>
            <h1 className="text-[21px] font-bold text-neutral-950 leading-tight">
              Attendance Saved
            </h1>
            <p className="text-[12px] text-[#717684] mt-0.5 leading-snug">
              {record.grade} attendance has been marked successfully.
            </p>
          </div>
        </div>

        {/* Date and Grade Row */}
        <div className="flex items-center justify-between text-[13px] font-semibold text-neutral-900 pt-0.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-neutral-800 stroke-[2]" />
            <span>{record.dateStr}</span>
          </div>
          <div>
            <span>{record.grade}</span>
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-4 gap-2">
          {/* Total */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[18px] font-bold text-neutral-950 leading-none">
              {record.totalStudents}
            </div>
            <div className="text-[11px] text-[#717684] font-normal mt-1 leading-tight">
              Total
            </div>
          </div>

          {/* Present */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[18px] font-bold text-neutral-950 leading-none">
              {record.presentCount}
            </div>
            <div className="text-[11px] text-[#717684] font-normal mt-1 leading-tight">
              Present
            </div>
          </div>

          {/* Absent */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[18px] font-bold text-neutral-950 leading-none">
              {record.absentCount}
            </div>
            <div className="text-[11px] text-[#717684] font-normal mt-1 leading-tight">
              Absent
            </div>
          </div>

          {/* On Leave */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
            <div className="text-[18px] font-bold text-neutral-950 leading-none">
              {record.onLeaveCount}
            </div>
            <div className="text-[11px] text-[#717684] font-normal mt-1 leading-tight">
              On Leave
            </div>
          </div>
        </div>

        {/* Two Action Buttons: Edit Attendance & View Class Report */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* Edit Attendance Button */}
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 bg-white border border-[#d1d5db] hover:bg-neutral-50 active:scale-[0.98] py-2.5 px-3 rounded-xl transition shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-neutral-900 stroke-[2]" />
            <span className="text-[13px] font-semibold text-neutral-900 tracking-tight">
              Edit Attendance
            </span>
          </button>

          {/* View Class Report Button */}
          <button
            type="button"
            onClick={onViewReport}
            className="flex items-center justify-center gap-1.5 bg-black hover:bg-neutral-850 active:scale-[0.98] py-2.5 px-3 rounded-xl transition shadow-xs text-white cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-white stroke-[2]" />
            <span className="text-[13px] font-semibold text-white tracking-tight">
              View Class Report
            </span>
          </button>
        </div>

        {/* Section: Absent Students */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-900 stroke-[2]" />
              <h3 className="text-[13.5px] font-bold text-neutral-950">
                Absent Students ({absentStudents.length})
              </h3>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 stroke-[2]" />
          </div>

          {/* Absent Students List */}
          {absentStudents.length === 0 ? (
            <div className="py-3 text-center text-xs text-neutral-500">
              No students absent today
            </div>
          ) : (
            <div className="divide-y divide-[#f5f6f8]">
              {absentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[12px] font-medium text-neutral-600 w-5">
                      {student.rollNo}
                    </span>
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-100"
                    />
                    <span className="text-[13px] font-medium text-neutral-950 truncate">
                      {student.name}
                    </span>
                  </div>
                  <span className="bg-[#f4f5f7] text-[#6b7280] text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0">
                    Absent
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: On Leave */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-900 stroke-[2]" />
              <h3 className="text-[13.5px] font-bold text-neutral-950">
                On Leave ({onLeaveStudents.length})
              </h3>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 stroke-[2]" />
          </div>

          {/* On Leave Students List */}
          {onLeaveStudents.length === 0 ? (
            <div className="py-3 text-center text-xs text-neutral-500">
              No students on leave today
            </div>
          ) : (
            <div className="divide-y divide-[#f5f6f8]">
              {onLeaveStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[12px] font-medium text-neutral-600 w-5">
                      {student.rollNo}
                    </span>
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-100"
                    />
                    <span className="text-[13px] font-medium text-neutral-950 truncate">
                      {student.name}
                    </span>
                  </div>
                  <span className="bg-[#f4f5f7] text-[#6b7280] text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0">
                    On Leave
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Fixed Area: Back to Home Button */}
      <div className="shrink-0 bg-white border-t border-[#f4f5f7] px-4 pt-2.5 pb-2">
        <button
          type="button"
          onClick={onBackToHome}
          className="w-full flex items-center justify-center gap-2 bg-white border border-[#d1d5db] hover:bg-neutral-50 active:scale-[0.99] py-3 px-4 rounded-xl transition shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer text-neutral-900 font-medium text-[13.5px]"
        >
          <Home className="w-4 h-4 stroke-[2]" />
          <span>Back to Home</span>
        </button>
        
        {/* iOS Home Indicator Bar */}
        <div className="w-28 sm:w-32 h-1 bg-black rounded-full mx-auto mt-2 mb-0.5" />
      </div>

    </div>
  );
}
