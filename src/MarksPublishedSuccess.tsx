/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  FileText,
  Calendar,
  Home,
  BookOpen,
  Eye,
  Award,
  Users,
} from 'lucide-react';
import { AssessmentRecord } from './services/marksService';
import AnimatedStaffVerifiedBadge from './components/AnimatedStaffVerifiedBadge';
import StaffStatusBar from './components/StaffStatusBar';
import { triggerSuccessFeedback } from './utils/feedback';
import { formatISTDateTime } from './utils/dateTimeUtils';

interface MarksPublishedSuccessProps {
  record: AssessmentRecord;
  onBackToDashboard: () => void;
  onReviewSavedMarks: () => void;
}

export default function MarksPublishedSuccess({
  record,
  onBackToDashboard,
  onReviewSavedMarks,
}: MarksPublishedSuccessProps) {
  useEffect(() => {
    triggerSuccessFeedback();
  }, []);
  const evaluatedCount = record.studentMarks.filter((s) => !s.isAbsent).length;
  const passingStudents = record.studentMarks.filter(
    (s) => !s.isAbsent && s.marks !== null && s.marks >= record.passingMarks
  ).length;
  const passRate =
    evaluatedCount > 0 ? Math.round((passingStudents / evaluatedCount) * 100) : 0;

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      <StaffStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 sm:px-5 pt-4 pb-4 space-y-4">
        
        {/* Prominent Success Hero Checkmark & Heading */}
        <div className="flex flex-col items-center text-center pt-2">
          <AnimatedStaffVerifiedBadge
            size="hero"
            className="mb-3"
            alt="Marks Published & Verified"
          />
          <h1 className="text-[22px] sm:text-[23px] font-bold text-neutral-950 tracking-tight leading-tight">
            Marks Published Successfully!
          </h1>
          <p className="text-[12.5px] text-[#717684] mt-1 max-w-[290px] leading-relaxed">
            The assessment marks for {record.assessmentType} have been saved and published to the academic portal.
          </p>
        </div>

        {/* Assessment Details Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-xs space-y-3">
          
          {/* Header Row: Subject & Assessment */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#f3f4f6]">
            <div>
              <div className="text-[10px] text-[#8e95a2] font-bold uppercase tracking-wider">
                {record.grade}
              </div>
              <div className="text-[16px] font-bold text-neutral-950 mt-0.5">
                {record.subject}
              </div>
            </div>
            <div className="bg-[#f4f5f7] px-3 py-1 rounded-full text-xs font-semibold text-neutral-900">
              {record.assessmentType}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5">
              <div className="text-[10.5px] text-[#717684] font-medium leading-tight">
                Total Evaluated
              </div>
              <div className="text-[17px] font-bold text-neutral-950 mt-1 leading-none">
                {evaluatedCount} / {record.totalStudents}
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5">
              <div className="text-[10.5px] text-[#717684] font-medium leading-tight">
                Absent Students
              </div>
              <div className="text-[17px] font-bold text-neutral-950 mt-1 leading-none">
                {record.absentCount}
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5">
              <div className="text-[10.5px] text-[#717684] font-medium leading-tight">
                Maximum Marks
              </div>
              <div className="text-[17px] font-bold text-neutral-950 mt-1 leading-none">
                {record.totalMarks}
              </div>
            </div>

            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2.5">
              <div className="text-[10.5px] text-[#717684] font-medium leading-tight">
                Passing Marks
              </div>
              <div className="text-[17px] font-bold text-neutral-950 mt-1 leading-none">
                {record.passingMarks}
              </div>
            </div>
          </div>

          {/* Performance Rate Banner */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-neutral-800" />
              <span className="text-[12px] font-semibold text-neutral-900">
                Class Pass Rate
              </span>
            </div>
            <span className="text-[13.5px] font-bold text-neutral-950">
              {passRate}% ({passingStudents}/{evaluatedCount})
            </span>
          </div>

          {/* Publication Timestamp */}
          <div className="text-[10.5px] text-[#8e95a2] text-center pt-0.5">
            Published on {record.publishedAt ? formatISTDateTime(record.publishedAt) : record.examDate} by Ms. Priya Sharma
          </div>

        </div>

      </div>

      {/* Sticky Bottom Actions Bar: Two Required Functional Buttons */}
      <div className="shrink-0 bg-white border-t border-[#f4f5f7] px-4 pt-2.5 pb-2 space-y-2">
        {/* Button 2: Review Saved Marks */}
        <button
          type="button"
          onClick={onReviewSavedMarks}
          className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-900 active:scale-[0.99] text-white py-3 px-4 rounded-2xl transition shadow-xs cursor-pointer font-semibold text-[13.5px]"
        >
          <Eye className="w-4 h-4" />
          <span>Review Saved Marks</span>
        </button>

        {/* Button 1: Back to Dashboard */}
        <button
          type="button"
          onClick={onBackToDashboard}
          className="w-full flex items-center justify-center gap-2 bg-white border border-[#d1d5db] hover:bg-neutral-50 active:scale-[0.99] text-neutral-900 py-3 px-4 rounded-2xl transition shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer font-semibold text-[13.5px]"
        >
          <Home className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-black rounded-full mx-auto mt-2 mb-0.5" />
      </div>

    </div>
  );
}
