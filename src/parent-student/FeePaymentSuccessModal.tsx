/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Share2, ShieldCheck, Calendar, Hash, CreditCard } from 'lucide-react';
import VerifiedCheckBadge from '../components/VerifiedCheckBadge';

export interface FeePaymentSuccessModalProps {
  amount: number;
  transactionId: string;
  studentName: string;
  grade: string;
  term: string;
  date: string;
  onClose: () => void;
  onDownloadReceipt: () => void;
}

export default function FeePaymentSuccessModal({
  amount,
  transactionId,
  studentName,
  grade,
  term,
  date,
  onClose,
  onDownloadReceipt,
}: FeePaymentSuccessModalProps) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[370px] bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-neutral-900 font-sans">
        
        {/* Payment Confirmation Header (PhonePe / GPay style) */}
        <div className="relative pt-7 pb-5 px-6 text-center flex flex-col items-center bg-gradient-to-b from-neutral-50 to-white border-b border-neutral-100">
          
          {/* Animated Hero Verification Badge with Spring Pop & Concentric Ripple */}
          <div className="mb-3.5 relative flex items-center justify-center">
            <VerifiedCheckBadge
              size="2xl"
              animate={true}
              showRipple={true}
              alt="Payment Verified"
            />
          </div>

          <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
            PAYMENT SUCCESSFUL
          </span>

          <h2 className="text-[28px] font-black text-neutral-950 tracking-tight mt-1 mb-0.5">
            {formattedAmount}
          </h2>

          <p className="text-[12.5px] text-neutral-600 font-medium max-w-[260px] leading-snug">
            School Fee Paid to Greenwood International
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-5 space-y-3.5 text-xs">
          
          <div className="bg-[#f8f9fa] rounded-2xl p-3.5 border border-neutral-200/70 space-y-2.5">
            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-neutral-400" />
                Transaction Ref
              </span>
              <span className="font-mono font-semibold text-neutral-900 text-[11.5px]">
                {transactionId}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                Payment Mode
              </span>
              <span className="font-medium text-neutral-900">
                UPI / NetBanking (Verified)
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-500 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Date & Time
              </span>
              <span className="font-medium text-neutral-900">
                {date}
              </span>
            </div>

            <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-neutral-900">
              <div>
                <div className="text-[10px] text-neutral-500 font-medium">STUDENT & PURPOSE</div>
                <div className="font-bold text-[13px]">{studentName} ({grade})</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-neutral-500 font-medium">FEE TYPE</div>
                <div className="font-semibold text-[12px]">{term}</div>
              </div>
            </div>
          </div>

          {/* Verification Assurance Seal */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200/50 text-[11px] text-neutral-600">
            <ShieldCheck className="w-4 h-4 text-neutral-900 shrink-0" />
            <span>Digital receipt signed & verified with official school seal.</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onDownloadReceipt}
              className="w-full bg-black hover:bg-neutral-800 text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Download Digital Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-[0.99]"
            >
              <span>Back to Student Portal</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
