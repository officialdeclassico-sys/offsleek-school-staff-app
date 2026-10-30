/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ChevronLeft, Clock, FileText, Calendar, Paperclip } from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import { StaffRequest } from './services/requestsService';
import { triggerSuccessFeedback } from './utils/feedback';

interface RequestSubmittedScreenProps {
  record: StaffRequest;
  onViewMyRequests: () => void;
  onGoToHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateProfile: () => void;
  onBack?: () => void;
}

export default function RequestSubmittedScreen({
  record,
  onViewMyRequests,
  onGoToHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateProfile,
  onBack,
}: RequestSubmittedScreenProps) {
  useEffect(() => {
    triggerSuccessFeedback();
  }, []);

  const getHeadingTitle = () => {
    switch (record.type) {
      case 'Leave':
        return 'Leave Request Submitted';
      case 'Salary Slip':
        return 'Salary Slip Request Submitted';
      case 'Document':
        return 'Document Request Submitted';
      case 'Other':
      default:
        return 'Other Request Submitted';
    }
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Top Status Bar with Dynamic Island */}
      <StaffStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 sm:px-5 pt-1 pb-4 flex flex-col justify-between space-y-4">
        
        <div className="space-y-3.5">
          
          {/* Top Header Row with Back Chevron */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onBack || onViewMyRequests}
              className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer rounded-md hover:bg-neutral-100/60"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
          </div>

          {/* Glossy Black Verification Badge with Pulse Animation */}
          <div className="text-center pt-1">
            <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto flex items-center justify-center animate-pulse duration-1000">
              <img
                src="/assets/Dark Verified Check Badge.png"
                alt="Verified"
                className="w-16 h-16 sm:w-18 sm:h-18 object-contain drop-shadow-md"
              />
            </div>
            <h1 className="text-[20px] sm:text-[22px] font-bold text-neutral-900 tracking-tight mt-2.5">
              {getHeadingTitle()}
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] mt-1 max-w-[280px] mx-auto leading-relaxed">
              Your request has been submitted successfully.
            </p>
          </div>

          {/* Request Details Card matching reference */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-3.5">
            <h2 className="text-[13px] font-bold text-neutral-900 pb-2 border-b border-neutral-100">
              Request Details
            </h2>

            <div className="space-y-3 text-[12px]">
              {/* Submitted On */}
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#8e95a2] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-[#8e95a2] tracking-wider">
                    SUBMITTED ON
                  </div>
                  <div className="font-semibold text-neutral-900 mt-0.5">
                    {record.submittedOn}
                  </div>
                </div>
              </div>

              {/* Purpose / Title */}
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-[#8e95a2] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-[#8e95a2] tracking-wider">
                    PURPOSE
                  </div>
                  <div className="font-semibold text-neutral-900 mt-0.5">
                    {record.title || record.subtitle || record.reason}
                  </div>
                </div>
              </div>

              {/* Additional Details / Reason */}
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-[#8e95a2] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-[#8e95a2] tracking-wider">
                    ADDITIONAL DETAILS
                  </div>
                  <div className="font-medium text-neutral-800 mt-0.5 break-words leading-relaxed">
                    {record.reason || record.details || 'No additional notes provided.'}
                  </div>
                </div>
              </div>

              {/* Attached Document */}
              <div className="flex items-start gap-2.5">
                <Paperclip className="w-4 h-4 text-[#8e95a2] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-[#8e95a2] tracking-wider">
                    ATTACHED DOCUMENT
                  </div>
                  <div className="font-medium text-neutral-800 mt-0.5">
                    {record.attachmentName ? `${record.attachmentName} (${record.attachmentSize})` : 'No document attached'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Panel (Blue Light Box matching reference) */}
          <div className="bg-[#f0f9ff] border border-sky-200/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
            <Clock className="w-5 h-5 text-[#0284c7] shrink-0 mt-0.5" />
            <div className="text-[12px] leading-relaxed flex-1">
              <span className="font-bold text-[#0369a1] block">Pending Approval</span>
              <span className="text-[#0369a1]/90 text-[11.5px] mt-0.5 block leading-relaxed">
                Your request has been sent to the school administration for approval. You will be notified once it is reviewed.
              </span>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onViewMyRequests}
            className="w-full py-3.5 rounded-2xl bg-black text-white text-[13.5px] font-bold shadow-md hover:bg-neutral-900 active:scale-[0.99] transition cursor-pointer flex items-center justify-center"
          >
            View My Requests
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
        activeTab="My Requests"
        onNavigateHome={onGoToHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateMyRequests={onViewMyRequests}
        onNavigateProfile={onNavigateProfile}
      />

    </div>
  );
}
