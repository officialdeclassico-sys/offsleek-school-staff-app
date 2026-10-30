/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Paperclip,
  Download,
  Search,
  X,
} from 'lucide-react';
import {
  HomeworkRecord,
  downloadHomeworkAttachment,
  formatDueDateFromDateKey,
} from './services/homeworkService';
import { HomeworkFileTypeIcon } from './ReviewHomework';
import StaffStatusBar from './components/StaffStatusBar';
import { formatISTDateTime } from './utils/dateTimeUtils';

interface ViewAssignedHomeworkProps {
  record: HomeworkRecord;
  onBack: () => void;
}

export default function ViewAssignedHomework({
  record,
  onBack,
}: ViewAssignedHomeworkProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);

  const dueDateDisplay =
    record.dueDateStr || formatDueDateFromDateKey(record.assignedDateKey);
  const assignedOnFormattedDisplay =
    record.assignedOnFormatted || formatISTDateTime(record.updatedAt || record.createdAt);
  const teacherRoleDisplay = record.teacherRole || 'Class Teacher';

  // Ensure we only display the students that were assigned this homework
  const assignedStudents = useMemo(() => {
    const snapshot = record.studentsSnapshot || [];
    if (record.assignedStudentIds && record.assignedStudentIds.length > 0) {
      const idSet = new Set(record.assignedStudentIds);
      const filtered = snapshot.filter((s) => idSet.has(s.id));
      if (filtered.length > 0) return filtered;
    }
    return snapshot;
  }, [record.studentsSnapshot, record.assignedStudentIds]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return assignedStudents;
    const q = searchQuery.toLowerCase().trim();
    return assignedStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q)
    );
  }, [assignedStudents, searchQuery]);

  const INITIAL_VISIBLE_COUNT = 5;
  const isSearching = searchQuery.trim().length > 0;
  const visibleStudents =
    showAllStudents || isSearching
      ? filteredStudents
      : filteredStudents.slice(0, INITIAL_VISIBLE_COUNT);

  const remainingStudentsCount = Math.max(
    0,
    filteredStudents.length - INITIAL_VISIBLE_COUNT
  );

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      <StaffStatusBar />

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1.5 pb-6 space-y-3">
        {/* Header with Back Button and Assigned Badge */}
        <div className="pt-0.5 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="mt-1 p-1 -ml-1 rounded-lg hover:bg-neutral-100 text-neutral-900 transition cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-900 tracking-tight leading-tight">
                Assigned Homework
              </h1>
              <p className="text-[11.5px] sm:text-[12px] text-[#717684] font-normal mt-0.5">
                View the details of the assigned homework.
              </p>
            </div>
          </div>

          <span className="mt-1 bg-emerald-50 text-emerald-600 border border-emerald-200/80 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0">
            Assigned
          </span>
        </div>

        {/* 1. Top Metadata Summary Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl px-3.5 sm:px-4 py-1 divide-y divide-[#f0f2f5] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Row 1: Subject & Grade Pill */}
          <div className="py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen className="w-4 h-4 text-neutral-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10.5px] text-[#717684] font-medium block leading-tight">
                  Subject
                </span>
                <span className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 block leading-tight mt-0.5 truncate">
                  {record.subject}
                </span>
              </div>
            </div>

            <span className="bg-[#f4f5f7] text-neutral-800 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
              {record.grade}
            </span>
          </div>

          {/* Row 2: Assigned On & Due Date */}
          <div className="py-2.5 grid grid-cols-2 gap-2 divide-x divide-[#f0f2f5]">
            <div className="flex items-center gap-2 pr-1 min-w-0">
              <CalendarIcon className="w-4 h-4 text-neutral-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10.5px] text-[#717684] font-medium block leading-tight">
                  Assigned On
                </span>
                <span className="text-[11px] sm:text-[11.5px] font-bold text-neutral-900 block leading-tight mt-0.5 truncate">
                  {assignedOnFormattedDisplay}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pl-2.5 min-w-0">
              <CalendarIcon className="w-4 h-4 text-neutral-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10.5px] text-[#717684] font-medium block leading-tight">
                  Due Date
                </span>
                <span className="text-[11.5px] sm:text-[12px] font-bold text-neutral-900 block leading-tight mt-0.5 truncate">
                  {dueDateDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Assigned By */}
          <div className="py-2.5 flex items-center gap-2.5">
            <Users className="w-4 h-4 text-neutral-700 shrink-0" />
            <div>
              <span className="text-[10.5px] text-[#717684] font-medium block leading-tight">
                Assigned By
              </span>
              <span className="text-[12.5px] font-bold text-neutral-900 block leading-tight mt-0.5">
                {record.teacherName}
              </span>
              <span className="text-[10.5px] text-[#717684] font-normal block leading-tight mt-0.5">
                {teacherRoleDisplay}
              </span>
            </div>
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
            {record.instructions}
          </div>
        </div>

        {/* 3. Attached Files Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-neutral-800 shrink-0" />
            <h2 className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900">
              Attached Files ({record.attachments.length})
            </h2>
          </div>

          {record.attachments.length === 0 ? (
            <div className="mt-2.5 bg-[#f4f5f7] rounded-xl p-3 text-[12px] text-[#717684]">
              No files attached to this homework.
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              {record.attachments.map((att) => (
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

        {/* 4. Assigned to Students Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-800 shrink-0" />
              <h2 className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900">
                Assigned to Students ({assignedStudents.length})
              </h2>
            </div>

            {assignedStudents.length > INITIAL_VISIBLE_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllStudents(!showAllStudents)}
                className="bg-white border border-[#d1d5db] hover:bg-neutral-50 text-neutral-900 text-[11px] sm:text-[11.5px] font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0"
              >
                {showAllStudents ? 'Collapse' : 'View All'}
              </button>
            )}
          </div>

          {/* Student Search Input */}
          <div className="mt-2.5 flex items-center bg-[#f4f5f7] border border-transparent focus-within:border-neutral-300 focus-within:bg-white rounded-xl px-3 py-2 transition">
            <Search className="w-3.5 h-3.5 text-[#9ca3af] mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or roll number..."
              className="w-full bg-transparent text-[12px] sm:text-[12.5px] text-neutral-900 placeholder:text-[#9ca3af] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-700 ml-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Assigned Students List */}
          <div className="mt-2 divide-y divide-[#f0f2f5]">
            {visibleStudents.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#717684]">
                No students found matching "{searchQuery}"
              </div>
            ) : (
              visibleStudents.map((student) => (
                <div
                  key={student.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11.5px] font-medium text-[#717684] w-5 shrink-0">
                      {student.rollNo}
                    </span>

                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-200 bg-neutral-100 shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div
                      style={{ display: 'none' }}
                      className="w-8 h-8 rounded-full bg-neutral-200 border border-neutral-300 items-center justify-center text-xs font-bold text-neutral-700 shrink-0"
                    >
                      {student.name.charAt(0)}
                    </div>

                    <span className="text-[12.5px] sm:text-[13px] font-semibold text-neutral-900 truncate">
                      {student.name}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#717684] font-medium shrink-0">
                    Roll No. {student.rollNo}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Expand / Collapse Footer Pill */}
          {!isSearching && remainingStudentsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllStudents(!showAllStudents)}
              className="w-full mt-2 bg-[#f4f5f7] hover:bg-[#eaecf0] text-[#4b5563] text-[11.5px] font-semibold py-2 px-3 rounded-xl flex items-center justify-between transition cursor-pointer"
            >
              <span>
                {showAllStudents
                  ? 'Show fewer students'
                  : `+${remainingStudentsCount} more students`}
              </span>
              {showAllStudents ? (
                <ChevronUp className="w-4 h-4 text-[#646a79]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#646a79]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Device Home Bar */}
      <div className="shrink-0 bg-white py-2 px-4 z-20">
        <div className="w-28 sm:w-32 h-1 bg-black rounded-full mx-auto" />
      </div>
    </div>
  );
}
