/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Edit3,
  ChevronLeft,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  StudentMark,
  AssessmentRecord,
  saveAndPublishMarks,
} from './services/marksService';
import StaffStatusBar from './components/StaffStatusBar';

interface ReviewAndSaveMarksProps {
  assessmentData: {
    grade: string;
    subject: string;
    assessmentType: string;
    totalMarks: number;
    passingMarks: number;
    examDate: string;
    showMarksToStudents: boolean;
    addRemarks: boolean;
    studentMarks: StudentMark[];
  };
  onEditMarks: () => void;
  onPublishSuccess: (savedRecord: AssessmentRecord) => void;
  onBack: () => void;
}

export default function ReviewAndSaveMarks({
  assessmentData,
  onEditMarks,
  onPublishSuccess,
  onBack,
}: ReviewAndSaveMarksProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    grade,
    subject,
    assessmentType,
    totalMarks,
    passingMarks,
    examDate,
    showMarksToStudents,
    addRemarks,
    studentMarks,
  } = assessmentData;

  const totalStudents = studentMarks.length;
  const absentStudents = studentMarks.filter((s) => s.isAbsent);
  const absentCount = absentStudents.length;
  const marksEntered = studentMarks.filter(
    (s) => s.isAbsent || (s.marks !== null && !isNaN(s.marks))
  ).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveAndPublish = () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      // Validate and save to backend
      const result = saveAndPublishMarks({
        schoolId: 'greenwood-intl',
        schoolName: 'Greenwood International School',
        grade,
        subject,
        assessmentType,
        totalMarks,
        passingMarks,
        examDate,
        showMarksToStudents,
        addRemarks,
        studentMarks,
      });

      setIsSubmitting(false);

      if (result.success && result.record) {
        onPublishSuccess(result.record);
      } else {
        setErrorMessage(
          result.error ||
            'Failed to save and publish marks. Please review entries and try again.'
        );
      }
    }, 450);
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Toast Notification */}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-3 pb-3 space-y-3">
        
        {/* Title & Subtitle with Small Back Chevron */}
        <div className="flex items-start gap-1.5 pt-0.5 pb-1">
          <button
            type="button"
            onClick={onBack}
            className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
            aria-label="Back"
            title="Back to Add Marks"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] sm:text-[23px] font-bold text-neutral-950 tracking-tight leading-tight">
              Review & Save
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] mt-0.5 font-normal">
              Check the entered marks before saving
            </p>
          </div>
        </div>

        {/* Class | Subject | Assessment Banner Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3 shadow-xs">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-neutral-900 pb-2 border-b border-[#f3f4f6]">
            <FileText className="w-4 h-4 text-neutral-800 shrink-0" />
            <span className="truncate">
              {grade} &nbsp;|&nbsp; {subject} &nbsp;|&nbsp; {assessmentType}
            </span>
          </div>

          {/* 3 Summary Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2.5 text-center">
            <div>
              <div className="text-[10px] text-[#717684] font-medium leading-tight">
                Total Students
              </div>
              <div className="text-[18px] font-bold text-neutral-950 mt-0.5 leading-none">
                {totalStudents}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-[#717684] font-medium leading-tight">
                Marks Entered
              </div>
              <div className="text-[18px] font-bold text-neutral-950 mt-0.5 leading-none">
                {marksEntered}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-[#717684] font-medium leading-tight">
                Absent
              </div>
              <div className="text-[18px] font-bold text-neutral-950 mt-0.5 leading-none">
                {absentCount}
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification if backend failure */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Publishing Failed</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-800 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Student Table Header */}
        <div className="flex items-center justify-between px-1 pt-1 text-[11px] font-medium text-neutral-500 border-b border-[#f0f2f5] pb-2">
          <div className="flex items-center gap-2.5">
            <span className="w-6 text-center">#</span>
            <span>Student Name</span>
          </div>
          <div className="flex items-center gap-5 pr-2">
            <span className="w-16 text-right">Marks / {totalMarks}</span>
            <span className="w-20 text-right">Remarks</span>
          </div>
        </div>

        {/* Student Review Rows */}
        <div className="divide-y divide-[#f5f6f8]">
          {studentMarks.map((student) => (
            <div
              key={student.studentId}
              className="flex items-center justify-between py-2 px-1 hover:bg-neutral-50/50 rounded-lg transition"
            >
              {/* Roll + Avatar + Student Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[12px] font-medium text-[#6b7280] w-6 text-center shrink-0">
                  {student.rollNo}
                </span>

                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-100"
                />

                <span className="text-[13px] font-semibold text-neutral-950 truncate max-w-[120px] min-[360px]:max-w-[140px] sm:max-w-[160px]">
                  {student.name}
                </span>
              </div>

              {/* Marks / 50 + Remarks */}
              <div className="flex items-center gap-5 shrink-0 pr-2">
                <div className="w-16 text-right">
                  {student.isAbsent ? (
                    <span className="inline-block bg-neutral-100 border border-neutral-300 rounded-lg px-2 py-0.5 text-xs font-bold text-neutral-700">
                      A
                    </span>
                  ) : (
                    <span className="inline-block bg-neutral-50 border border-[#e5e7eb] rounded-lg px-2.5 py-0.5 text-xs font-bold text-neutral-950">
                      {student.marks}
                    </span>
                  )}
                </div>

                <div className="w-20 text-right">
                  <span className="text-[11.5px] text-[#6b7280] truncate block">
                    {student.isAbsent ? 'Absent' : student.remarks || '-'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Information Warning Panel for Absent Students (matching Panel 3) */}
        {absentCount > 0 && (
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-xs font-bold">
              !
            </div>
            <div className="text-[12px] text-neutral-900 leading-snug">
              <span className="font-semibold">
                {absentCount} student{absentCount > 1 ? 's' : ''} marked as Absent.
              </span>{' '}
              <span className="text-[#6b7280]">You can still save the marks.</span>
            </div>
          </div>
        )}

      </div>

      {/* Sticky Bottom Actions Bar: Edit Marks & Save & Publish */}
      <div className="shrink-0 bg-white border-t border-[#f4f5f7] px-4 pt-2.5 pb-2">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Edit Marks Button */}
          <button
            type="button"
            onClick={onEditMarks}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-1.5 bg-white border border-[#d1d5db] hover:bg-neutral-50 active:scale-[0.98] py-3 px-3 rounded-2xl transition shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer text-neutral-900 font-semibold text-[13px] disabled:opacity-50"
          >
            <Edit3 className="w-4 h-4 text-neutral-900 stroke-[2]" />
            <span>Edit Marks</span>
          </button>

          {/* Save & Publish Primary Button */}
          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 bg-black hover:bg-neutral-900 active:scale-[0.98] py-3 px-3 rounded-2xl transition shadow-xs text-white cursor-pointer font-semibold text-[13px] disabled:opacity-75"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Save & Publish</span>
            )}
          </button>
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-black rounded-full mx-auto mt-2 mb-0.5" />
      </div>

    </div>
  );
}
