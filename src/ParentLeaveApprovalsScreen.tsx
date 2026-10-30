/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import {
  ParentLeaveRequest,
  getParentLeaveRequests,
} from './services/requestsService';

interface ParentLeaveApprovalsScreenProps {
  onBackToHome: () => void;
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateMyRequests: () => void;
  onNavigateProfile: () => void;
  onSelectRequest: (request: ParentLeaveRequest) => void;
}

type TabType = 'Pending' | 'Approved' | 'Rejected';

export default function ParentLeaveApprovalsScreen({
  onBackToHome,
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateMyRequests,
  onNavigateProfile,
  onSelectRequest,
}: ParentLeaveApprovalsScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Pending');
  const [requests, setRequests] = useState<ParentLeaveRequest[]>(getParentLeaveRequests);

  useEffect(() => {
    const handleUpdate = () => {
      setRequests(getParentLeaveRequests());
    };
    window.addEventListener('offsleek_parent_leave_updated', handleUpdate);
    return () => window.removeEventListener('offsleek_parent_leave_updated', handleUpdate);
  }, []);

  const pendingRequests = requests.filter((r) => r.status === 'Pending');
  const approvedRequests = requests.filter((r) => r.status === 'Approved');
  const rejectedRequests = requests.filter((r) => r.status === 'Rejected');

  const displayedRequests =
    activeTab === 'Pending'
      ? pendingRequests
      : activeTab === 'Approved'
      ? approvedRequests
      : rejectedRequests;

  const getStatusBadge = (status: ParentLeaveRequest['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
            Pending
          </span>
        );
      case 'Approved':
        return (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Top Status Bar with Dynamic Island */}
      <StaffStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-3">
        
        {/* Header: [ChevronLeft] [Heading & Subheading] */}
        <div className="flex items-start gap-1.5 min-w-0 pt-0.5">
          <button
            type="button"
            onClick={onBackToHome}
            className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
            aria-label="Back to Home"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-neutral-900 tracking-tight leading-tight">
              Parent Leave Approvals
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
              Review and approve/reject parent leave requests
            </p>
          </div>
        </div>

        {/* Filter Tabs: Pending (N), Approved, Rejected (Exact Replica of Screen 5) */}
        <div className="flex items-center gap-2 pt-1 border-b border-neutral-100 pb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('Pending')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'Pending'
                ? 'bg-black text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200/70'
            }`}
          >
            <span>Pending ({pendingRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Approved')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition cursor-pointer ${
              activeTab === 'Approved'
                ? 'bg-black text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200/70'
            }`}
          >
            Approved ({approvedRequests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Rejected')}
            className={`px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition cursor-pointer ${
              activeTab === 'Rejected'
                ? 'bg-black text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200/70'
            }`}
          >
            Rejected ({rejectedRequests.length})
          </button>
        </div>

        {/* Requests List (Exact Replica of Screen 5) */}
        <div className="space-y-2.5 pt-0.5">
          {displayedRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No {activeTab.toLowerCase()} parent leave requests.
            </div>
          ) : (
            displayedRequests.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectRequest(item)}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-300 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 cursor-pointer transition shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
              >
                {/* Left: Initials Avatar + Parent/Student Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    style={{ backgroundColor: `${item.parentColor}18`, color: item.parentColor }}
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 border border-neutral-100 mt-0.5"
                  >
                    {item.parentInitials}
                  </div>

                  <div className="min-w-0 flex-1 leading-snug">
                    <div className="text-[13.5px] font-bold text-neutral-900 truncate">
                      {item.parentName}
                    </div>
                    <div className="text-[11px] text-[#6b7280] truncate mt-0.5">
                      {item.studentName} ({item.classSection})
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10.5px] text-[#717684] mt-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{item.dates}</span>
                    </div>

                    <div className="text-[10.5px] text-[#8e95a2] mt-0.5 truncate">
                      Reason: <span className="text-neutral-700 font-medium">{item.reason}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Chip + Chevron */}
                <div className="flex items-center gap-1.5 shrink-0 self-center">
                  {getStatusBadge(item.status)}
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))
          )}
        </div>

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
