/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  Calendar,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import {
  ParentLeaveRequest,
  updateParentLeaveRequestStatus,
} from './services/requestsService';

interface ParentLeaveDetailsScreenProps {
  request: ParentLeaveRequest;
  onBackToApprovals: () => void;
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateMyRequests: () => void;
  onNavigateProfile: () => void;
  onDecisionCompleted: (updatedRequest: ParentLeaveRequest, decision: 'Approved' | 'Rejected') => void;
}

export default function ParentLeaveDetailsScreen({
  request,
  onBackToApprovals,
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateMyRequests,
  onNavigateProfile,
  onDecisionCompleted,
}: ParentLeaveDetailsScreenProps) {
  const [remarks, setRemarks] = useState(request.teacherRemarks || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const maxRemarksChars = 500;

  const handleDecision = (decision: 'Approved' | 'Rejected') => {
    if (isSubmittingRef.current || isProcessing) return;

    if (request.status !== 'Pending') {
      setErrorMessage('This leave request has already been processed.');
      return;
    }

    if (!request.id || !request.studentName || !request.dates) {
      setErrorMessage('Invalid leave request details. Unable to process.');
      return;
    }

    if (remarks.length > maxRemarksChars) {
      setErrorMessage(`Remarks cannot exceed ${maxRemarksChars} characters.`);
      return;
    }

    setErrorMessage(null);
    isSubmittingRef.current = true;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const updated = updateParentLeaveRequestStatus(
          request.id,
          decision,
          remarks.trim() || undefined,
          'Ms. Priya Sharma (Class Teacher)'
        );
        setIsProcessing(false);
        onDecisionCompleted(updated, decision);
      } catch (err) {
        isSubmittingRef.current = false;
        setIsProcessing(false);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to save leave decision. Please try again.'
        );
        console.error('Failed to update leave decision:', err);
      }
    }, 350);
  };

  const isPending = request.status === 'Pending';

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Top Status Bar with Dynamic Island */}
      <StaffStatusBar />

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-3.5">
        
        {/* Header: [ChevronLeft] [Heading & Subheading] */}
        <div className="flex items-start gap-1.5 min-w-0 pt-0.5">
          <button
            type="button"
            onClick={onBackToApprovals}
            className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
            aria-label="Back to Approvals"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-neutral-900 tracking-tight leading-tight">
              Parent Leave Request
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
              Review the parent's leave request
            </p>
          </div>
        </div>

        {/* 1. Parent & Student Card (Exact Replica of Screen 6 & Screen 8) */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex items-center gap-3">
          <div
            style={{ backgroundColor: `${request.parentColor}18`, color: request.parentColor }}
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0 border border-neutral-100"
          >
            {request.parentInitials}
          </div>

          <div className="min-w-0 flex-1 leading-snug">
            <h2 className="text-[14.5px] sm:text-[15px] font-bold text-neutral-900 truncate">
              {request.parentName}
            </h2>
            <div className="text-[11.5px] text-[#6b7280] mt-0.5 truncate">
              Parent of {request.studentName}
            </div>
            <div className="text-[11px] text-[#8e95a2] mt-0.5 truncate">
              {request.classSection} • Roll No. {request.rollNo}
            </div>
          </div>
        </div>

        {/* 2. Leave Details Card (Exact Replica of Screen 6 & Screen 8) */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-2.5">
          <h3 className="text-[13px] font-bold text-neutral-900 pb-1.5 border-b border-neutral-100">
            Leave Details
          </h3>

          <div className="space-y-2 text-[12px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[#8e95a2] shrink-0">Leave Dates</span>
              <span className="font-semibold text-neutral-900 text-right">
                {request.dates}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-[#8e95a2] shrink-0">Reason</span>
              <span className="font-semibold text-neutral-900 text-right">
                {request.reason}
              </span>
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-[#8e95a2] shrink-0">Submitted On</span>
              <span className="font-medium text-neutral-900 text-right">
                {request.submittedOn}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[#8e95a2] shrink-0">Status</span>
              {request.status === 'Pending' ? (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                  Pending Approval
                </span>
              ) : request.status === 'Approved' ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  Approved
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
                  Rejected
                </span>
              )}
            </div>

            {request.decisionDate && (
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-100">
                <span className="text-[#8e95a2] shrink-0">Decided On</span>
                <span className="font-medium text-neutral-900 text-right">
                  {request.decisionDate}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Parent's Message Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-1.5">
          <h3 className="text-[13px] font-bold text-neutral-900">
            Parent's Message
          </h3>
          <p className="text-[12px] sm:text-[12.5px] text-neutral-700 leading-relaxed font-normal">
            {request.message}
          </p>
        </div>

        {/* 4. Your Remarks Section */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-bold text-neutral-900">
            {isPending ? 'Your Remarks (Optional)' : 'Your Remarks'}
          </label>
          <div className="border border-[#e5e7eb] rounded-2xl bg-white p-3 focus-within:border-neutral-400 transition">
            <textarea
              rows={3}
              maxLength={maxRemarksChars}
              disabled={!isPending}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isPending ? 'Add any remarks...' : 'No teacher remarks provided.'}
              className="w-full bg-transparent resize-none text-[12px] sm:text-[12.5px] text-neutral-900 placeholder:text-neutral-400 outline-none leading-relaxed disabled:text-neutral-700"
            />
          </div>
          <div className="text-[11px] text-neutral-400 font-medium text-right pr-0.5">
            {remarks.length}/{maxRemarksChars}
          </div>
        </div>

        {/* Error Alert Banner if saving fails */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-rose-700 text-[12px]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 5. Decision Action Buttons (Exact Replica of Screen 6 & Screen 8) */}
        {isPending ? (
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleDecision('Rejected')}
              className="w-1/2 py-3.5 rounded-2xl bg-white border border-rose-400 text-rose-600 hover:bg-rose-50 active:scale-[0.99] font-bold text-[13.5px] transition cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleDecision('Approved')}
              className="w-1/2 py-3.5 rounded-2xl bg-black text-white hover:bg-neutral-900 active:scale-[0.99] font-bold text-[13.5px] shadow-md transition cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        ) : (
          <div className="pt-1">
            <button
              type="button"
              onClick={onBackToApprovals}
              className="w-full py-3.5 rounded-2xl bg-black text-white font-bold text-[13.5px] hover:bg-neutral-900 transition cursor-pointer"
            >
              Back to Approvals
            </button>
          </div>
        )}

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
