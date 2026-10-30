/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Eye, Home, Users } from 'lucide-react';
import { HomeworkRecord, formatDueDateFromDateKey } from './services/homeworkService';
import { triggerSuccessFeedback } from './utils/feedback';
import AnimatedStaffVerifiedBadge from './components/AnimatedStaffVerifiedBadge';
import StaffStatusBar from './components/StaffStatusBar';
import { formatISTDateMedium, formatISTTime12h } from './utils/dateTimeUtils';

interface HomeworkAssignedSuccessProps {
  record: HomeworkRecord;
  onViewAssignedHomework: () => void;
  onBackToDashboard: () => void;
}

export default function HomeworkAssignedSuccess({
  record,
  onViewAssignedHomework,
  onBackToDashboard,
}: HomeworkAssignedSuccessProps) {
  useEffect(() => {
    triggerSuccessFeedback();
  }, []);

  const dueDateDisplay =
    record.dueDateStr || formatDueDateFromDateKey(record.assignedDateKey);
  const assignedOnDateDisplay =
    record.assignedOnDateStr || formatISTDateMedium(record.updatedAt || record.createdAt);
  const assignedOnTimeDisplay =
    record.assignedOnTimeStr || formatISTTime12h(record.updatedAt || record.createdAt);
  const teacherRoleDisplay = record.teacherRole || 'Class Teacher';

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      <StaffStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 sm:px-5 py-2 flex flex-col items-center justify-center text-center">
        {/* Global Animated Verified Badge (Reused from Add Marks / Take Attendance) */}
        <AnimatedStaffVerifiedBadge
          size="hero"
          className="mb-3"
          alt="Homework Assigned & Verified"
        />

        {/* Title & Subtitle */}
        <h1 className="text-[22px] sm:text-[24px] font-extrabold text-neutral-900 tracking-tight leading-tight">
          Homework Assigned
          <br />
          Successfully!
        </h1>
        <p className="text-[12.5px] sm:text-[13px] text-[#646a79] leading-relaxed mt-1.5 px-2">
          {record.subject} homework has been shared with the selected students.
        </p>

        {/* Homework Summary Card */}
        <div className="w-full mt-5 bg-white border border-[#eef0f3] rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-left">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#f0f2f5]">
            <div>
              <span className="text-[10.5px] font-bold tracking-[0.06em] text-[#717684] uppercase block">
                {record.grade}
              </span>
              <h2 className="text-[17px] sm:text-[18px] font-bold text-neutral-900 leading-tight mt-0.5">
                {record.subject}
              </h2>
            </div>

            <span className="bg-[#f4f5f7] text-neutral-800 text-[11px] font-semibold px-3 py-1 rounded-full shrink-0">
              Homework
            </span>
          </div>

          {/* 2x2 Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            {/* Box 1: Students Assigned */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3">
              <span className="text-[11px] text-[#646a79] font-medium block">
                Students Assigned
              </span>
              <span className="text-[20px] sm:text-[22px] font-bold text-neutral-900 leading-tight mt-1 block">
                {record.assignedStudentCount}
              </span>
            </div>

            {/* Box 2: Files Attached */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3">
              <span className="text-[11px] text-[#646a79] font-medium block">
                Files Attached
              </span>
              <span className="text-[20px] sm:text-[22px] font-bold text-neutral-900 leading-tight mt-1 block">
                {record.attachments.length}
              </span>
            </div>

            {/* Box 3: Due Date */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] text-[#646a79] font-medium block">
                Due Date
              </span>
              <span className="text-[15px] sm:text-[16px] font-bold text-neutral-900 leading-tight mt-1.5 block">
                {dueDateDisplay}
              </span>
            </div>

            {/* Box 4: Assigned On */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3">
              <span className="text-[11px] text-[#646a79] font-medium block">
                Assigned On
              </span>
              <span className="text-[12.5px] sm:text-[13px] font-bold text-neutral-900 leading-snug mt-1 block">
                {assignedOnDateDisplay}
              </span>
              <span className="text-[12px] sm:text-[12.5px] font-bold text-neutral-900 leading-snug block">
                {assignedOnTimeDisplay}
              </span>
            </div>
          </div>

          {/* Assigned By Footer Box */}
          <div className="mt-2.5 bg-[#f8f9fa] border border-[#eef0f3] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#646a79] text-[12px] font-medium">
              <Users className="w-4 h-4 text-neutral-700 shrink-0" />
              <span>Assigned By</span>
            </div>
            <div className="text-right">
              <div className="text-[12.5px] font-bold text-neutral-900 leading-tight">
                {record.teacherName}
              </div>
              <div className="text-[11px] text-[#717684] font-normal leading-tight mt-0.5">
                {teacherRoleDisplay}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="shrink-0 bg-white pt-2 pb-2.5 px-4 sm:px-5 space-y-2.5 z-20">
        <button
          type="button"
          onClick={onViewAssignedHomework}
          className="w-full py-3.5 rounded-2xl bg-black text-white text-[13.5px] sm:text-[14px] font-bold shadow-md hover:bg-neutral-900 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4 stroke-[2]" />
          <span>View Assigned Homework</span>
        </button>

        <button
          type="button"
          onClick={onBackToDashboard}
          className="w-full py-3.5 rounded-2xl bg-white border border-[#e5e7eb] text-neutral-900 text-[13.5px] sm:text-[14px] font-bold hover:bg-neutral-50 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4 stroke-[2]" />
          <span>Back to Dashboard</span>
        </button>

        {/* Device Home Bar */}
        <div className="w-28 sm:w-32 h-1 bg-black rounded-full mx-auto mt-1" />
      </div>
    </div>
  );
}
