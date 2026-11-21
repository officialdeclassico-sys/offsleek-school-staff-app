/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  ArrowRight,
  Send,
  UploadCloud,
  Calendar,
  MessageSquare,
  Paperclip,
  CheckCheck,
  Star,
  Check,
  Plus,
  X,
  Eye,
  Download,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import {
  AUTHENTICATED_STAFF_CONTEXT,
  SupportAttachment,
  SupportDestination,
  SupportFilterTab,
  SupportTicket,
  SupportTicketStatus,
  addSupportTicketReply,
  canAccessTicketAttachment,
  createSupportTicket,
  filterSupportTickets,
  getCategoriesForDestination,
  getStaffSupportTickets,
  getSupportTicketById,
  submitSupportTicketFeedback,
  updateSupportTicketStatus,
  uploadSupportAttachment,
  validateSupportAttachmentBatch,
  StaffRequest,
} from './services/requestsService';
import {
  AUTHENTICATED_TEST_PARENT,
  AUTHENTICATED_TEST_STUDENT,
  IllustrativePortalMode,
  addIllustrativeTestTicketReply,
  areIllustrativeTestFixturesEnabled,
  getIllustrativeTestTicketById,
  getIllustrativeTestTickets,
  resetIllustrativeTestFixtures,
  setIllustrativeTestFixturesEnabled,
} from './services/illustrativeTestTickets';

interface MyRequestsScreenProps {
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateProfile: () => void;
  onOpenLeaveRequestForm?: () => void;
  onSubmitSuccess?: (record: StaffRequest) => void;
  initialView?: SupportViewMode;
  initialPortalMode?: IllustrativePortalMode;
}

export type SupportViewMode =
  | 'LANDING'
  | 'RAISE_REQUEST'
  | 'LIST'
  | 'DETAILS'
  | 'CONVERSATION'
  | 'FEEDBACK'
  | 'FEEDBACK_SUBMITTED';

const FILTER_TABS: readonly SupportFilterTab[] = [
  'All',
  'School',
  'OFFSLEEK',
  'Open',
  'Pending',
  'Closed',
] as const;

// Custom crisp SVG matching the Headset with Microphone icon in the approved design
function HeadsetSupportIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="12" width="3.5" height="6" rx="1.75" />
      <rect x="17.5" y="12" width="3.5" height="6" rx="1.75" />
      <path d="M19.5 18v1a2.5 2.5 0 0 1-2.5 2.5h-4" />
      <circle cx="12" cy="21.5" r="1" fill="currentColor" />
    </svg>
  );
}

// Custom crisp SVG matching the School Support building icon in the approved design
function SchoolSupportIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3v3" />
      <path d="M12 3h2.5v2H12" />
      <path d="M4 10l8-4 8 4" />
      <path d="M5 10v9h14v-9" />
      <path d="M3 19h18" />
      <path d="M9.5 19v-5h5v5" />
      <path d="M8 10v4" />
      <path d="M16 10v4" />
    </svg>
  );
}

// Custom crisp SVG matching the OFFSLEEK Support stacked layers icon in the approved design
function OffsleekSupportIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 3.5 3.5 8.5 12 13.5 20.5 8.5 12 3.5" />
      <polyline points="3.5 12.5 12 17.5 20.5 12.5" />
      <polyline points="3.5 16.5 12 21.5 20.5 16.5" />
    </svg>
  );
}

// Empty State Document Checklist Illustration matching Panel 10
function EmptyRequestsIllustration() {
  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center select-none">
      <div className="w-26 h-26 rounded-full bg-[#f2f4f8] flex items-center justify-center">
        <div className="w-16 h-20 bg-white rounded-xl border-[2px] border-[#1e293b] shadow-xs flex flex-col justify-center px-3 space-y-2.5 relative">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e293b]" />
            <span className="h-[2px] flex-1 bg-[#1e293b] rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e293b]" />
            <span className="h-[2px] flex-1 bg-[#1e293b] rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e293b]" />
            <span className="h-[2px] w-6 bg-[#1e293b] rounded-full" />
          </div>
        </div>
      </div>
      {/* Subtle accent rays matching reference illustration */}
      <span className="absolute top-3 right-6 w-2.5 h-[2.5px] bg-[#f59e0b] rounded-full -rotate-45" />
      <span className="absolute top-6 right-3 w-2.5 h-[2.5px] bg-[#f59e0b] rounded-full -rotate-12" />
      <span className="absolute bottom-5 left-4 w-2.5 h-[2.5px] bg-[#f59e0b] rounded-full -rotate-30" />
      <span className="absolute bottom-2.5 left-7 w-2.5 h-[2.5px] bg-[#f59e0b] rounded-full -rotate-60" />
    </div>
  );
}

export default function MyRequestsScreen({
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateProfile,
  initialView = 'LANDING',
  initialPortalMode = 'STUDENT',
}: MyRequestsScreenProps) {
  const [viewMode, setViewMode] = useState<SupportViewMode>(initialView);
  const [previousViewMode, setPreviousViewMode] = useState<SupportViewMode>('LANDING');

  // Student / Parent Mode & Illustrative Test Fixtures State
  const [portalMode, setPortalMode] = useState<IllustrativePortalMode>(initialPortalMode);
  const [testFixturesEnabled, setTestFixturesEnabled] = useState<boolean>(() =>
    areIllustrativeTestFixturesEnabled()
  );

  // Load combined tickets (10 isolated illustrative test tickets when enabled + any staff-raised tickets)
  const loadCombinedTickets = React.useCallback(
    (mode: IllustrativePortalMode, fixturesOn: boolean): SupportTicket[] => {
      const userTickets = getStaffSupportTickets(AUTHENTICATED_STAFF_CONTEXT);
      if (!fixturesOn) {
        return userTickets;
      }
      const testTickets = getIllustrativeTestTickets(
        mode,
        AUTHENTICATED_TEST_STUDENT,
        AUTHENTICATED_TEST_PARENT
      );
      return [...userTickets, ...testTickets];
    },
    []
  );

  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    loadCombinedTickets(initialPortalMode, areIllustrativeTestFixturesEnabled())
  );
  const [activeFilter, setActiveFilter] = useState<SupportFilterTab>('All');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Raise Request Form State (Fixed Destination — no toggle)
  const [formDestination, setFormDestination] = useState<SupportDestination>('SCHOOL');
  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Conversation Reply State
  const [replyText, setReplyText] = useState<string>('');
  const [replyAttachments, setReplyAttachments] = useState<SupportAttachment[]>([]);
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Feedback Form State
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  // Attachment Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState<SupportAttachment | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formFileInputRef = useRef<HTMLInputElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const refreshTickets = React.useCallback(
    (nextMode: IllustrativePortalMode = portalMode, nextFixturesOn: boolean = testFixturesEnabled) => {
      const latest = loadCombinedTickets(nextMode, nextFixturesOn);
      setTickets(latest);
    },
    [loadCombinedTickets, portalMode, testFixturesEnabled]
  );

  const handleSwitchPortalMode = (nextMode: IllustrativePortalMode) => {
    setPortalMode(nextMode);
    refreshTickets(nextMode, testFixturesEnabled);
  };

  const handleToggleTestFixtures = () => {
    if (testFixturesEnabled) {
      setIllustrativeTestFixturesEnabled(false);
      setTestFixturesEnabled(false);
      refreshTickets(portalMode, false);
      showToast('Illustrative test tickets removed.');
    } else {
      resetIllustrativeTestFixtures();
      setTestFixturesEnabled(true);
      refreshTickets(portalMode, true);
      showToast('10 illustrative test tickets restored.');
    }
  };

  const selectedTicket: SupportTicket | null = React.useMemo(() => {
    if (!selectedTicketId) return null;
    const fromState = tickets.find(
      (t) => t.id === selectedTicketId || t.displayId === selectedTicketId
    );
    if (fromState) return fromState;
    try {
      if (selectedTicketId.startsWith('TEST-') || selectedTicketId.startsWith('#TEST-')) {
        return getIllustrativeTestTicketById(
          selectedTicketId,
          portalMode,
          AUTHENTICATED_TEST_STUDENT,
          AUTHENTICATED_TEST_PARENT
        );
      }
      return getSupportTicketById(selectedTicketId, AUTHENTICATED_STAFF_CONTEXT);
    } catch {
      return null;
    }
  }, [selectedTicketId, tickets, portalMode]);

  const filteredTickets = React.useMemo(
    () => filterSupportTickets(tickets, activeFilter),
    [tickets, activeFilter]
  );

  // Open Raise a Request with fixed support destination
  const handleOpenRaiseRequest = (destination: SupportDestination, fromView: SupportViewMode) => {
    setFormDestination(destination);
    setCategory('');
    setCustomCategory('');
    setSubject('');
    setDescription('');
    setAttachments([]);
    setFormErrors({});
    setIsSubmitting(false);
    setPreviousViewMode(fromView);
    setViewMode('RAISE_REQUEST');
  };

  // Handle File Selection in Raise a Request
  const handleFormFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray: File[] = Array.from(fileList);
    e.target.value = '';

    const batchValidation = validateSupportAttachmentBatch(
      attachments.length,
      filesArray.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );

    if (!batchValidation.valid) {
      setFormErrors((prev) => ({
        ...prev,
        attachments: batchValidation.error || 'Invalid attachment.',
      }));
      showToast(batchValidation.error || 'Invalid file attachment.');
      return;
    }

    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.attachments;
      return next;
    });

    try {
      const uploadedList: SupportAttachment[] = [];
      for (const file of filesArray) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
          reader.readAsDataURL(file);
        });

        const uploaded = await uploadSupportAttachment(
          'DRAFT',
          {
            fileName: file.name,
            mimeType: file.type,
            fileSizeBytes: file.size,
            dataUrl,
          },
          AUTHENTICATED_STAFF_CONTEXT
        );
        uploadedList.push(uploaded);
      }
      setAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err: any) {
      showToast(err?.message || 'Could not attach selected file.');
    }
  };

  // Handle Submit Support Request
  const handleSubmitSupportRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors: Record<string, string> = {};
    if (!category.trim()) {
      errors.category = 'Please select a request category.';
    }
    if (!subject.trim()) {
      errors.subject = 'Please enter a brief subject.';
    } else if (subject.trim().length < 3) {
      errors.subject = 'Subject must be at least 3 characters.';
    }
    if (!description.trim()) {
      errors.description = 'Please describe your issue or request in detail.';
    } else if (description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = createSupportTicket(
        {
          destination: formDestination,
          category,
          customCategory: customCategory.trim() || undefined,
          subject: subject.trim(),
          description: description.trim(),
          attachments,
        },
        AUTHENTICATED_STAFF_CONTEXT
      );
      refreshTickets();
      setSelectedTicketId(created.id);
      setActiveFilter('All');
      setViewMode('DETAILS');
      showToast(`Request ${created.displayId} submitted successfully.`);
    } catch (err: any) {
      showToast(err?.message || 'Unable to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reply Attachment Select in Conversation
  const handleReplyFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray: File[] = Array.from(fileList);
    e.target.value = '';

    const batchValidation = validateSupportAttachmentBatch(
      replyAttachments.length,
      filesArray.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );

    if (!batchValidation.valid) {
      showToast(batchValidation.error || 'Invalid attachment.');
      return;
    }

    try {
      const uploadedList: SupportAttachment[] = [];
      for (const file of filesArray) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`));
          reader.readAsDataURL(file);
        });

        const uploaded = await uploadSupportAttachment(
          selectedTicket?.id || 'REPLY',
          {
            fileName: file.name,
            mimeType: file.type,
            fileSizeBytes: file.size,
            dataUrl,
          },
          AUTHENTICATED_STAFF_CONTEXT
        );
        uploadedList.push(uploaded);
      }
      setReplyAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err: any) {
      showToast(err?.message || 'Failed to attach file.');
    }
  };

  // Handle Send Reply in Conversation (supports both illustrative test tickets and real staff tickets)
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || isSendingReply) return;
    if (!replyText.trim() && replyAttachments.length === 0) {
      showToast('Please enter a message or attach a file.');
      return;
    }

    setIsSendingReply(true);
    try {
      if (selectedTicket.isTestData) {
        addIllustrativeTestTicketReply(
          portalMode,
          {
            ticketId: selectedTicket.id,
            message: replyText.trim(),
            attachments: replyAttachments,
          },
          AUTHENTICATED_TEST_STUDENT,
          AUTHENTICATED_TEST_PARENT
        );
      } else {
        addSupportTicketReply(
          {
            ticketId: selectedTicket.id,
            message: replyText.trim(),
            attachments: replyAttachments,
            senderType: 'STAFF',
          },
          AUTHENTICATED_STAFF_CONTEXT
        );
      }
      setReplyText('');
      setReplyAttachments([]);
      refreshTickets();
      showToast('Reply sent.');
    } catch (err: any) {
      showToast(err?.message || 'Could not send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle Status Progression on Ticket (for non-test staff tickets)
  const handleUpdateTicketStatus = (newStatus: SupportTicketStatus, customNote?: string) => {
    if (!selectedTicket || selectedTicket.isTestData) return;
    try {
      updateSupportTicketStatus(
        selectedTicket.id,
        newStatus,
        customNote,
        AUTHENTICATED_STAFF_CONTEXT
      );
      refreshTickets();
      showToast(`Request status updated to ${newStatus}.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status.');
    }
  };

  // Handle Submit Feedback
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || isSubmittingFeedback) return;

    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError('Please select a star rating between 1 and 5.');
      return;
    }
    if (feedbackComment.trim().length > 300) {
      setFeedbackError('Feedback cannot exceed 300 characters.');
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      if (selectedTicket.isTestData) {
        setViewMode('FEEDBACK_SUBMITTED');
      } else {
        submitSupportTicketFeedback(
          {
            ticketId: selectedTicket.id,
            rating: feedbackRating,
            comment: feedbackComment.trim(),
          },
          AUTHENTICATED_STAFF_CONTEXT
        );
        refreshTickets();
        setViewMode('FEEDBACK_SUBMITTED');
      }
    } catch (err: any) {
      setFeedbackError(err?.message || 'Unable to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Handle Authorized Attachment Preview & Download
  const handlePreviewAttachment = (ticket: SupportTicket, att: SupportAttachment) => {
    if (!canAccessTicketAttachment(ticket, att, AUTHENTICATED_STAFF_CONTEXT)) {
      showToast('Unauthorized access to this attachment.');
      return;
    }
    setPreviewAttachment(att);
  };

  const handleDownloadAttachment = (ticket: SupportTicket, att: SupportAttachment) => {
    if (!canAccessTicketAttachment(ticket, att, AUTHENTICATED_STAFF_CONTEXT)) {
      showToast('Unauthorized access to this attachment.');
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = att.dataUrl;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloaded ${att.fileName}`);
    } catch {
      showToast('Unable to download attachment.');
    }
  };

  // Semantic Status Pill Renderer matching Modern_Request_Tracking_Mobile_UI_fcae2233.png
  const renderStatusBadge = (status: SupportTicketStatus) => {
    if (status === 'Open') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f0ff] text-[#1d4ed8] shrink-0">
          Open
        </span>
      );
    }
    if (status === 'Pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef3c7] text-[#b45309] shrink-0">
          Pending
        </span>
      );
    }
    if (status === 'In Progress') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fff3db] text-[#b45309] shrink-0">
          In Progress
        </span>
      );
    }
    if (status === 'Resolved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d] shrink-0">
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d] shrink-0">
        Closed
      </span>
    );
  };

  // Group conversation messages by dateLabel for Date Separator Pills
  const groupedConversationMessages = React.useMemo(() => {
    if (!selectedTicket) return [];
    const groups: Array<{ dateLabel: string; items: SupportTicket['messages'] }> = [];
    for (const msg of selectedTicket.messages) {
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.dateLabel !== msg.dateLabel) {
        groups.push({ dateLabel: msg.dateLabel, items: [msg] });
      } else {
        lastGroup.items.push(msg);
      }
    }
    return groups;
  }, [selectedTicket]);

  const showBottomNav = viewMode === 'LANDING' || viewMode === 'LIST';

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-4 right-4 z-50 bg-neutral-950 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl flex items-center justify-between animate-in fade-in duration-150">
          <span className="font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Status Bar */}
      <StaffStatusBar />

      {/* =================================================================== */}
      {/* SCREEN 1: MY REQUESTS — MAIN LANDING PAGE                           */}
      {/* =================================================================== */}
      {viewMode === 'LANDING' && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 pt-1 pb-4 space-y-3.5 animate-in fade-in duration-150">
          {/* 1. Header with Left-Facing Chevron */}
          <div className="flex items-center gap-2.5 min-w-0 pt-0.5">
            <button
              type="button"
              onClick={onNavigateHome}
              className="p-1 -ml-1 text-neutral-900 hover:text-black active:scale-95 transition cursor-pointer shrink-0 rounded-lg hover:bg-neutral-100"
              aria-label="Back to Home"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">
                My Requests
              </h1>
              <p className="text-[12px] text-[#6b7280] font-normal mt-0.5 leading-snug">
                Raise a request, track status and get support
              </p>
            </div>
          </div>

          {/* 2. Introduction Card: How can we help you? */}
          <div className="bg-[#f4f5f7] border border-[#e5e7eb] rounded-[20px] p-4 flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-full bg-[#e9ebef] flex items-center justify-center shrink-0 text-neutral-900">
              <HeadsetSupportIcon className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15.5px] font-bold text-neutral-900 leading-snug">
                How can we help you?
              </h2>
              <p className="text-[11.5px] text-[#6b7280] mt-1 leading-relaxed">
                Choose a support option below to raise a request or get in touch.
              </p>
            </div>
          </div>

          {/* 3. School Support Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleOpenRaiseRequest('SCHOOL', 'LANDING')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleOpenRaiseRequest('SCHOOL', 'LANDING');
            }}
            className="bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-[20px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3.5 cursor-pointer transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-[#f4f5f7] flex items-center justify-center shrink-0 text-neutral-900">
                <SchoolSupportIcon className="w-6.5 h-6.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14.5px] font-bold text-neutral-900 leading-snug">
                  School Support
                </h3>
                <p className="text-[11.5px] text-[#6b7280] mt-1 leading-relaxed">
                  For workplace, attendance, payroll, documents and other school-related queries.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-neutral-800 stroke-[2] shrink-0" />
          </div>

          {/* 4. OFFSLEEK Support Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleOpenRaiseRequest('OFFSLEEK', 'LANDING')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleOpenRaiseRequest('OFFSLEEK', 'LANDING');
            }}
            className="bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-[20px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3.5 cursor-pointer transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-[#f4f5f7] flex items-center justify-center shrink-0 text-neutral-900">
                <OffsleekSupportIcon className="w-6.5 h-6.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14.5px] font-bold text-neutral-900 leading-snug">
                  OFFSLEEK Support
                </h3>
                <p className="text-[11.5px] text-[#6b7280] mt-1 leading-relaxed">
                  For app issues, login problems, technical support or feature-related queries.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-neutral-800 stroke-[2] shrink-0" />
          </div>

          {/* 5. View All Requests Card */}
          <div className="bg-[#f4f5f7] border border-[#e5e7eb] rounded-[20px] p-4 flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e9ebef] flex items-center justify-center shrink-0 text-neutral-900">
              <FileText className="w-5.5 h-5.5 stroke-[1.9]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14.5px] font-bold text-neutral-900 leading-snug">
                View All Requests
              </h3>
              <p className="text-[11.5px] text-[#6b7280] mt-0.5 leading-relaxed">
                Track the status and updates of your submitted requests.
              </p>
              <button
                type="button"
                onClick={() => {
                  refreshTickets();
                  setActiveFilter('All');
                  setViewMode('LIST');
                }}
                className="mt-3 bg-black hover:bg-neutral-800 active:scale-[0.98] text-white text-[12px] font-semibold px-5 py-2.5 rounded-full inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <span>Go to My Requests</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SCREEN 2 & 3: RAISE A REQUEST (SCHOOL SUPPORT / OFFSLEEK SUPPORT)   */}
      {/* =================================================================== */}
      {viewMode === 'RAISE_REQUEST' && (
        <form
          onSubmit={handleSubmitSupportRequest}
          noValidate
          className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-150"
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 pt-1 pb-4 space-y-3.5">
            {/* Header */}
            <div className="flex items-start gap-2 min-w-0 pt-0.5">
              <button
                type="button"
                onClick={() => setViewMode(previousViewMode || 'LANDING')}
                className="p-1 -ml-1 text-neutral-900 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-lg hover:bg-neutral-100"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] sm:text-[21px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Raise a Request
                </h1>
                <p className="text-[12px] text-[#6b7280] font-normal mt-0.5">
                  {formDestination === 'SCHOOL'
                    ? 'Create a school support request'
                    : 'Create an OFFSLEEK support request'}
                </p>
              </div>
            </div>

            {/* Fixed Destination Identity Card (No Support-Type Toggle) */}
            <div className="bg-[#f5f6f8] border border-[#eaecf0] rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 text-neutral-900 shadow-2xs">
                {formDestination === 'SCHOOL' ? (
                  <SchoolSupportIcon className="w-5 h-5" />
                ) : (
                  <OffsleekSupportIcon className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-neutral-900 leading-snug">
                  {formDestination === 'SCHOOL' ? 'School Support' : 'OFFSLEEK Support'}
                </div>
                <div className="text-[11.5px] text-[#6b7280] mt-0.5 leading-snug">
                  {formDestination === 'SCHOOL'
                    ? 'Your request will be sent to the school administration.'
                    : 'Your request will be sent to the OFFSLEEK support team.'}
                </div>
              </div>
            </div>

            {/* Request Category * */}
            <div>
              <label className="block text-[12px] font-bold text-neutral-900 mb-1.5">
                Request Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (formErrors.category) {
                      setFormErrors((prev) => ({ ...prev, category: '' }));
                    }
                  }}
                  aria-label="Request Category"
                  className={`w-full appearance-none bg-white border ${
                    formErrors.category ? 'border-red-500' : 'border-[#e5e7eb] focus:border-neutral-900'
                  } rounded-xl px-3.5 py-2.5 pr-9 text-[12.5px] font-medium ${
                    category ? 'text-neutral-900' : 'text-[#9ca3af]'
                  } focus:outline-none transition cursor-pointer`}
                >
                  <option value="">Select a category</option>
                  {getCategoriesForDestination(formDestination).map((cat) => (
                    <option key={cat} value={cat} className="text-neutral-900">
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-500 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              {formErrors.category && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.category}</p>
              )}
            </div>

            {/* Custom Category (Optional) */}
            <div>
              <label className="block text-[12px] font-bold text-neutral-900 mb-1.5">
                Custom Category <span className="text-[#6b7280] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                maxLength={80}
                placeholder="Or type your own category"
                className="w-full bg-white border border-[#e5e7eb] focus:border-neutral-900 rounded-xl px-3.5 py-2.5 text-[12.5px] text-neutral-900 placeholder:text-[#9ca3af] focus:outline-none transition"
              />
            </div>

            {/* Subject * */}
            <div>
              <label className="block text-[12px] font-bold text-neutral-900 mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (formErrors.subject) {
                    setFormErrors((prev) => ({ ...prev, subject: '' }));
                  }
                }}
                maxLength={120}
                placeholder="Enter a brief subject"
                className={`w-full bg-white border ${
                  formErrors.subject ? 'border-red-500' : 'border-[#e5e7eb] focus:border-neutral-900'
                } rounded-xl px-3.5 py-2.5 text-[12.5px] text-neutral-900 placeholder:text-[#9ca3af] focus:outline-none transition`}
              />
              {formErrors.subject && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.subject}</p>
              )}
            </div>

            {/* Description * */}
            <div>
              <label className="block text-[12px] font-bold text-neutral-900 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => {
                  const nextVal = e.target.value.slice(0, 500);
                  setDescription(nextVal);
                  if (formErrors.description) {
                    setFormErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
                maxLength={500}
                placeholder="Describe your issue or request in detail..."
                className={`w-full bg-white border ${
                  formErrors.description
                    ? 'border-red-500'
                    : 'border-[#e5e7eb] focus:border-neutral-900'
                } rounded-xl px-3.5 py-2.5 text-[12.5px] text-neutral-900 placeholder:text-[#9ca3af] focus:outline-none resize-none leading-relaxed transition`}
              />
              <div className="flex items-center justify-between mt-1">
                {formErrors.description ? (
                  <p className="text-[11px] text-red-600 font-medium">{formErrors.description}</p>
                ) : (
                  <span />
                )}
                <span className="text-[11px] text-[#6b7280] font-medium">
                  {description.length} / 500
                </span>
              </div>
            </div>

            {/* Attachments (Optional) */}
            <div>
              <label className="block text-[12px] font-bold text-neutral-900">
                Attachments <span className="text-[#6b7280] font-normal">(Optional)</span>
              </label>
              <p className="text-[10.5px] text-[#6b7280] mt-0.5 mb-2">
                Add images or documents (PDF, JPG, PNG — up to 5 files, 10 MB each).
              </p>

              <input
                ref={formFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                multiple
                onChange={handleFormFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => formFileInputRef.current?.click()}
                className="w-full bg-[#f8f9fa] hover:bg-[#f1f3f5] border border-dashed border-[#d1d5db] rounded-2xl py-4 px-3 flex flex-col items-center justify-center text-center cursor-pointer transition"
              >
                <UploadCloud className="w-6 h-6 text-neutral-700 stroke-[1.8] mb-1" />
                <span className="text-[12.5px] font-bold text-neutral-900">
                  Tap to upload files
                </span>
                <span className="text-[11px] text-[#6b7280] mt-0.5">
                  or choose from gallery
                </span>
              </button>

              {formErrors.attachments && (
                <p className="text-[11px] text-red-600 mt-1.5 font-medium">
                  {formErrors.attachments}
                </p>
              )}

              {/* Attached Files Preview List */}
              {attachments.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#f5f6f8] border border-[#e5e7eb] flex items-center justify-center shrink-0 text-[10px] font-bold text-neutral-800">
                          {att.fileType}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-neutral-900 truncate">
                            {att.fileName}
                          </div>
                          <div className="text-[10.5px] text-[#6b7280]">
                            {att.fileSizeFormatted}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                        }
                        className="p-1 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 cursor-pointer shrink-0"
                        aria-label={`Remove ${att.fileName}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Submit Button */}
          <div className="px-4 py-3 bg-white border-t border-[#f0f2f5]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold text-[13.5px] py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4 stroke-[2]" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* SCREEN 4 & 10: MY REQUESTS — COMPLETE LIST & EMPTY STATE            */}
      {/* =================================================================== */}
      {viewMode === 'LIST' && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 pt-1 pb-4 space-y-3 flex flex-col animate-in fade-in duration-150">
          {/* Header matching Modern_Request_Tracking_Mobile_UI_fcae2233.png */}
          <div className="flex items-start justify-between gap-2 min-w-0 pt-0.5">
            <div className="flex items-start gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode('LANDING')}
                className="p-1 -ml-1 text-neutral-900 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-lg hover:bg-neutral-100"
                aria-label="Back to Support Options"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] sm:text-[21px] font-bold text-neutral-900 tracking-tight leading-tight">
                  My Requests
                </h1>
                <p className="text-[12px] text-[#6b7280] font-normal mt-0.5">
                  Track the status of your submitted requests
                </p>
              </div>
            </div>
          </div>

          {/* Student / Parent Test-Mode Verification Bar (Clearly marks TEST DATA & allows instant cleanup) */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] tracking-wide">
                TEST DATA
              </span>
              <div className="inline-flex rounded-lg bg-white border border-[#e2e8f0] p-0.5">
                <button
                  type="button"
                  onClick={() => handleSwitchPortalMode('STUDENT')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] cursor-pointer transition ${
                    portalMode === 'STUDENT'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Student Mode
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPortalMode('PARENT')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] cursor-pointer transition ${
                    portalMode === 'PARENT'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Parent Mode
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleTestFixtures}
              className="text-[10.5px] font-semibold text-neutral-700 hover:text-black underline cursor-pointer"
            >
              {testFixturesEnabled ? 'Remove Test Fixtures' : 'Load 10 Test Tickets'}
            </button>
          </div>

          {/* 6 Horizontal Filter Chips: All, School, OFFSLEEK, Open, Pending, Closed */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-[11.5px] border transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-black text-white border-black font-semibold'
                      : 'bg-white text-neutral-700 border-[#e5e7eb] hover:border-neutral-300 font-medium'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Empty State when ZERO requests are present */}
          {tickets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
              <EmptyRequestsIllustration />
              <h2 className="text-[18px] font-bold text-neutral-900 mt-4">
                No Requests Raised
              </h2>
              <p className="text-[12.5px] text-[#6b7280] mt-1.5 max-w-[250px] leading-relaxed">
                You haven&apos;t raised any requests yet. Need help? You can create a new request now.
              </p>
              <div className="flex flex-col items-center gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setViewMode('LANDING')}
                  className="bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold text-[13px] px-6 py-3 rounded-2xl inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Raise a Request</span>
                </button>
                {!testFixturesEnabled && (
                  <button
                    type="button"
                    onClick={handleToggleTestFixtures}
                    className="text-[11.5px] font-semibold text-[#2563eb] hover:underline cursor-pointer mt-1"
                  >
                    Restore 10 Illustrative Test Tickets
                  </button>
                )}
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            /* Empty state for a specific filter when other tickets exist */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4">
              <EmptyRequestsIllustration />
              <h2 className="text-[16.5px] font-bold text-neutral-900 mt-3">
                No {activeFilter} Requests
              </h2>
              <p className="text-[12px] text-[#6b7280] mt-1 max-w-[240px] leading-relaxed">
                There are no requests matching the &ldquo;{activeFilter}&rdquo; filter.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveFilter('All')}
                  className="bg-[#f5f6f8] hover:bg-neutral-200 text-neutral-900 font-semibold text-[12px] px-4 py-2.5 rounded-xl border border-[#e5e7eb] cursor-pointer transition"
                >
                  Show All
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('LANDING')}
                  className="bg-black hover:bg-neutral-800 text-white font-semibold text-[12px] px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Raise a Request</span>
                </button>
              </div>
            </div>
          ) : (
            /* Request Cards List matching Modern_Request_Tracking_Mobile_UI_fcae2233.png */
            <div className="space-y-2.5 pb-2">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setViewMode('DETAILS');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedTicketId(ticket.id);
                      setViewMode('DETAILS');
                    }
                  }}
                  className="bg-white border border-[#eef0f3] hover:border-neutral-300 rounded-2xl px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-2.5 cursor-pointer transition active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Destination Icon Box: Soft Blue for School Support, Soft Indigo for OFFSLEEK Support */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        ticket.destination === 'SCHOOL'
                          ? 'bg-[#eef5ff] text-[#2563eb]'
                          : 'bg-[#eef0ff] text-[#4f46e5]'
                      }`}
                    >
                      {ticket.destination === 'SCHOOL' ? (
                        <SchoolSupportIcon className="w-5 h-5" />
                      ) : (
                        <OffsleekSupportIcon className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[13.5px] font-bold text-neutral-900 truncate leading-snug">
                          {ticket.subject}
                        </h3>
                        {renderStatusBadge(ticket.status)}
                      </div>

                      <div className="text-[11.5px] text-[#4b5563] mt-0.5 truncate flex items-center gap-1.5">
                        <span>
                          {ticket.destinationLabel} &nbsp;•&nbsp; {ticket.displayId}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280] mt-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500 stroke-[1.8] shrink-0" />
                        <span>{ticket.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SCREEN 5 & 7: REQUEST DETAILS SCREEN                                */}
      {/* =================================================================== */}
      {viewMode === 'DETAILS' && selectedTicket && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 pt-1 pb-4 space-y-3">
            {/* Header matching Modern_Request_Tracking_Mobile_UI_fcae2233.png */}
            <div className="flex items-start gap-2 min-w-0 pt-0.5">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className="p-1 -ml-1 text-neutral-900 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-lg hover:bg-neutral-100"
                aria-label="Back to My Requests"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] sm:text-[21px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Request Details
                </h1>
                <p className="text-[12px] text-[#6b7280] font-normal mt-0.5">
                  View the complete details and status of your request
                </p>
              </div>
            </div>

            {/* Card 1: Ticket Header Summary Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedTicket.destination === 'SCHOOL'
                        ? 'bg-[#eef5ff] text-[#2563eb]'
                        : 'bg-[#eef0ff] text-[#4f46e5]'
                    }`}
                  >
                    {selectedTicket.destination === 'SCHOOL' ? (
                      <SchoolSupportIcon className="w-5.5 h-5.5" />
                    ) : (
                      <OffsleekSupportIcon className="w-5.5 h-5.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[14.5px] font-bold text-neutral-900 truncate leading-snug">
                      {selectedTicket.subject}
                    </h2>
                    <div className="text-[12px] text-[#4b5563] mt-0.5 flex items-center gap-1.5">
                      <span>{selectedTicket.displayId}</span>
                      {selectedTicket.isTestData && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9.5px] font-bold">
                          TEST DATA
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {renderStatusBadge(selectedTicket.status)}
              </div>

              <div className="pt-2.5 border-t border-[#f0f2f5] flex items-center justify-between gap-2 text-[11.5px] text-neutral-800">
                <div className="flex items-center gap-1.5 font-medium">
                  {selectedTicket.destination === 'SCHOOL' ? (
                    <SchoolSupportIcon className="w-3.5 h-3.5 text-neutral-700" />
                  ) : (
                    <OffsleekSupportIcon className="w-3.5 h-3.5 text-neutral-700" />
                  )}
                  <span>{selectedTicket.destinationLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <Calendar className="w-3.5 h-3.5 text-neutral-600 stroke-[1.8]" />
                  <span>{selectedTicket.createdAt}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Bordered Category / Subject / Description Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl px-4 py-1 divide-y divide-[#f0f2f5] text-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="py-2.5 flex items-start gap-3">
                <span className="w-24 shrink-0 font-bold text-neutral-900">Category</span>
                <span className="text-neutral-800 flex-1">{selectedTicket.category}</span>
              </div>
              {selectedTicket.customCategory && (
                <div className="py-2.5 flex items-start gap-3">
                  <span className="w-24 shrink-0 font-bold text-neutral-900">Custom</span>
                  <span className="text-neutral-800 flex-1">{selectedTicket.customCategory}</span>
                </div>
              )}
              <div className="py-2.5 flex items-start gap-3">
                <span className="w-24 shrink-0 font-bold text-neutral-900">Subject</span>
                <span className="text-neutral-800 flex-1">{selectedTicket.subject}</span>
              </div>
              <div className="py-2.5 flex items-start gap-3">
                <span className="w-24 shrink-0 font-bold text-neutral-900">Description</span>
                <span className="text-neutral-800 flex-1 leading-relaxed">
                  {selectedTicket.description}
                </span>
              </div>
            </div>

            {/* Card 3: Bordered Attachments Card */}
            {selectedTicket.attachments.length > 0 && (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <h3 className="text-[13px] font-bold text-neutral-900">
                  Attachments
                </h3>
                <div className="space-y-2">
                  {selectedTicket.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => handlePreviewAttachment(selectedTicket, att)}
                      className="bg-[#f3f4f6] hover:bg-[#eaecf0] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 text-neutral-800">
                          {att.fileType === 'PDF' ? (
                            <FileText className="w-4 h-4 stroke-[1.9]" />
                          ) : (
                            <ImageIcon className="w-4 h-4 stroke-[1.9]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-neutral-900 truncate">
                            {att.fileName}
                          </div>
                          <div className="text-[11px] text-[#6b7280]">
                            {att.fileSizeFormatted}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAttachment(selectedTicket, att);
                        }}
                        className="p-1.5 text-neutral-800 hover:text-black rounded-lg cursor-pointer shrink-0"
                        title="Download attachment"
                        aria-label={`Download ${att.fileName}`}
                      >
                        <Download className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card 4: Request History — Compact Vertical Timeline Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <h3 className="text-[13.5px] font-bold text-neutral-900 mb-3.5">
                Request History
              </h3>
              <div className="relative pl-1 space-y-4">
                {selectedTicket.history.map((entry, idx) => {
                  const isLast = idx === selectedTicket.history.length - 1;
                  const isSubmitted = entry.status === 'Submitted';
                  const isUnderReview = entry.status === 'Under Review';
                  const isInProgress = entry.status === 'In Progress';
                  const isResolvedOrClosed =
                    entry.status === 'Resolved' || entry.status === 'Closed';

                  return (
                    <div key={entry.id} className="relative flex items-start gap-3">
                      {/* Vertical connecting line */}
                      {!isLast && (
                        <div className="absolute left-[6.5px] top-4 bottom-[-18px] w-[1.5px] bg-[#d1d5db]" />
                      )}

                      {/* Status Node Marker matching Modern_Request_Tracking_Mobile_UI_fcae2233.png */}
                      <div className="relative z-10 mt-1 shrink-0">
                        {isSubmitted ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-black border-2 border-black" />
                        ) : isUnderReview ? (
                          <div className="w-3.5 h-3.5 rounded-full border-[2.2px] border-[#f59e0b] bg-white" />
                        ) : isInProgress ? (
                          <div className="w-3.5 h-3.5 rounded-full border-[2.2px] border-[#2563eb] bg-white" />
                        ) : isResolvedOrClosed ? (
                          <div className="w-3.5 h-3.5 rounded-full border-[2.2px] border-[#16a34a] bg-white flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#6b7280] bg-white" />
                        )}
                      </div>

                      {/* Timeline Content */}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold text-neutral-900 leading-tight">
                          {entry.title}
                        </div>
                        <div className="text-[11px] text-[#4b5563] mt-0.5">
                          {entry.timestamp}
                        </div>
                        <div className="text-[11.5px] text-neutral-800 mt-0.5 leading-relaxed">
                          {entry.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support Lifecycle Progression Controls (For non-test staff tickets) */}
            {!selectedTicket.isTestData &&
              selectedTicket.status !== 'Closed' &&
              selectedTicket.status !== 'Resolved' && (
                <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-[#6b7280] flex items-center justify-between">
                    <span>Routed to: {selectedTicket.routedDepartment}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedTicket.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTicketStatus(
                            'Pending',
                            selectedTicket.destination === 'SCHOOL'
                              ? 'Your request is being reviewed by the school administration.'
                              : 'Your request is being reviewed by the OFFSLEEK support team.'
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-[#e5e7eb] hover:border-neutral-400 text-neutral-800 cursor-pointer transition"
                      >
                        + Under Review
                      </button>
                    )}
                    {selectedTicket.status !== 'Open' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTicketStatus(
                            'Open',
                            selectedTicket.destination === 'SCHOOL'
                              ? 'Thank you for your request. We are checking the details and will share an update shortly.'
                              : 'Our team is checking the issue.'
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-[#e5e7eb] hover:border-neutral-400 text-neutral-800 cursor-pointer transition"
                      >
                        Mark In Progress
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateTicketStatus(
                          'Closed',
                          selectedTicket.destination === 'SCHOOL'
                            ? 'Your request has been resolved by the school administration.'
                            : 'The issue has been fixed. Please try again with the latest update.'
                        )
                      }
                      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white cursor-pointer transition"
                    >
                      Resolve & Close Request
                    </button>
                  </div>
                </div>
              )}

            {/* Post-Resolution Feedback Card (For Resolved/Closed Tickets) */}
            {(selectedTicket.status === 'Closed' || selectedTicket.status === 'Resolved') && (
              <div className="pt-0.5">
                {!selectedTicket.feedback ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setFeedbackRating(0);
                      setFeedbackComment('');
                      setFeedbackError(null);
                      setViewMode('FEEDBACK');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setFeedbackRating(0);
                        setFeedbackComment('');
                        setFeedbackError(null);
                        setViewMode('FEEDBACK');
                      }
                    }}
                    className="bg-[#ecfdf5] border border-[#bbf7d0] hover:border-[#86efac] rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Star className="w-5.5 h-5.5 text-[#16a34a] stroke-[2] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-neutral-900">
                          Share Your Feedback
                        </div>
                        <div className="text-[11px] text-neutral-600 mt-0.5">
                          Help us improve by rating your support experience.
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
                  </div>
                ) : (
                  <div className="bg-[#ecfdf5] border border-[#bbf7d0] rounded-2xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-[#15803d] flex items-center gap-1.5">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Feedback Submitted</span>
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= selectedTicket.feedback!.rating
                                ? 'text-[#f59e0b] fill-[#f59e0b]'
                                : 'text-neutral-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {selectedTicket.feedback.comment && (
                      <p className="text-[11.5px] text-neutral-700">
                        &ldquo;{selectedTicket.feedback.comment}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Bottom Button: Exact label "Reply" matching Modern_Request_Tracking_Mobile_UI_fcae2233.png */}
          <div className="px-4 py-3 bg-white border-t border-[#f0f2f5]">
            <button
              type="button"
              onClick={() => {
                setReplyText('');
                setReplyAttachments([]);
                setViewMode('CONVERSATION');
              }}
              className="w-full bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold text-[14px] py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 stroke-[2]" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SCREEN 6: REQUEST CONVERSATION SCREEN                               */}
      {/* =================================================================== */}
      {viewMode === 'CONVERSATION' && selectedTicket && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
          {/* Header */}
          <div className="px-4 pt-1.5 pb-2.5 border-b border-[#f0f2f5] flex items-start gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setViewMode('DETAILS')}
              className="p-1 -ml-1 text-neutral-900 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-lg hover:bg-neutral-100"
              aria-label="Back to Request Details"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] sm:text-[20px] font-bold text-neutral-900 tracking-tight leading-tight">
                Request Conversation
              </h1>
              <p className="text-[11.5px] text-[#6b7280] font-normal mt-0.5 truncate">
                {selectedTicket.displayId} &nbsp;•&nbsp; {selectedTicket.subject}
              </p>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 py-3 space-y-4">
            {groupedConversationMessages.map((group) => (
              <div key={group.dateLabel} className="space-y-3">
                {/* Date Separator Pill */}
                <div className="flex justify-center">
                  <span className="bg-[#f1f3f6] text-[#4b5563] text-[10.5px] font-medium px-3 py-1 rounded-full">
                    {group.dateLabel}
                  </span>
                </div>

                {group.items.map((msg) => {
                  const isStaff = msg.senderType === 'STAFF';

                  if (isStaff) {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="bg-[#eaf2ff] border border-[#dbeafe] text-neutral-900 rounded-2xl rounded-tr-xs px-3.5 py-2.5 max-w-[82%] shadow-2xs">
                          {msg.message && (
                            <p className="text-[12px] leading-relaxed whitespace-pre-wrap">
                              {msg.message}
                            </p>
                          )}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att) => (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => handlePreviewAttachment(selectedTicket, att)}
                                  className="w-full bg-white/90 border border-blue-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-left text-[11px] font-medium text-neutral-800 cursor-pointer"
                                >
                                  <span className="truncate">{att.fileName}</span>
                                  <span className="text-[10px] text-neutral-500 shrink-0">
                                    {att.fileSizeFormatted}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#6b7280]">
                            <span>{msg.timestamp}</span>
                            <CheckCheck className="w-3.5 h-3.5 text-[#2563eb] stroke-[2.2]" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#f5f6f8] border border-[#e5e7eb] flex items-center justify-center shrink-0 text-neutral-900 mt-1">
                        {selectedTicket.destination === 'SCHOOL' ? (
                          <SchoolSupportIcon className="w-4 h-4" />
                        ) : (
                          <OffsleekSupportIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="bg-[#f3f4f6] border border-[#e5e7eb] text-neutral-900 rounded-2xl rounded-tl-xs px-3.5 py-2.5 max-w-[82%]">
                        <div className="text-[11.5px] font-bold text-neutral-900 mb-0.5">
                          {msg.senderName}
                        </div>
                        <p className="text-[12px] text-neutral-700 leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </p>
                        <div className="text-[10px] text-[#6b7280] text-right mt-1">
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Reply Composer or Closed State Notice */}
          {selectedTicket.status === 'Closed' || selectedTicket.status === 'Resolved' ? (
            <div className="px-4 py-3 bg-[#f8f9fa] border-t border-[#e5e7eb] text-center space-y-2">
              <div className="text-[11.5px] text-[#6b7280] font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>
                  This request is {selectedTicket.status.toLowerCase()} and cannot receive new replies.
                </span>
              </div>
              {!selectedTicket.feedback && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackRating(0);
                    setFeedbackComment('');
                    setFeedbackError(null);
                    setViewMode('FEEDBACK');
                  }}
                  className="text-[12px] font-bold text-[#15803d] underline cursor-pointer"
                >
                  Share Your Feedback
                </button>
              )}
            </div>
          ) : (
            <form
              onSubmit={handleSendReply}
              className="px-3.5 py-2.5 bg-white border-t border-[#f0f2f5] space-y-2"
            >
              {/* Queued Reply Attachments */}
              {replyAttachments.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {replyAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="bg-[#f5f6f8] border border-[#e5e7eb] rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] shrink-0"
                    >
                      <span className="font-medium text-neutral-800 truncate max-w-[130px]">
                        {att.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReplyAttachments((prev) => prev.filter((item) => item.id !== att.id))
                        }
                        className="text-neutral-400 hover:text-black cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={replyFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                multiple
                onChange={handleReplyFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => replyFileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-[#e5e7eb] flex items-center justify-center text-neutral-700 shrink-0 cursor-pointer transition"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-4.5 h-4.5 stroke-[1.9]" />
                </button>

                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={1000}
                  placeholder="Type your reply..."
                  className="flex-1 bg-[#f3f4f6] border border-[#e5e7eb] focus:border-neutral-400 focus:bg-white rounded-full px-4 py-2.5 text-[12.5px] text-neutral-900 placeholder:text-[#9ca3af] focus:outline-none transition"
                />

                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="w-10 h-10 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white flex items-center justify-center shrink-0 cursor-pointer transition shadow-xs"
                  aria-label="Send reply"
                >
                  <Send className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SCREEN 8: SHARE YOUR FEEDBACK SCREEN                                */}
      {/* =================================================================== */}
      {viewMode === 'FEEDBACK' && selectedTicket && (
        <form
          onSubmit={handleSubmitFeedback}
          className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-150"
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 pt-1 pb-4 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-2 min-w-0 pt-0.5">
              <button
                type="button"
                onClick={() => setViewMode('DETAILS')}
                className="p-1 -ml-1 text-neutral-900 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-lg hover:bg-neutral-100"
                aria-label="Back to Request Details"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-[20px] sm:text-[21px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Share Your Feedback
                </h1>
                <p className="text-[12px] text-[#6b7280] font-normal mt-0.5">
                  Tell us about your support experience
                </p>
              </div>
            </div>

            {/* Ticket Summary Card */}
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 text-neutral-900 shadow-2xs">
                  {selectedTicket.destination === 'SCHOOL' ? (
                    <SchoolSupportIcon className="w-5 h-5" />
                  ) : (
                    <OffsleekSupportIcon className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-neutral-900 truncate">
                    {selectedTicket.subject}
                  </div>
                  <div className="text-[11.5px] text-[#6b7280] mt-0.5">
                    {selectedTicket.displayId}
                  </div>
                </div>
              </div>
              {renderStatusBadge(selectedTicket.status)}
            </div>

            {/* 5-Star Rating Input */}
            <div className="pt-1">
              <label className="block text-[12.5px] font-bold text-neutral-900 mb-3">
                How was your experience? <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center gap-3 py-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isSelected = star <= feedbackRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setFeedbackRating(star);
                        if (feedbackError) setFeedbackError(null);
                      }}
                      className="p-1 cursor-pointer transition transform active:scale-90"
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <Star
                        className={`w-8 h-8 transition ${
                          isSelected
                            ? 'text-[#f59e0b] fill-[#f59e0b]'
                            : 'text-[#9ca3af] stroke-[1.6]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Feedback Textarea */}
            <div>
              <label className="block text-[12.5px] font-bold text-neutral-900 mb-1.5">
                Your Feedback <span className="text-[#6b7280] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={4}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value.slice(0, 300))}
                maxLength={300}
                placeholder="Share your thoughts, suggestions or any additional comments..."
                className="w-full bg-white border border-[#e5e7eb] focus:border-neutral-900 rounded-xl px-3.5 py-2.5 text-[12.5px] text-neutral-900 placeholder:text-[#9ca3af] focus:outline-none resize-none leading-relaxed transition"
              />
              <div className="flex items-center justify-between mt-1">
                {feedbackError ? (
                  <span className="text-[11px] text-red-600 font-medium">{feedbackError}</span>
                ) : (
                  <span />
                )}
                <span className="text-[11px] text-[#6b7280] font-medium">
                  {feedbackComment.length} / 300
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Submit Feedback Button */}
          <div className="px-4 py-3 bg-white border-t border-[#f0f2f5]">
            <button
              type="submit"
              disabled={isSubmittingFeedback}
              className="w-full bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold text-[13.5px] py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4 stroke-[2]" />
              <span>{isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* SCREEN 9: FEEDBACK SUBMITTED CONFIRMATION SCREEN                    */}
      {/* =================================================================== */}
      {viewMode === 'FEEDBACK_SUBMITTED' && (
        <div className="flex-1 flex flex-col justify-between px-4 pt-1 pb-6 animate-in fade-in duration-150">
          {/* Top-left Chevron */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className="p-1 -ml-1 text-neutral-900 hover:text-black active:scale-95 transition cursor-pointer rounded-lg hover:bg-neutral-100"
              aria-label="Back to My Requests"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
            </button>
          </div>

          {/* Centered Confirmation Content matching Panel 9 */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-24 h-24 rounded-full bg-[#dcfce7]/70 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-[2.5px] border-[#16a34a] bg-[#ecfdf5] flex items-center justify-center text-[#16a34a]">
                <Check className="w-7 h-7 stroke-[2.6]" />
              </div>
            </div>

            <h1 className="text-[21px] font-bold text-neutral-900 mt-5">
              Feedback Submitted
            </h1>

            <p className="text-[12.5px] text-[#6b7280] mt-2 max-w-[260px] leading-relaxed">
              Thank you for your feedback! Your response helps us improve our support service.
            </p>

            <button
              type="button"
              onClick={() => {
                refreshTickets();
                setViewMode('LIST');
              }}
              className="mt-7 w-full max-w-[260px] bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold text-[13.5px] py-3.5 rounded-2xl shadow-xs transition cursor-pointer"
            >
              Back to My Requests
            </button>
          </div>

          <div />
        </div>
      )}

      {/* Bottom Navigation Bar (Visible on Landing and List views) */}
      {showBottomNav && (
        <StaffBottomNav
          activeTab="My Requests"
          onNavigateHome={onNavigateHome}
          onNavigateAttendance={onNavigateAttendance}
          onNavigateAnnouncements={onNavigateAnnouncements}
          onNavigateMyRequests={() => setViewMode('LANDING')}
          onNavigateProfile={onNavigateProfile}
        />
      )}

      {/* =================================================================== */}
      {/* ATTACHMENT PREVIEW MODAL (Bounded Inside Mobile Frame)              */}
      {/* =================================================================== */}
      {previewAttachment && selectedTicket && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-[340px] rounded-2xl p-4 shadow-2xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100">
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-bold text-neutral-900 truncate">
                  {previewAttachment.fileName}
                </h3>
                <p className="text-[11px] text-[#6b7280]">
                  {previewAttachment.fileType} • {previewAttachment.fileSizeFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-neutral-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-2 max-h-[260px] overflow-auto flex items-center justify-center">
              {previewAttachment.fileType === 'PDF' &&
              previewAttachment.dataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewAttachment.dataUrl}
                  title={previewAttachment.fileName}
                  className="w-full h-[220px] rounded-lg border-0"
                />
              ) : (
                <img
                  src={previewAttachment.dataUrl}
                  alt={previewAttachment.fileName}
                  className="max-h-[220px] w-auto object-contain rounded-lg"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="py-2.5 text-[12px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadAttachment(selectedTicket, previewAttachment)}
                className="py-2.5 text-[12px] font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
