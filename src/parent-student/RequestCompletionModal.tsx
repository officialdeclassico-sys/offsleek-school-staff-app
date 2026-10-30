/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileCheck, Calendar, Clock, Copy, Check } from 'lucide-react';
import VerifiedCheckBadge from '../components/VerifiedCheckBadge';

export interface RequestCompletionModalProps {
  title: string;
  category: string;
  requestId: string;
  submittedAt: string;
  notes?: string;
  onClose: () => void;
  onViewAllRequests?: () => void;
}

export default function RequestCompletionModal({
  title,
  category,
  requestId,
  submittedAt,
  notes,
  onClose,
  onViewAllRequests,
}: RequestCompletionModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-neutral-900 font-sans">
        
        {/* Animated Verification Confirmation Header */}
        <div className="pt-7 pb-4 px-6 text-center flex flex-col items-center bg-gradient-to-b from-neutral-50 to-white border-b border-neutral-100">
          
          {/* Spring pop-in animated badge with PhonePe/GPay style pulse */}
          <div className="mb-3 relative flex items-center justify-center">
            <VerifiedCheckBadge
              size="2xl"
              animate={true}
              showRipple={true}
              alt="Request Confirmed & Verified"
            />
          </div>

          <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
            REQUEST CONFIRMED
          </span>

          <h2 className="text-[20px] font-bold text-neutral-950 tracking-tight mt-1 mb-1">
            Submitted & Verified!
          </h2>

          <p className="text-[12px] text-neutral-600 font-medium max-w-[270px] leading-snug">
            Your request for <strong className="text-neutral-900">{title}</strong> has been logged and assigned to school administration.
          </p>
        </div>

        {/* Content details */}
        <div className="p-5 space-y-3.5 text-xs">
          
          <div className="bg-[#f8f9fa] rounded-2xl p-3.5 border border-neutral-200/70 space-y-2.5">
            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>Tracking ID</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="flex items-center gap-1 font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-md border border-neutral-200 hover:border-neutral-400 transition cursor-pointer"
              >
                <span>{requestId}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-400" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>Category</span>
              <span className="font-semibold text-neutral-900">{category}</span>
            </div>

            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span>Logged At</span>
              <span className="font-medium text-neutral-900">{submittedAt}</span>
            </div>

            {notes && (
              <div className="pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-600">
                <span className="font-semibold text-neutral-900">Remarks: </span>
                {notes}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-xl text-[11px] text-neutral-600 border border-neutral-100">
            <FileCheck className="w-4 h-4 text-neutral-900 shrink-0" />
            <span>Updates will be posted to your parent portal and SMS notification.</span>
          </div>

          {/* Action buttons */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-black hover:bg-neutral-800 text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <span>Done</span>
            </button>

            {onViewAllRequests && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewAllRequests();
                }}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium text-[12.5px] py-2 px-4 rounded-xl transition cursor-pointer"
              >
                View My Requests
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
