/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Filter,
} from 'lucide-react';
import { AssessmentRecord } from './services/marksService';
import { getAssetUrl } from './utils/assetUtils';

interface SavedMarksReviewModalProps {
  record: AssessmentRecord;
  onClose: () => void;
}

export default function SavedMarksReviewModal({
  record,
  onClose,
}: SavedMarksReviewModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'passed' | 'absent' | 'distinction'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filteredStudents = useMemo(() => {
    return record.studentMarks.filter((s) => {
      // Search
      const matchesSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        s.rollNo.includes(searchQuery.trim());

      if (!matchesSearch) return false;

      // Filter
      if (filterType === 'absent') return s.isAbsent;
      if (filterType === 'passed')
        return !s.isAbsent && s.marks !== null && s.marks >= record.passingMarks;
      if (filterType === 'distinction')
        return (
          !s.isAbsent &&
          s.marks !== null &&
          s.marks >= Math.round(record.totalMarks * 0.75)
        );

      return true;
    });
  }, [record, searchQuery, filterType]);

  const handleExport = () => {
    showToast('Exporting official PDF grade sheet...');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      
      {/* Toast */}
      {toastMessage && (
        <div className="absolute top-6 left-6 right-6 z-60 bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in">
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal Container */}
      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-md bg-white sm:rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden text-neutral-900 font-sans">
        
        {/* Modal Header */}
        <div className="shrink-0 bg-white border-b border-[#f0f2f5] px-4 py-3 flex items-center justify-between">
          <div className="flex items-start gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-neutral-950 leading-tight">
                Published Marks Record
              </h2>
              <div className="text-[11px] text-[#6b7280]">
                {record.grade} • {record.subject}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="p-1.5 text-neutral-700 hover:text-black cursor-pointer rounded-lg hover:bg-neutral-100"
            title="Download PDF report"
          >
            <Download className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
          
          {/* Record Info Card */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
              <div>
                <span className="text-[11px] text-[#717684]">Assessment</span>
                <div className="text-[14px] font-bold text-neutral-950">
                  {record.assessmentType}
                </div>
              </div>
              <span className="bg-black text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <img
                  src={getAssetUrl('/assets/Dark Verified Check Badge.png')}
                  alt="Verified"
                  className="w-3.5 h-3.5 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span>PUBLISHED</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 text-center">
              <div>
                <div className="text-[10px] text-[#717684]">Total</div>
                <div className="text-[14px] font-bold text-neutral-950">
                  {record.totalStudents}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#717684]">Evaluated</div>
                <div className="text-[14px] font-bold text-neutral-950">
                  {record.marksEntered - record.absentCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#717684]">Absent</div>
                <div className="text-[14px] font-bold text-neutral-950">
                  {record.absentCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#717684]">Max Marks</div>
                <div className="text-[14px] font-bold text-neutral-950">
                  {record.totalMarks}
                </div>
              </div>
            </div>
          </div>

          {/* Search Field */}
          <div className="relative flex items-center bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl px-3 py-1.5 text-xs">
            <Search className="w-3.5 h-3.5 text-neutral-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or roll..."
              className="w-full bg-transparent text-neutral-900 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'All Students' },
              { id: 'passed', label: 'Passed (≥20)' },
              { id: 'distinction', label: 'Distinction (≥38)' },
              { id: 'absent', label: 'Absent' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterType === f.id
                    ? 'bg-black text-white'
                    : 'bg-[#f4f5f7] text-[#6b7280] hover:bg-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Student List */}
          <div className="divide-y divide-[#f5f6f8]">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No students match this filter
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.studentId}
                  className="flex items-center justify-between py-2 px-1"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11.5px] font-medium text-neutral-500 w-5 text-center">
                      {student.rollNo}
                    </span>
                    <img
                      src={getAssetUrl(student.avatar)}
                      alt={student.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-neutral-100"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-[12.5px] font-semibold text-neutral-950 block truncate max-w-[130px]">
                        {student.name}
                      </span>
                      {student.remarks && student.remarks !== '-' && (
                        <span className="text-[10px] text-neutral-500 italic block truncate max-w-[130px]">
                          {student.remarks}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {student.isAbsent ? (
                      <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-red-200">
                        Absent
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[13px] font-bold text-neutral-950">
                          {student.marks}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          / {record.totalMarks}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Modal Bottom Bar */}
        <div className="shrink-0 bg-white border-t border-[#f0f2f5] p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-black text-white font-semibold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-neutral-850"
          >
            Close Saved Review
          </button>
        </div>

      </div>
    </div>
  );
}
