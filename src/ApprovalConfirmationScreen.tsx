/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import AnimatedStaffVerifiedBadge from './components/AnimatedStaffVerifiedBadge';
import { ParentLeaveRequest } from './services/requestsService';
import { triggerSuccessFeedback } from './utils/feedback';
import { formatISTDateTime } from './utils/dateTimeUtils';

interface ApprovalConfirmationScreenProps {
  request: ParentLeaveRequest;
  decision: 'Approved' | 'Rejected';
  onBackToApprovals: () => void;
  onGoToHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateMyRequests: () => void;
  onNavigateProfile: () => void;
}

export default function ApprovalConfirmationScreen({
  request,
  decision,
  onBackToApprovals,
  onGoToHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateMyRequests,
  onNavigateProfile,
}: ApprovalConfirmationScreenProps) {
  const isApproved = decision === 'Approved';

  useEffect(() => {
    if (isApproved) {
      triggerSuccessFeedback();
    }
  }, [isApproved]);

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Top Status Bar with Dynamic Island */}
      <StaffStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 sm:px-5 pt-4 pb-6 flex flex-col justify-between">
        
        <div className="space-y-4">
          
          {/* Verification Badge for Approval (Exact shared AnimatedStaffVerifiedBadge) or Red Cross for Rejection */}
          <div className="flex flex-col items-center text-center pt-2">
            {isApproved ? (
              <AnimatedStaffVerifiedBadge
                size="hero"
                className="mb-3"
                alt="Leave Approved & Verified"
              />
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#ffe4e6] text-[#e11d48] flex items-center justify-center mx-auto shadow-xs mb-3">
                <X className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3]" />
              </div>
            )}

            <h1 className="text-[22px] sm:text-[23px] font-bold text-neutral-950 tracking-tight leading-tight">
              {isApproved ? 'Leave Approved Successfully!' : 'Leave Rejected'}
            </h1>
            <p className="text-[12.5px] text-[#717684] mt-1 max-w-[290px] mx-auto leading-relaxed">
              {isApproved
                ? `Leave request for ${request.studentName} (${request.classSection}) has been approved and verified.`
                : "Parent's leave request has been rejected."}
            </p>
          </div>

          {/* Request Details Card */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-3">
            <h2 className="text-[13px] font-bold text-neutral-900 pb-1.5 border-b border-neutral-100">
              Request Details
            </h2>

            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#8e95a2] shrink-0">Parent</span>
                <span className="font-semibold text-neutral-900 text-right">
                  {request.parentName}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#8e95a2] shrink-0">Student</span>
                <span className="font-medium text-neutral-900 text-right">
                  {request.studentName} ({request.classSection})
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#8e95a2] shrink-0">Leave Dates</span>
                <span className="font-medium text-neutral-900 text-right max-w-[210px]">
                  {request.dates}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#8e95a2] shrink-0">Reason</span>
                <span className="font-medium text-neutral-900 text-right max-w-[210px] break-words">
                  {request.reason}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#8e95a2] shrink-0">
                  {isApproved ? 'Approved By' : 'Rejected By'}
                </span>
                <span className="font-medium text-neutral-900 text-right max-w-[210px]">
                  {request.decidedBy || 'Ms. Priya Sharma (Class Teacher)'}
                </span>
              </div>

              {request.teacherRemarks && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#8e95a2] shrink-0">Remarks</span>
                  <span className="font-medium text-neutral-900 text-right max-w-[210px] break-words">
                    {request.teacherRemarks}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#8e95a2] shrink-0">
                  {isApproved ? 'Approved On' : 'Rejected On'}
                </span>
                <span className="font-medium text-neutral-900 text-right">
                  {request.decisionDate || formatISTDateTime()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[#8e95a2] shrink-0">Status</span>
                {isApproved ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                    Approved
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
                    Rejected
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons (Screen 7 & Screen 9: Back to Approvals & Go to Home) */}
        <div className="space-y-2 pt-4">
          <button
            type="button"
            onClick={onBackToApprovals}
            className="w-full py-3.5 rounded-2xl bg-black text-white text-[13.5px] font-bold shadow-md hover:bg-neutral-900 active:scale-[0.99] transition cursor-pointer flex items-center justify-center"
          >
            Back to Approvals
          </button>

          <button
            type="button"
            onClick={onGoToHome}
            className="w-full py-3.5 rounded-2xl bg-white border border-neutral-300 text-neutral-900 text-[13.5px] font-bold hover:bg-neutral-50 active:scale-[0.99] transition cursor-pointer flex items-center justify-center"
          >
            Go to Home
          </button>
        </div>

      </div>

      {/* Shared 5-Button Bottom Navigation */}
      <StaffBottomNav
        activeTab="Home"
        onNavigateHome={onGoToHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateMyRequests={onNavigateMyRequests}
        onNavigateProfile={onNavigateProfile}
      />

    </div>
  );
}
