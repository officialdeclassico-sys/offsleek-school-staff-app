/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Calendar,
  FileText,
  MoreHorizontal,
  Check,
  X,
  AlertCircle,
  Download,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import {
  StaffRequest,
  getStaffRequests,
  submitStaffRequest,
} from './services/requestsService';
import { formatISTDateMedium, useISTCurrentDate, shiftMonthYear } from './utils/dateTimeUtils';

interface MyRequestsScreenProps {
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateProfile: () => void;
  onOpenLeaveRequestForm: () => void;
  onSubmitSuccess?: (record: StaffRequest) => void;
}

type ViewMode = 'LANDING' | 'TRACKING';
type RequestFilter = 'All' | 'Leave' | 'Salary Slip' | 'Document' | 'Other';

const VALID_FILTERS: RequestFilter[] = ['All', 'Leave', 'Salary Slip', 'Document', 'Other'];

interface TrackerStage {
  label: string;
  sublabel?: string;
  timestamp?: string;
  state: 'completed' | 'rejected' | 'pending';
}

interface TrackerConfig {
  stage1: TrackerStage;
  stage2: TrackerStage;
  stage3: TrackerStage;
  line1Active: boolean;
  line2Active: boolean;
}

/**
 * Computes accurate, workflow-specific 3-stage progress tracker configuration
 * for any request type (Leave Request, Salary Slip, Document Request, Experience Letter, Other Request)
 * across all valid lifecycle states: Pending / Under Review, Approved, Completed, and Rejected.
 */
function getRequestTracker(request: StaffRequest): TrackerConfig {
  const isLeave = request.type === 'Leave';
  const isPending = request.status === 'Pending Approval' || request.status === 'Under Review';
  const isApproved = request.status === 'Approved';
  const isCompleted = request.status === 'Completed';

  // Stage 1 timestamp
  const stage1Timestamp = request.stage1Timestamp || request.submittedOn;

  if (isLeave) {
    // Leave Request Workflow: Submitted -> Under Review -> Approved
    if (isPending) {
      return {
        stage1: { label: 'Submitted', timestamp: stage1Timestamp, state: 'completed' },
        stage2: {
          label: request.stage2Label || 'Under Review',
          sublabel: request.stage2Sublabel || '(Administration)',
          state: 'pending',
        },
        stage3: { label: request.stage3Label || 'Approved', state: 'pending' },
        line1Active: false,
        line2Active: false,
      };
    } else if (isApproved || isCompleted) {
      return {
        stage1: { label: 'Submitted', timestamp: stage1Timestamp, state: 'completed' },
        stage2: {
          label: 'Under Review',
          timestamp: request.stage2Timestamp || stage1Timestamp,
          state: 'completed',
        },
        stage3: {
          label: request.stage3Label || 'Approved',
          timestamp: request.stage3Timestamp || request.stage2Timestamp || '15 Oct, 11:00 AM',
          state: 'completed',
        },
        line1Active: true,
        line2Active: true,
      };
    } else {
      // Rejected
      return {
        stage1: { label: 'Submitted', timestamp: stage1Timestamp, state: 'completed' },
        stage2: {
          label: 'Rejected',
          timestamp: request.stage2Timestamp || stage1Timestamp,
          state: 'rejected',
        },
        stage3: { label: request.stage3Label || 'Approved', state: 'pending' },
        line1Active: true,
        line2Active: false,
      };
    }
  }

  // Workflows for Salary Slip, Document Request (Experience Letter, Employment Letter), and Other Request
  // Workflow: Submitted -> Approved / Under Review / Rejected -> Completed
  if (isPending) {
    return {
      stage1: { label: 'Submitted', timestamp: stage1Timestamp, state: 'completed' },
      stage2: {
        label:
          request.stage2Label ||
          (request.type === 'Salary Slip' || request.type === 'Document' ? 'Approved' : 'Under Review'),
        sublabel: request.stage2Sublabel,
        state: 'pending',
      },
      stage3: { label: request.stage3Label || 'Completed', state: 'pending' },
      line1Active: false,
      line2Active: false,
    };
  } else if (isApproved) {
    // Approved state: Submitted and Approved are marked completed; Completed is pending
    return {
      stage1: { label: 'Submitted', timestamp: stage1Timestamp, state: 'completed' },
      stage2: {
        label: 'Approved',
        timestamp: request.stage2Timestamp,
        state: 'completed',
      },
      stage3: { label: request.stage3Label || 'Completed', state: 'pending' },
      line1Active: true,
      line2Active: false,
    };
  } else if (isCompleted) {
    // Completed state: All 3 stages are complete
    return {
      stage1: { label: 'Submitted', timestamp: stage1Timestamp, state: 'completed' },
      stage2: {
        label: 'Approved',
        timestamp: request.stage2Timestamp,
        state: 'completed',
      },
      stage3: {
        label: request.stage3Label || 'Completed',
        timestamp: request.stage3Timestamp || request.stage2Timestamp,
        state: 'completed',
      },
      line1Active: true,
      line2Active: true,
    };
  } else {
    // Rejected state: Submitted is complete, Stage 2 is Rejected, Stage 3 is incomplete
    return {
      stage1: { label: 'Submitted', timestamp: stage1Timestamp, state: 'completed' },
      stage2: {
        label: 'Rejected',
        timestamp: request.stage2Timestamp,
        state: 'rejected',
      },
      stage3: { label: request.stage3Label || 'Completed', state: 'pending' },
      line1Active: true,
      line2Active: false,
    };
  }
}

export default function MyRequestsScreen({
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateProfile,
  onOpenLeaveRequestForm,
  onSubmitSuccess,
}: MyRequestsScreenProps) {
  // Initialize state from URL params or localStorage to ensure direct navigation survives refresh
  const getInitialRouting = (): { viewMode: ViewMode; activeFilter: RequestFilter; focusedRequestId: string | null } => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const subviewParam = params.get('subview');
      const filterParam = params.get('filter');
      const idParam = params.get('id');

      if (subviewParam === 'tracking') {
        const matched = VALID_FILTERS.find((f) => f.toLowerCase() === (filterParam || '').toLowerCase());
        return {
          viewMode: 'TRACKING',
          activeFilter: matched || 'All',
          focusedRequestId: idParam || null,
        };
      }

      const savedSubview = localStorage.getItem('offsleek_my_requests_subview');
      const savedFilter = localStorage.getItem('offsleek_my_requests_filter') as RequestFilter | null;
      const savedId = localStorage.getItem('offsleek_my_requests_focused_id');
      if (savedSubview === 'tracking') {
        return {
          viewMode: 'TRACKING',
          activeFilter: savedFilter || 'All',
          focusedRequestId: savedId || null,
        };
      }
    }
    return {
      viewMode: 'LANDING',
      activeFilter: 'All',
      focusedRequestId: null,
    };
  };

  const initialRoute = getInitialRouting();
  const [viewMode, setViewMode] = useState<ViewMode>(initialRoute.viewMode);
  const [activeFilter, setActiveFilter] = useState<RequestFilter>(initialRoute.activeFilter);
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(initialRoute.focusedRequestId);

  const { previousMonthYearStr } = useISTCurrentDate();
  const [requests, setRequests] = useState<StaffRequest[]>(getStaffRequests);

  // Quick submission modal state for new requests created on the Landing Page (Salary Slip / Document / Other)
  const [quickModalType, setQuickModalType] = useState<
    'Salary Slip' | 'Document Request' | 'Other Request' | null
  >(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickSubtype, setQuickSubtype] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setRequests(getStaffRequests());
    };
    window.addEventListener('offsleek_staff_request_submitted', handleUpdate);
    return () => window.removeEventListener('offsleek_staff_request_submitted', handleUpdate);
  }, []);

  // Synchronize route and storage state
  const updateRouteState = (mode: ViewMode, filter: RequestFilter, targetId: string | null = null) => {
    setViewMode(mode);
    setActiveFilter(filter);
    setFocusedRequestId(targetId);

    if (typeof window !== 'undefined') {
      if (mode === 'TRACKING') {
        localStorage.setItem('offsleek_my_requests_subview', 'tracking');
        localStorage.setItem('offsleek_my_requests_filter', filter);
        if (targetId) {
          localStorage.setItem('offsleek_my_requests_focused_id', targetId);
        } else {
          localStorage.removeItem('offsleek_my_requests_focused_id');
        }

        const params = new URLSearchParams();
        params.set('subview', 'tracking');
        params.set('filter', filter);
        if (targetId) params.set('id', targetId);
        window.history.replaceState(null, '', `?${params.toString()}`);
      } else {
        localStorage.removeItem('offsleek_my_requests_subview');
        localStorage.removeItem('offsleek_my_requests_filter');
        localStorage.removeItem('offsleek_my_requests_focused_id');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  };

  // Navigate to full tracking view when tapping a recent request card (No popups)
  const handleRecentRequestClick = (request: StaffRequest) => {
    const filter: RequestFilter = request.type;
    updateRouteState('TRACKING', filter, request.id);
  };

  // Filter requests based on active category in Tracking view
  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Leave') return r.type === 'Leave';
    if (activeFilter === 'Salary Slip') return r.type === 'Salary Slip';
    if (activeFilter === 'Document') return r.type === 'Document';
    if (activeFilter === 'Other') return r.type === 'Other';
    return true;
  });

  // Keep target request visible and sorted to top when navigating from recent requests
  const displayedTrackingRequests = [...filteredRequests].sort((a, b) => {
    if (focusedRequestId) {
      if (a.id === focusedRequestId) return -1;
      if (b.id === focusedRequestId) return 1;
    }
    return 0;
  });

  // Recent requests for Landing view (latest 4)
  const recentRequests = requests.slice(0, 4);

  const getStatusBadge = (status: StaffRequest['status']) => {
    switch (status) {
      case 'Pending Approval':
      case 'Under Review':
        return (
          <span className="text-[11px] font-semibold text-[#b45309] bg-[#fffbeb] border border-amber-200/60 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            {status === 'Under Review' ? 'Under Review' : 'Pending Approval'}
          </span>
        );
      case 'Completed':
        return (
          <span className="text-[11px] font-semibold text-[#15803d] bg-[#ecfdf5] border border-emerald-200/60 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            Completed
          </span>
        );
      case 'Approved':
        return (
          <span className="text-[11px] font-semibold text-[#2563eb] bg-[#eff6ff] border border-blue-200/60 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="text-[11px] font-semibold text-[#dc2626] bg-[#fef2f2] border border-rose-200/60 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            Rejected
          </span>
        );
    }
  };

  const getRequestIcon = (type: StaffRequest['type']) => {
    switch (type) {
      case 'Leave':
        return <Calendar className="w-5 h-5 text-neutral-900 stroke-[1.8]" />;
      case 'Salary Slip':
      case 'Document':
        return <FileText className="w-5 h-5 text-neutral-900 stroke-[1.8]" />;
      case 'Other':
      default:
        return <MoreHorizontal className="w-5 h-5 text-neutral-900 stroke-[1.8]" />;
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickModalType) return;

    let title: string = quickModalType;
    let type: StaffRequest['type'] = 'Other';

    if (quickModalType === 'Salary Slip') {
      type = 'Salary Slip';
      title = quickSubtype ? `Salary Slip (${quickSubtype})` : 'Salary Slip';
    } else if (quickModalType === 'Document Request') {
      type = 'Document';
      title = quickSubtype ? quickSubtype : 'Employment Letter';
    } else {
      type = 'Other';
      title = quickSubtype ? quickSubtype : 'Other Request';
    }

    const record = submitStaffRequest({
      staffId: 'T001',
      staffName: 'Ms. Priya Sharma',
      type,
      title,
      reason: quickNote || 'Submitted via Staff Portal',
      duration: formatISTDateMedium(),
    });

    setQuickModalType(null);
    setQuickNote('');
    setQuickSubtype('');
    setRequests(getStaffRequests());
    if (onSubmitSuccess) {
      onSubmitSuccess(record);
    } else {
      showToast(`${title} submitted successfully!`);
    }
  };

  const handleDownloadSalarySlip = () => {
    setQuickModalType(null);
    showToast(`Salary Slip (${previousMonthYearStr}) downloaded successfully.`);
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-4 right-4 z-50 bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl flex items-center justify-between animate-in fade-in">
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Status Bar with Dynamic Island */}
      <StaffStatusBar />

      {/* VIEW 1: MY REQUESTS LANDING PAGE */}
      {viewMode === 'LANDING' ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-4">
          {/* Header: [Small left chevron] [My Requests / Submit and track your workplace requests] */}
          <div className="flex items-start gap-1.5 min-w-0 pt-0.5">
            <button
              type="button"
              onClick={onNavigateHome}
              className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
              aria-label="Back to Home"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-900 tracking-tight leading-tight">
                My Requests
              </h1>
              <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
                Submit and track your workplace requests
              </p>
            </div>
          </div>

          {/* Request Options: 2-Column Grid (Kept completely available for creating requests) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Card 1: Leave Request */}
            <div
              onClick={onOpenLeaveRequestForm}
              className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-neutral-400 transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#f0f2f5] flex items-center justify-center text-neutral-900 mb-3">
                <Calendar className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[13.5px] sm:text-[14px] font-bold text-neutral-900 leading-snug">
                  Leave Request
                </h3>
                <p className="text-[11px] sm:text-[11.5px] text-[#717684] mt-1 leading-normal line-clamp-2">
                  Apply for leave and track approval.
                </p>
              </div>
            </div>

            {/* Card 2: Salary Slip */}
            <div
              onClick={() => {
                setQuickModalType('Salary Slip');
                setQuickSubtype(previousMonthYearStr);
              }}
              className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-neutral-400 transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#f0f2f5] flex items-center justify-center text-neutral-900 mb-3">
                <FileText className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[13.5px] sm:text-[14px] font-bold text-neutral-900 leading-snug">
                  Salary Slip
                </h3>
                <p className="text-[11px] sm:text-[11.5px] text-[#717684] mt-1 leading-normal line-clamp-2">
                  Request or download your salary slip.
                </p>
              </div>
            </div>

            {/* Card 3: Document Request */}
            <div
              onClick={() => {
                setQuickModalType('Document Request');
                setQuickSubtype('');
              }}
              className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-neutral-400 transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#f0f2f5] flex items-center justify-center text-neutral-900 mb-3">
                <FileText className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[13.5px] sm:text-[14px] font-bold text-neutral-900 leading-snug">
                  Document Request
                </h3>
                <p className="text-[11px] sm:text-[11.5px] text-[#717684] mt-1 leading-normal line-clamp-2">
                  Request employment letters and other documents.
                </p>
              </div>
            </div>

            {/* Card 4: Other Request */}
            <div
              onClick={() => {
                setQuickModalType('Other Request');
                setQuickSubtype('');
              }}
              className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-neutral-400 transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#f0f2f5] flex items-center justify-center text-neutral-900 mb-3">
                <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-[13.5px] sm:text-[14px] font-bold text-neutral-900 leading-snug">
                  Other Request
                </h3>
                <p className="text-[11px] sm:text-[11.5px] text-[#717684] mt-1 leading-normal line-clamp-2">
                  Submit another workplace request.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Requests Section */}
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-neutral-900 tracking-tight">
                Recent Requests
              </h2>
              <button
                type="button"
                onClick={() => updateRouteState('TRACKING', 'All', null)}
                className="text-[12px] font-semibold text-neutral-900 hover:text-black cursor-pointer flex items-center gap-0.5 active:scale-95 transition"
              >
                <span>View All</span>
                <ChevronLeft className="w-3.5 h-3.5 rotate-180 stroke-[2.2]" />
              </button>
            </div>

            {/* List of Recent Requests: Tapping navigates directly to the tracking view without popup */}
            <div className="space-y-2.5">
              {recentRequests.length === 0 ? (
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 text-center space-y-1">
                  <p className="text-[13px] font-medium text-neutral-600">No requests submitted yet</p>
                  <p className="text-[11px] text-neutral-400">Tap any option above to submit a request.</p>
                </div>
              ) : (
                recentRequests.map((request) => (
                  <div
                    key={request.id}
                    onClick={() => handleRecentRequestClick(request)}
                    className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-neutral-400 transition cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#f0f2f5] flex items-center justify-center shrink-0 text-neutral-900">
                        {getRequestIcon(request.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13.5px] sm:text-[14px] font-bold text-neutral-900 truncate">
                          {request.title}
                        </h4>
                        <p className="text-[11.5px] text-[#6b7280] truncate mt-0.5">
                          {request.dates || request.duration || request.submittedOn}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: FULL REQUEST TRACKING PAGE (VIEW ALL DESTINATION) */
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-3.5">
          {/* Header matching View All Reference: [Back Chevron to landing] [Heading and Subtitle] */}
          <div className="flex items-start gap-1.5 min-w-0 pt-0.5">
            <button
              type="button"
              onClick={() => updateRouteState('LANDING', 'All', null)}
              className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
              aria-label="Back to Request Options"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[21px] sm:text-[23px] font-bold text-neutral-900 tracking-tight leading-tight">
                My Requests
              </h1>
              <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
                Track the status of your submitted requests
              </p>
            </div>
          </div>

          {/* Category Filter Tabs: All, Leave, Salary Slip, Document, Other */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {VALID_FILTERS.map((tab) => {
              const isActive = activeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => updateRouteState('TRACKING', tab, focusedRequestId)}
                  className={`shrink-0 py-1.5 px-3.5 sm:px-4 rounded-full text-[12px] font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-black text-white shadow-2xs'
                      : 'bg-white text-neutral-800 border border-[#e5e7eb] hover:bg-neutral-50'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Request Cards Stacked Vertically with Natural Spacing */}
          <div className="space-y-3.5 pb-2">
            {displayedTrackingRequests.length === 0 ? (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 text-center space-y-2 mt-4">
                <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center justify-center mx-auto text-neutral-400">
                  <FileText className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-[14px] font-bold text-neutral-900">No {activeFilter} Requests</h4>
                <p className="text-[12px] text-neutral-500 max-w-xs mx-auto">
                  You have not submitted any {activeFilter === 'All' ? '' : activeFilter.toLowerCase()} requests yet.
                </p>
              </div>
            ) : (
              displayedTrackingRequests.map((request) => {
                const isTargeted = focusedRequestId === request.id;
                const tracker = getRequestTracker(request);
                const isRejected = request.status === 'Rejected';

                return (
                  <div
                    key={request.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3 transition ${
                      isTargeted
                        ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                        : 'border-[#e5e7eb]'
                    }`}
                  >
                    {/* Card Header Row: Icon, Title & Subtitle, Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Monochrome Circular Icon Container */}
                        <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#f0f2f5] flex items-center justify-center shrink-0 text-neutral-900 mt-0.5">
                          {getRequestIcon(request.type)}
                        </div>

                        {/* Request Title, Subtitle, Date */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[14px] sm:text-[14.5px] font-bold text-neutral-900 leading-tight truncate">
                              {request.title}
                            </h3>
                            {isTargeted && (
                              <span className="text-[10px] font-semibold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded-md">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#6b7280] mt-0.5 leading-snug truncate">
                            {request.subtitle || request.reason || request.details}
                          </p>
                          <p className="text-[11.5px] text-[#8e95a2] mt-0.5 leading-tight truncate">
                            {request.dates || request.duration || request.details}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0 pt-0.5">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>

                    {/* THREE-STAGE PROGRESS TRACKER (Consistent across Leave, Salary Slip, Document, Other) */}
                    <div className="pt-2 pb-1">
                      <div className="relative w-full">
                        {/* Connecting Line 1 (Stage 1 center 16.666% to Stage 2 center 50%) */}
                        <div
                          className={`absolute left-[16.666%] right-[50%] h-[2px] top-[10px] -translate-y-1/2 pointer-events-none transition-colors z-0 ${
                            tracker.line1Active ? 'bg-black' : 'bg-[#e5e7eb]'
                          }`}
                        />

                        {/* Connecting Line 2 (Stage 2 center 50% to Stage 3 center 83.333%) */}
                        <div
                          className={`absolute left-[50%] right-[16.666%] h-[2px] top-[10px] -translate-y-1/2 pointer-events-none transition-colors z-0 ${
                            tracker.line2Active ? 'bg-black' : 'bg-[#e5e7eb]'
                          }`}
                        />

                        {/* 3 Columns matching connecting line centers (16.666%, 50%, 83.333%) */}
                        <div className="grid grid-cols-3 relative z-10 w-full">
                          {/* Stage 1: Submitted (Column 1) */}
                          <div className="flex flex-col items-center text-center px-1">
                            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white shadow-2xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div className="mt-1.5 w-full">
                              <div className="text-[11px] font-bold text-neutral-900 leading-tight">
                                {tracker.stage1.label}
                              </div>
                              <div className="text-[10px] text-[#6b7280] mt-0.5 whitespace-nowrap">
                                {tracker.stage1.timestamp}
                              </div>
                            </div>
                          </div>

                          {/* Stage 2: Under Review / Approved / Rejected (Column 2) */}
                          <div className="flex flex-col items-center text-center px-1">
                            {tracker.stage2.state === 'rejected' ? (
                              <div className="w-5 h-5 rounded-full bg-[#dc2626] flex items-center justify-center text-white shadow-2xs">
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : tracker.stage2.state === 'completed' ? (
                              <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white shadow-2xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[#d1d5db] bg-white flex items-center justify-center" />
                            )}
                            <div className="mt-1.5 w-full">
                              <div
                                className={`text-[11px] leading-tight ${
                                  tracker.stage2.state === 'rejected'
                                    ? 'font-bold text-[#dc2626]'
                                    : tracker.stage2.state === 'completed'
                                    ? 'font-bold text-neutral-900'
                                    : 'font-normal text-[#6b7280]'
                                }`}
                              >
                                {tracker.stage2.label}
                              </div>
                              {tracker.stage2.sublabel && tracker.stage2.state === 'pending' && (
                                <div className="text-[10px] text-[#8e95a2] mt-0.5 leading-tight">
                                  {tracker.stage2.sublabel}
                                </div>
                              )}
                              {tracker.stage2.timestamp && (
                                <div className="text-[10px] text-[#6b7280] mt-0.5 whitespace-nowrap leading-tight">
                                  {tracker.stage2.timestamp}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stage 3: Completed / Approved (Column 3) */}
                          <div className="flex flex-col items-center text-center px-1">
                            {tracker.stage3.state === 'completed' ? (
                              <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white shadow-2xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[#d1d5db] bg-white flex items-center justify-center" />
                            )}
                            <div className="mt-1.5 w-full">
                              <div
                                className={`text-[11px] leading-tight ${
                                  tracker.stage3.state === 'completed'
                                    ? 'font-bold text-neutral-900'
                                    : 'font-normal text-[#6b7280]'
                                }`}
                              >
                                {tracker.stage3.label}
                              </div>
                              {tracker.stage3.timestamp && (
                                <div className="text-[10px] text-[#6b7280] mt-0.5 whitespace-nowrap leading-tight">
                                  {tracker.stage3.timestamp}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rejection Reason Notice (Matching Reference: Full-width Light Red Panel) */}
                    {isRejected && (
                      <div className="bg-[#fff5f5] border border-[#fecaca] rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 mt-2">
                        <AlertCircle className="w-4.5 h-4.5 text-[#dc2626] shrink-0 mt-0.5" />
                        <div className="text-[11.5px] text-[#dc2626] leading-relaxed flex-1">
                          <span className="font-semibold">Reason: </span>
                          {request.rejectionReason ||
                            'ID card reissue requires physical verification.\nPlease contact the administration office.'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Shared 5-Button Bottom Navigation (My Requests Active: Black Icon/Text, No Capsule, No Dot) */}
      <StaffBottomNav
        activeTab="My Requests"
        onNavigateHome={onNavigateHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateMyRequests={() => {
          updateRouteState('LANDING', 'All', null);
        }}
        onNavigateProfile={onNavigateProfile}
      />

      {/* MODAL: Quick Request Form for creating requests from the Landing Page */}
      {quickModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleQuickSubmit}
            className="bg-white w-full max-w-sm rounded-3xl p-4.5 shadow-2xl border border-neutral-200 space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="font-bold text-[14px] text-neutral-900">{quickModalType}</span>
              <button
                type="button"
                onClick={() => setQuickModalType(null)}
                className="text-neutral-400 hover:text-black p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickModalType === 'Salary Slip' && (
              <div className="bg-[#f8f9fa] border border-neutral-200 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-neutral-900">Latest Salary Slip</div>
                  <div className="text-[11px] text-neutral-500">{previousMonthYearStr} • Verified</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSalarySlip}
                  className="px-3 py-1.5 bg-black text-white text-[11px] font-semibold rounded-lg flex items-center gap-1.5 hover:bg-neutral-800 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            )}

            <div className="space-y-2.5 text-[12px]">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  {quickModalType === 'Salary Slip'
                    ? 'Request Previous Month Slip'
                    : quickModalType === 'Document Request'
                    ? 'Document Type'
                    : 'Request Purpose'}
                </label>
                <input
                  type="text"
                  value={quickSubtype}
                  onChange={(e) => setQuickSubtype(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-black"
                  placeholder={
                    quickModalType === 'Salary Slip'
                      ? `e.g. ${shiftMonthYear(previousMonthYearStr, -1)}`
                      : quickModalType === 'Document Request'
                      ? 'e.g. Experience Certificate, Bonafide Letter'
                      : 'e.g. Request for ID card reissue'
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Notes / Remarks</label>
                <textarea
                  rows={3}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-black resize-none"
                  placeholder="Optional details for administration office"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuickModalType(null)}
                className="flex-1 py-2 text-[12px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-[12px] font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition cursor-pointer shadow-xs"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
