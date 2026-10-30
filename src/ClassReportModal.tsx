/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Download, Printer, BarChart2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AttendanceRecord } from './services/attendanceService';

interface ClassReportModalProps {
  record: AttendanceRecord;
  onClose: () => void;
}

export default function ClassReportModal({ record, onClose }: ClassReportModalProps) {
  const [filter, setFilter] = useState<'ALL' | 'P' | 'A' | 'L'>('ALL');
  const [downloadMsg, setDownloadMsg] = useState(false);

  const percentage = Math.round((record.presentCount / record.totalStudents) * 100);

  const filteredStudents = record.students.filter((s) => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  });

  const handleDownload = () => {
    setDownloadMsg(true);
    setTimeout(() => setDownloadMsg(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[390px] max-h-[85vh] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden text-neutral-900 font-sans">
        
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#f0f2f5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
              <BarChart2 className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-neutral-950 leading-tight">
                Class Attendance Report
              </h2>
              <p className="text-[11px] text-[#717684]">
                {record.grade} • {record.dateStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
          
          {/* Top Performance Metric */}
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-[#6b7280] uppercase">
                Attendance Rate
              </div>
              <div className="text-[26px] font-black text-neutral-950 leading-tight mt-0.5">
                {percentage}%
              </div>
              <div className="text-[11px] text-[#717684] mt-0.5">
                {record.presentCount} of {record.totalStudents} students attended
              </div>
            </div>

            {/* Circular Progress Representation */}
            <div className="w-16 h-16 rounded-full border-4 border-neutral-200 border-t-black flex items-center justify-center">
              <span className="text-xs font-bold">{percentage}%</span>
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFilter(filter === 'P' ? 'ALL' : 'P')}
              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                filter === 'P'
                  ? 'bg-neutral-900 text-white border-black'
                  : 'bg-[#f8f9fa] border-[#eef0f3] text-neutral-900'
              }`}
            >
              <div className="text-xs font-bold leading-none flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{record.presentCount}</span>
              </div>
              <div className={`text-[10px] mt-1 ${filter === 'P' ? 'text-neutral-300' : 'text-[#6b7280]'}`}>
                Present
              </div>
            </button>

            <button
              onClick={() => setFilter(filter === 'A' ? 'ALL' : 'A')}
              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                filter === 'A'
                  ? 'bg-neutral-900 text-white border-black'
                  : 'bg-[#f8f9fa] border-[#eef0f3] text-neutral-900'
              }`}
            >
              <div className="text-xs font-bold leading-none flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span>{record.absentCount}</span>
              </div>
              <div className={`text-[10px] mt-1 ${filter === 'A' ? 'text-neutral-300' : 'text-[#6b7280]'}`}>
                Absent
              </div>
            </button>

            <button
              onClick={() => setFilter(filter === 'L' ? 'ALL' : 'L')}
              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                filter === 'L'
                  ? 'bg-neutral-900 text-white border-black'
                  : 'bg-[#f8f9fa] border-[#eef0f3] text-neutral-900'
              }`}
            >
              <div className="text-xs font-bold leading-none flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{record.onLeaveCount}</span>
              </div>
              <div className={`text-[10px] mt-1 ${filter === 'L' ? 'text-neutral-300' : 'text-[#6b7280]'}`}>
                On Leave
              </div>
            </button>
          </div>

          {/* Student Roster List */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 pb-2 border-b border-[#f0f2f5]">
              <span>Roster ({filteredStudents.length} Students)</span>
              {filter !== 'ALL' && (
                <button
                  onClick={() => setFilter('ALL')}
                  className="text-[11px] text-black underline cursor-pointer"
                >
                  Show All
                </button>
              )}
            </div>

            <div className="divide-y divide-[#f5f6f8] max-h-56 overflow-y-auto no-scrollbar">
              {filteredStudents.map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-500 w-5">{s.rollNo}</span>
                    <img src={s.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    <span className="text-[12.5px] font-medium text-neutral-950">{s.name}</span>
                  </div>
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                      s.status === 'P'
                        ? 'bg-emerald-50 text-emerald-700'
                        : s.status === 'A'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {s.status === 'P' ? 'Present' : s.status === 'A' ? 'Absent' : 'On Leave'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#f0f2f5] bg-white flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 bg-black hover:bg-neutral-850 text-white py-2.5 rounded-xl text-xs font-medium cursor-pointer transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{downloadMsg ? 'Report Exported (PDF)' : 'Export PDF'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#d1d5db] hover:bg-neutral-50 text-xs font-medium text-neutral-800 cursor-pointer transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
