/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Paperclip,
  Download,
  Pencil,
  Send,
  AlertCircle,
} from 'lucide-react';
import {
  HomeworkDraft,
  HomeworkRecord,
  HomeworkAttachment,
  saveHomeworkRecord,
  downloadHomeworkAttachment,
} from './services/homeworkService';
import StaffStatusBar from './components/StaffStatusBar';

interface ReviewHomeworkProps {
  draft: HomeworkDraft;
  onEditHomework: () => void;
  onHomeworkAssigned: (record: HomeworkRecord) => void;
}

export function HomeworkFileTypeIcon({ type }: { type: HomeworkAttachment['type'] }) {
  if (type === 'pdf') {
    return (
      <div className="relative w-8 h-9 rounded-md bg-[#ef4444] flex flex-col items-center justify-end pb-1.5 shrink-0 shadow-2xs overflow-hidden">
        {/* Folded corner accent */}
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#fca5a5] rounded-bl-xs" />
        <span className="text-[8.5px] font-extrabold text-white tracking-tight uppercase leading-none">
          PDF
        </span>
      </div>
    );
  }

  if (type === 'jpg' || type === 'png') {
    return (
      <div className="relative w-8 h-9 rounded-md bg-[#3b82f6] flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#93c5fd] rounded-bl-xs" />
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white mt-1">
          <circle cx="8.5" cy="8.5" r="2" fill="currentColor" />
          <path
            d="M4 18l4.5-5.5 3.5 4 3.5-4.5L20 18H4z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-8 h-9 rounded-md bg-[#3b82f6] flex flex-col items-center justify-end pb-1.5 shrink-0 shadow-2xs overflow-hidden">
      <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#93c5fd] rounded-bl-xs" />
      <span className="text-[8px] font-extrabold text-white tracking-tight uppercase leading-none">
        DOC
      </span>
    </div>
  );
}

export default function ReviewHomework({
  draft,
  onEditHomework,
  onHomeworkAssigned,
}: ReviewHomeworkProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSelectedStudentsList, setShowSelectedStudentsList] = useState(false);
  const isSubmittingRef = useRef(false);

  const selectedStudents = draft.studentsSnapshot || [];
  const previewStudents = selectedStudents.slice(0, 3);
  const remainingPreviewCount = Math.max(0, draft.assignedStudentCount - previewStudents.length);

  const handleAssignHomework = async () => {
    // Prevent duplicate submissions on rapid taps
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const savedRecord = await saveHomeworkRecord({
        schoolId: draft.schoolId,
        schoolName: draft.schoolName,
        teacherId: draft.teacherId,
        teacherName: draft.teacherName,
        teacherRole: draft.teacherRole || 'Class Teacher',
        grade: draft.grade,
        subject: draft.subject,
        assignedDateStr: draft.assignedDateStr,
        assignedDateKey: draft.assignedDateKey,
        dueDateStr: draft.dueDateStr,
        instructions: draft.instructions,
        attachments: draft.attachments,
        totalEligibleStudents: draft.totalEligibleStudents,
        assignedStudentIds: draft.assignedStudentIds,
        assignedStudentCount: draft.assignedStudentCount,
        studentsSnapshot: draft.studentsSnapshot,
      });

      onHomeworkAssigned(savedRecord);
    } catch (err: unknown) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to assign homework. Please check your details and try again.';
      setSubmitError(message);
    }
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      <StaffStatusBar />

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1.5 pb-6 space-y-3">
        {/* Header with Back Button */}
        <div className="pt-0.5 flex items-start gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onEditHomework}
            aria-label="Back to Log Homework"
            className="mt-1 p-1 -ml-1 rounded-lg hover:bg-neutral-100 text-neutral-900 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-neutral-900 tracking-tight leading-tight">
              Review Homework
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal leading-snug mt-0.5">
              Please review the details below before assigning the homework to the selected students.
            </p>
          </div>
        </div>

        {/* Error Banner if Assign Homework fails */}
        {submitError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11.5px] rounded-xl p-2.5 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Date / Class / Subject Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl px-3.5 sm:px-4 py-1 divide-y divide-[#f0f2f5] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Date Row */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5 text-[#646a79] text-[12.5px] sm:text-[13px] font-medium">
              <CalendarIcon className="w-4 h-4 text-neutral-700 shrink-0" />
              <span>Date</span>
            </div>
            <span className="text-[12.5px] sm:text-[13px] font-bold text-neutral-900">
              {draft.assignedDateStr}
            </span>
          </div>

          {/* Class Row */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5 text-[#646a79] text-[12.5px] sm:text-[13px] font-medium">
              <Users className="w-4 h-4 text-neutral-700 shrink-0" />
              <span>Class</span>
            </div>
            <span className="text-[12.5px] sm:text-[13px] font-bold text-neutral-900">
              {draft.grade}
            </span>
          </div>

          {/* Subject Row */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5 text-[#646a79] text-[12.5px] sm:text-[13px] font-medium">
              <BookOpen className="w-4 h-4 text-neutral-700 shrink-0" />
              <span>Subject</span>
            </div>
            <span className="text-[12.5px] sm:text-[13px] font-bold text-neutral-900">
              {draft.subject}
            </span>
          </div>
        </div>

        {/* 2. Homework Instructions Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-800 shrink-0" />
            <h2 className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900">
              Homework Instructions
            </h2>
          </div>
          <div className="mt-2.5 bg-[#f4f5f7] rounded-xl p-3 text-[12.5px] sm:text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">
            {draft.instructions}
          </div>
        </div>

        {/* 3. Attached Files Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-neutral-800 shrink-0" />
            <h2 className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900">
              Attached Files ({draft.attachments.length})
            </h2>
          </div>

          {draft.attachments.length === 0 ? (
            <div className="mt-2.5 bg-[#f4f5f7] rounded-xl p-3 text-[12px] text-[#717684]">
              No files attached to this homework.
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              {draft.attachments.map((att) => (
                <div
                  key={att.id}
                  className="bg-[#f4f5f7] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <HomeworkFileTypeIcon type={att.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-neutral-900 truncate">
                        {att.name}
                      </p>
                      <p className="text-[11px] text-[#717684] font-medium mt-0.5">
                        {att.sizeFormatted}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadHomeworkAttachment(att)}
                    aria-label={`Download ${att.name}`}
                    className="p-1.5 rounded-lg text-neutral-700 hover:bg-neutral-200/70 transition cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Selected Students Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-800 shrink-0" />
            <h2 className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900">
              Selected Students ({draft.assignedStudentCount})
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowSelectedStudentsList(!showSelectedStudentsList)}
            className="w-full mt-2.5 flex items-center justify-between cursor-pointer group text-left"
          >
            <div className="flex items-center -space-x-2 overflow-hidden py-0.5 pl-0.5">
              {previewStudents.map((stu) => (
                <img
                  key={stu.id}
                  src={stu.avatar}
                  alt={stu.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-white bg-neutral-100 shrink-0"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                  }}
                />
              ))}
              {remainingPreviewCount > 0 && (
                <div className="w-9 h-9 rounded-full bg-[#eaecf0] border-2 border-white flex items-center justify-center text-[11px] font-bold text-[#4b5563] shrink-0">
                  +{remainingPreviewCount}
                </div>
              )}
            </div>

            <ChevronRight
              className={`w-4 h-4 text-[#9ca3af] group-hover:text-neutral-700 transition-transform duration-200 ${
                showSelectedStudentsList ? 'rotate-90' : ''
              }`}
            />
          </button>

          {showSelectedStudentsList && (
            <div className="mt-3 pt-2.5 border-t border-[#f0f2f5] max-h-48 overflow-y-auto no-scrollbar divide-y divide-[#f4f5f7]">
              {selectedStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] font-medium text-[#717684] w-5 shrink-0">
                      {student.rollNo}
                    </span>
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-7 h-7 rounded-full object-cover border border-neutral-200 shrink-0"
                    />
                    <span className="text-[12.5px] font-semibold text-neutral-900 truncate">
                      {student.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#717684] font-medium shrink-0">
                    Roll No. {student.rollNo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons (Edit Homework & Assign Homework) */}
      <div className="shrink-0 bg-white/95 backdrop-blur-xs pt-2 pb-2.5 px-3.5 sm:px-4.5 border-t border-[#f4f5f7] space-y-2.5 z-20">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onEditHomework}
          className="w-full py-3 rounded-2xl bg-white border border-[#d1d5db] text-neutral-900 text-[13.5px] sm:text-[14px] font-bold hover:bg-neutral-50 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Pencil className="w-4 h-4 stroke-[2]" />
          <span>Edit Homework</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleAssignHomework}
          className="w-full py-3.5 rounded-2xl bg-black text-white text-[13.5px] sm:text-[14px] font-bold shadow-md hover:bg-neutral-900 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Assigning Homework...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 stroke-[2]" />
              <span>Assign Homework</span>
            </>
          )}
        </button>

        {/* Device Home Bar */}
        <div className="w-28 sm:w-32 h-1 bg-black rounded-full mx-auto mt-1" />
      </div>
    </div>
  );
}
