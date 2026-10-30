/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  Calendar as CalendarIcon,
  Paperclip,
  Check,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import { StaffRequest, submitStaffRequest } from './services/requestsService';
import {
  addDaysIST,
  calculateInclusiveDays,
  formatDateKeyDisplayIST,
  formatISTDateKey,
  getNow,
  parseDateKeySafe,
} from './utils/dateTimeUtils';

interface LeaveRequestFormScreenProps {
  onBackToRequests: () => void;
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateProfile: () => void;
  onSubmitSuccess: (record: StaffRequest) => void;
}

const LEAVE_TYPES = [
  'Casual Leave',
  'Medical Leave',
  'Sick Leave',
  'Earned Leave',
  'Compensatory Off',
  'Duty Leave',
];

export default function LeaveRequestFormScreen({
  onBackToRequests,
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateProfile,
  onSubmitSuccess,
}: LeaveRequestFormScreenProps) {
  // Form State
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [isLeaveTypeDropdownOpen, setIsLeaveTypeDropdownOpen] = useState(false);

  const [fromDate, setFromDate] = useState(() => formatISTDateKey());
  const [toDate, setToDate] = useState(() => formatISTDateKey(addDaysIST(getNow(), 2)));

  const [reason, setReason] = useState('');
  const maxReasonChars = 500;

  // Attachment
  const [attachment, setAttachment] = useState<{ name: string; size: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Compute duration in days using timezone-safe YYYY-MM-DD math
  const calculateDays = () => {
    return calculateInclusiveDays(fromDate, toDate);
  };

  const formatDateDisplay = (dateString: string) => {
    return formatDateKeyDisplayIST(dateString);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    const isAllowed = allowed.some((ext) => lowerName.endsWith(ext));
    if (!isAllowed) {
      setFileError('Unsupported file type. Please upload PDF, JPG, or PNG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File exceeds maximum size of 5 MB.');
      return;
    }

    const sizeFormatted = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    setAttachment({
      name: file.name,
      size: sizeFormatted,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!leaveType) {
      setValidationError('Please select a leave type.');
      return;
    }

    if (!fromDate || !toDate) {
      setValidationError('Please select both From and To dates.');
      return;
    }

    if (parseDateKeySafe(fromDate) > parseDateKeySafe(toDate)) {
      setValidationError('To Date cannot be earlier than From Date.');
      return;
    }

    if (!reason.trim()) {
      setValidationError('Please enter a reason for your leave.');
      return;
    }

    if (reason.length > maxReasonChars) {
      setValidationError(`Reason cannot exceed ${maxReasonChars} characters.`);
      return;
    }

    setIsSubmitting(true);

    const days = calculateDays();
    const durationStr = `${formatDateDisplay(fromDate)} - ${formatDateDisplay(toDate)} (${days} ${days === 1 ? 'day' : 'days'})`;

    setTimeout(() => {
      try {
        const record = submitStaffRequest({
          staffId: 'T001',
          staffName: 'Ms. Priya Sharma',
          type: 'Leave',
          title: 'Leave Request',
          leaveType,
          fromDate,
          toDate,
          duration: durationStr,
          reason: reason.trim(),
          attachmentName: attachment?.name,
          attachmentSize: attachment?.size,
        });
        setIsSubmitting(false);
        onSubmitSuccess(record);
      } catch (err: unknown) {
        setIsSubmitting(false);
        const msg = err instanceof Error ? err.message : 'Failed to submit leave request.';
        setValidationError(msg);
      }
    }, 400);
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Top Status Bar with Dynamic Island */}
      <StaffStatusBar />

      {/* Main Form Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-3.5">
        
        {/* Header: [ChevronLeft] [Heading & Subheading] */}
        <div className="flex items-start gap-1.5 min-w-0 pt-0.5">
          <button
            type="button"
            onClick={onBackToRequests}
            className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
            aria-label="Back to My Requests"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-neutral-900 tracking-tight leading-tight">
              Leave Request
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
              Submit a request for your leave
            </p>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11.5px] rounded-xl p-2.5 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{validationError}</span>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Field 1: Leave Type * */}
          <div className="space-y-1 relative">
            <label className="block text-[12.5px] font-bold text-neutral-900">
              Leave Type <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsLeaveTypeDropdownOpen(!isLeaveTypeDropdownOpen)}
              className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl px-3 py-2.5 text-[12.5px] font-medium text-neutral-900 transition cursor-pointer"
            >
              <span>{leaveType || 'Select Leave Type'}</span>
              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            </button>

            {isLeaveTypeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-xl py-1 z-40 animate-in fade-in zoom-in-95">
                {LEAVE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setLeaveType(type);
                      setIsLeaveTypeDropdownOpen(false);
                      if (validationError) setValidationError(null);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[12px] transition flex items-center justify-between ${
                      leaveType === type ? 'bg-neutral-900 text-white font-semibold' : 'text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{type}</span>
                    {leaveType === type && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Field 2: From Date * and To Date * side by side */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[12.5px] font-bold text-neutral-900">
                From Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center bg-white border border-[#e5e7eb] rounded-xl px-2.5 py-2 focus-within:border-neutral-400 transition">
                <CalendarIcon className="w-4 h-4 text-neutral-400 shrink-0 mr-1.5" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full bg-transparent text-[12px] font-medium text-neutral-900 outline-none cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[12.5px] font-bold text-neutral-900">
                To Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center bg-white border border-[#e5e7eb] rounded-xl px-2.5 py-2 focus-within:border-neutral-400 transition">
                <CalendarIcon className="w-4 h-4 text-neutral-400 shrink-0 mr-1.5" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full bg-transparent text-[12px] font-medium text-neutral-900 outline-none cursor-pointer"
                  required
                />
              </div>
            </div>
          </div>

          {/* Duration Indicator */}
          <div className="text-[11px] text-neutral-500 font-medium pl-0.5">
            Duration: <span className="text-neutral-900 font-semibold">{calculateDays()} days</span> ({formatDateDisplay(fromDate)} – {formatDateDisplay(toDate)})
          </div>

          {/* Field 3: Reason for Leave * */}
          <div className="space-y-1">
            <label className="block text-[12.5px] font-bold text-neutral-900">
              Reason for Leave <span className="text-rose-500">*</span>
            </label>
            <div className="border border-[#e5e7eb] rounded-2xl bg-white p-3 focus-within:border-neutral-400 transition">
              <textarea
                rows={4}
                maxLength={maxReasonChars}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Enter reason for leave..."
                className="w-full bg-transparent resize-none text-[12.5px] text-neutral-900 placeholder:text-neutral-400 outline-none leading-relaxed min-h-[90px]"
                required
              />
            </div>
            <div className="text-[11px] text-neutral-400 font-medium text-right pr-0.5">
              {reason.length}/{maxReasonChars}
            </div>
          </div>

          {/* Field 4: Attach Document (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-[12.5px] font-bold text-neutral-900">
              Attach Document (Optional)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#d1d5db] hover:border-neutral-500 rounded-2xl bg-[#fcfdfd] hover:bg-[#f8f9fa] transition p-4 text-center cursor-pointer flex flex-col items-center justify-center select-none"
            >
              <Paperclip className="w-5 h-5 text-neutral-800 stroke-[1.8]" />
              <div className="text-[12.5px] font-semibold text-neutral-900 mt-1.5">
                Tap to upload document
              </div>
              <div className="text-[10.5px] text-[#8e95a2] mt-0.5">
                PDF, JPG, PNG (Max 5 MB)
              </div>
            </div>

            {fileError && (
              <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5 pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {attachment && (
              <div className="bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 flex items-center justify-between text-xs mt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-neutral-600 shrink-0" />
                  <span className="font-semibold text-neutral-900 truncate max-w-[200px]">
                    {attachment.name}
                  </span>
                  <span className="text-[10.5px] text-neutral-400 shrink-0">
                    ({attachment.size})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Request Button (Exact Replica of Screen 3) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-black text-white text-[13.5px] sm:text-[14px] font-bold shadow-md hover:bg-neutral-900 active:scale-[0.99] transition cursor-pointer flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting Request...
                </span>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>

        </form>

      </div>

      {/* Shared 5-Button Bottom Navigation (My Requests Active) */}
      <StaffBottomNav
        activeTab="My Requests"
        onNavigateHome={onNavigateHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateMyRequests={onBackToRequests}
        onNavigateProfile={onNavigateProfile}
      />

    </div>
  );
}
