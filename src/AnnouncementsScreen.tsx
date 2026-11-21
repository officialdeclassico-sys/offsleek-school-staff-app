/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronRight,
  Megaphone,
  Trophy,
  FileText,
  Calendar,
  Star,
  Search,
  X,
  Home,
  User,
  Plus,
  Check,
  Filter,
  CheckCircle2,
  AlertCircle,
  Upload,
  Loader2,
} from 'lucide-react';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementAttachment,
  UserProfile,
  AVAILABLE_PROFILES,
  getStoredAnnouncements,
  filterAnnouncements,
  canManageAnnouncements,
  addAnnouncement,
} from './services/announcementsService';
import AnnouncementDetailModal from './AnnouncementDetailModal';
import AnnouncementPdfModal from './AnnouncementPdfModal';
import AnnouncementAttachmentRow from './components/AnnouncementAttachmentRow';
import {
  downloadAnnouncementAttachment,
  getAttachmentBadgeLabel,
  uploadAnnouncementAttachment,
} from './utils/announcementAttachmentUtils';
import StaffBottomNav from './components/StaffBottomNav';
import StaffStatusBar from './components/StaffStatusBar';
import OffsleekDropdown from './components/OffsleekDropdown';
import { formatISTDateMedium } from './utils/dateTimeUtils';

interface AnnouncementsScreenProps {
  onNavigateHome: () => void;
  onLogout?: () => void;
  onNavigateAttendance?: () => void;
  onNavigateProfile?: () => void;
  onNavigateMyRequests?: () => void;
  initialProfileId?: string;
}

export default function AnnouncementsScreen({
  onNavigateHome,
  onLogout,
  onNavigateAttendance,
  onNavigateProfile,
  onNavigateMyRequests,
  initialProfileId = 'priya-sharma',
}: AnnouncementsScreenProps) {
  // Active Profile State (defaults to Priya Sharma matching screenshot, with Aarav Mehta Grade 6 switcher)
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(() => {
    return (
      AVAILABLE_PROFILES.find((p) => p.id === initialProfileId) || AVAILABLE_PROFILES[0]
    );
  });
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Active Category Filter
  const [activeCategory, setActiveCategory] = useState<AnnouncementCategory>('All');

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Data
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>(getStoredAnnouncements);

  // Modal states
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [activePdfAttachment, setActivePdfAttachment] = useState<{
    attachment: AnnouncementAttachment;
    title: string;
    triggerEl?: HTMLElement | null;
  } | null>(null);

  // Create Announcement Modal for Staff (RBAC)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingAnnouncementId, setPendingAnnouncementId] = useState<string>(() => `ann-${Date.now()}`);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Important' | 'Academic' | 'Events' | 'Holidays' | 'General'>('General');
  const [newContent, setNewContent] = useState('');
  const [uploadedAttachment, setUploadedAttachment] = useState<AnnouncementAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  // Attachment download & toast feedback state
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadToast, setDownloadToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const downloadToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (downloadToastTimerRef.current !== null) {
        window.clearTimeout(downloadToastTimerRef.current);
      }
    };
  }, []);

  const showDownloadToast = (type: 'success' | 'error', message: string) => {
    if (downloadToastTimerRef.current !== null) {
      window.clearTimeout(downloadToastTimerRef.current);
    }
    setDownloadToast({ type, message });
    downloadToastTimerRef.current = window.setTimeout(() => {
      setDownloadToast(null);
      downloadToastTimerRef.current = null;
    }, 2800);
  };

  const handleDownloadAttachment = async (
    attachment: AnnouncementAttachment,
    key: string
  ) => {
    if (downloadingKey !== null) return;
    setDownloadingKey(key);
    try {
      const filename = await downloadAnnouncementAttachment(attachment);
      showDownloadToast('success', filename);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Failed to download "${attachment.name}".`;
      showDownloadToast('error', msg);
    } finally {
      setDownloadingKey(null);
    }
  };

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Filtered announcements
  const displayedAnnouncements = useMemo(() => {
    return filterAnnouncements(allAnnouncements, currentProfile, activeCategory, searchQuery);
  }, [allAnnouncements, currentProfile, activeCategory, searchQuery]);

  // Handle switching student/staff
  const handleSelectProfile = (profile: UserProfile) => {
    setCurrentProfile(profile);
    setIsProfileDropdownOpen(false);
    showToast(`Switched view to ${profile.name} (${profile.subtext})`);
  };

  const openCreateModal = () => {
    setPendingAnnouncementId(`ann-${Date.now()}`);
    setNewTitle('');
    setNewCategory('General');
    setNewContent('');
    setUploadedAttachment(null);
    setAttachmentUploadError(null);
    setIsUploadingAttachment(false);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setAttachmentUploadError(null);
    setIsUploadingAttachment(false);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleAttachmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentUploadError(null);
    setIsUploadingAttachment(true);
    try {
      const uploaded = await uploadAnnouncementAttachment(
        file,
        currentProfile.schoolId,
        pendingAnnouncementId
      );
      setUploadedAttachment(uploaded);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : `Failed to attach "${file.name}".`;
      setAttachmentUploadError(msg);
      setUploadedAttachment(null);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveUploadedAttachment = () => {
    setUploadedAttachment(null);
    setAttachmentUploadError(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  // Handle Staff create announcement
  const handleCreateAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingAttachment) {
      showToast('Please wait for the attachment upload to finish');
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('Please provide a title and announcement content');
      return;
    }

    const trimmedContent = newContent.trim();
    const previewText =
      trimmedContent.length > 110
        ? trimmedContent.slice(0, 110) + '...'
        : trimmedContent;

    const created = addAnnouncement({
      id: pendingAnnouncementId,
      title: newTitle.trim(),
      category: newCategory,
      dateStr: formatISTDateMedium(),
      preview: previewText,
      fullContent: trimmedContent,
      publisher: {
        name: currentProfile.name,
        role: currentProfile.subtext,
        department: 'Academic Staff',
      },
      schoolId: currentProfile.schoolId,
      targetGrades: ['All'],
      targetRoles: ['STAFF', 'PARENT', 'STUDENT'],
      isImportant: newCategory === 'Important',
      ...(uploadedAttachment ? { attachment: uploadedAttachment } : {}),
    });

    setAllAnnouncements((prev) => [created, ...prev]);
    closeCreateModal();
    setUploadedAttachment(null);
    setNewTitle('');
    setNewContent('');
    showToast('Announcement published successfully');
  };

  // Helper for category styling & icon
  const getCategoryTheme = (category: Announcement['category']) => {
    switch (category) {
      case 'Important':
        return {
          icon: Megaphone,
          iconTile: 'bg-[#ffecec] text-[#f43f5e]',
          badge: 'bg-[#ffe6eb] text-[#e11d48]',
        };
      case 'Events':
        return {
          icon: Trophy,
          iconTile: 'bg-[#fff7e6] text-[#f59e0b]',
          badge: 'bg-[#fef3c7] text-[#d97706]',
        };
      case 'Academic':
        return {
          icon: FileText,
          iconTile: 'bg-[#f5f0ff] text-[#8b5cf6]',
          badge: 'bg-[#ede9fe] text-[#7c3aed]',
        };
      case 'Holidays':
        return {
          icon: Calendar,
          iconTile: 'bg-[#edf5ff] text-[#3b82f6]',
          badge: 'bg-[#e0f2fe] text-[#0284c7]',
        };
      case 'General':
      default:
        return {
          icon: Star,
          iconTile: 'bg-[#ecfdf5] text-[#10b981]',
          badge: 'bg-[#d1fae5] text-[#059669]',
        };
    }
  };

  const isStaff = canManageAnnouncements(currentProfile.role);

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Download Success / Error Toast (Student Portal Spec) */}
      {downloadToast && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-[70] text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 max-w-[calc(100%-24px)] ${
            downloadToast.type === 'success' ? 'bg-black' : 'bg-rose-600'
          }`}
        >
          {downloadToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span className="truncate font-medium">
            {downloadToast.type === 'success'
              ? `Downloaded ${downloadToast.message}`
              : downloadToast.message}
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-4 right-4 z-50 bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <StaffStatusBar />

      {/* Main Content Area */}
      <div
        className={`flex-1 overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1.5 pb-4 space-y-3.5 ${
          activePdfAttachment || selectedAnnouncement || showCreateModal
            ? 'overflow-y-hidden'
            : 'overflow-y-auto'
        }`}
      >
        
        {/* Page Title & Subtitle + Search Icon */}
        <div className="flex items-center justify-between pt-0.5">
          <div>
            <h2 className="text-[22px] sm:text-[24px] font-bold text-neutral-900 tracking-tight leading-tight">
              Announcements
            </h2>
            <p className="text-[12px] sm:text-[12.5px] text-neutral-500 font-normal mt-0.5">
              Stay informed with the latest updates
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSearchInput(!showSearchInput)}
              className={`p-2 rounded-xl transition cursor-pointer border ${
                showSearchInput || searchQuery
                  ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                  : 'bg-white border-neutral-200 text-neutral-500 hover:text-neutral-900'
              }`}
              title="Search announcements"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* If staff, offer quick create button */}
            {isStaff && (
              <button
                type="button"
                onClick={openCreateModal}
                className="hidden min-[360px]:flex items-center gap-1 bg-black hover:bg-neutral-800 text-white text-[11px] font-medium py-1.5 px-2.5 rounded-xl transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Search Input */}
        {showSearchInput && (
          <div className="relative animate-in fade-in duration-150">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements, circulars or attachments..."
              className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl pl-9 pr-8 py-2 text-[12px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-800"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Category Filter Pills (Exact Match to Reference Screenshot) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {(['All', 'Academic', 'Events', 'Holidays', 'General'] as AnnouncementCategory[]).map(
            (category) => {
              const isSelected = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[11.5px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#dbeafe] text-[#1d4ed8] shadow-2xs font-semibold'
                      : 'bg-white border border-[#e5e7eb] text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  {category}
                </button>
              );
            }
          )}
        </div>

        {/* Announcement Cards List */}
        <div className="space-y-3">
          {displayedAnnouncements.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                <Filter className="w-5 h-5" />
              </div>
              <h3 className="text-[14px] font-bold text-neutral-900">No Announcements Found</h3>
              <p className="text-[12px] text-neutral-500 max-w-xs mx-auto">
                {searchQuery
                  ? `No announcements match "${searchQuery}". Try a different keyword.`
                  : `There are currently no announcements under the ${activeCategory} category for this profile.`}
              </p>
              {(searchQuery || activeCategory !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('All');
                  }}
                  className="mt-2 text-[12px] text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            displayedAnnouncements.map((ann) => {
              const theme = getCategoryTheme(ann.category);
              const CategoryIcon = theme.icon;

              return (
                <div
                  key={ann.id}
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:border-neutral-400 hover:shadow-xs transition duration-150 cursor-pointer flex flex-col justify-between"
                >
                  {/* Top section: Icon Tile + Header/Badge/Date + Content */}
                  <div className="flex items-start gap-3">
                    
                    {/* Left Icon Tile */}
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${theme.iconTile} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <CategoryIcon className="w-5 h-5 sm:w-5 sm:h-5 stroke-[1.8]" />
                    </div>

                    {/* Middle Content */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Top Row: Category Pill Badge + Date */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-[9.5px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full leading-tight ${theme.badge}`}
                        >
                          {ann.category}
                        </span>
                        <span className="text-[10.5px] sm:text-[11px] text-neutral-400 font-normal shrink-0">
                          {ann.dateStr}
                        </span>
                      </div>

                      {/* Announcement Title */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className="text-[13.5px] sm:text-[14.5px] font-bold text-neutral-900 leading-snug tracking-tight">
                          {ann.title}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      </div>

                      {/* Preview Text */}
                      <p className="text-[11.5px] sm:text-[12px] text-[#6b7280] leading-relaxed mt-1 line-clamp-2">
                        {ann.preview}
                      </p>

                    </div>
                  </div>

                  {/* Attachment Row (Full-width, left-aligned with card content) */}
                  {ann.attachment && (
                    <AnnouncementAttachmentRow
                      attachment={ann.attachment}
                      isDownloading={downloadingKey === ann.id}
                      onPreview={(triggerEl) =>
                        setActivePdfAttachment({
                          attachment: ann.attachment!,
                          title: ann.title,
                          triggerEl,
                        })
                      }
                      onDownload={() =>
                        handleDownloadAttachment(ann.attachment!, ann.id)
                      }
                    />
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Fixed Bottom Navigation Bar (5 Tabs with Announcements Selected) */}
      <StaffBottomNav
        activeTab="Announcements"
        onNavigateHome={onNavigateHome}
        onNavigateAttendance={onNavigateAttendance || (() => {})}
        onNavigateAnnouncements={() => {}}
        onNavigateMyRequests={onNavigateMyRequests || (() => showToast('Opening Requests Portal'))}
        onNavigateProfile={() => {
          if (onNavigateProfile) {
            onNavigateProfile();
          } else if (onLogout) {
            showToast('Signed out of session');
            setTimeout(() => onLogout(), 700);
          } else {
            showToast('Viewing profile settings');
          }
        }}
      />

      {/* Modal: Announcement Full Detail */}
      {selectedAnnouncement && (
        <AnnouncementDetailModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}

      {/* Modal: PDF Document Preview & Download */}
      {activePdfAttachment && (
        <AnnouncementPdfModal
          attachment={activePdfAttachment.attachment}
          announcementTitle={activePdfAttachment.title}
          onClose={() => setActivePdfAttachment(null)}
          onDownload={(att) => handleDownloadAttachment(att, 'modal')}
          isDownloading={downloadingKey !== null}
          returnFocusTo={activePdfAttachment.triggerEl}
        />
      )}

      {/* Modal: Staff Create Announcement (Authorized staff only) */}
      {showCreateModal && isStaff && (
        <div
          onClick={closeCreateModal}
          className="absolute inset-0 w-full h-full z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center overscroll-contain animate-in fade-in duration-200"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="announcement-detail-modal bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">
                Create School Announcement
              </h3>
              <button
                type="button"
                onClick={closeCreateModal}
                aria-label="Close create announcement modal"
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateAnnouncementSubmit}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <div className="flex-1 min-h-0 px-4 sm:px-5 py-3.5 space-y-3 overflow-y-auto overflow-x-hidden overscroll-y-contain announcement-modal-scroll">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Science Exhibition Registration Open"
                    className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-[12.5px] text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div className="relative z-30">
                  <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <OffsleekDropdown
                    size="sm"
                    value={newCategory}
                    options={['General', 'Important', 'Academic', 'Events', 'Holidays'].map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    onChange={(val) =>
                      setNewCategory(
                        val as 'Important' | 'Academic' | 'Events' | 'Holidays' | 'General'
                      )
                    }
                    maxMenuHeightPx={184}
                    ariaLabel="Announcement Category"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Message Content
                  </label>
                  <textarea
                    rows={4}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Enter complete circular or notice description for parents and students..."
                    className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-[12.5px] text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                {/* Attachment File Upload */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Attachment (Optional)
                  </label>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleAttachmentFileChange}
                    className="hidden"
                  />

                  {isUploadingAttachment ? (
                    <div className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex items-center gap-2.5 text-neutral-600">
                      <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                      <span className="text-xs font-medium">Uploading attachment...</span>
                    </div>
                  ) : uploadedAttachment ? (
                    <div className="w-full bg-neutral-100/80 border border-neutral-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wider shrink-0">
                          {getAttachmentBadgeLabel(uploadedAttachment)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-black truncate">
                            {uploadedAttachment.name}
                          </div>
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                            <span>{uploadedAttachment.size}</span>
                            <span>•</span>
                            <span>
                              {uploadedAttachment.storageProvider === 'firebase-storage'
                                ? 'Firebase Storage'
                                : 'Saved locally'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveUploadedAttachment}
                        aria-label={`Remove ${uploadedAttachment.name}`}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-neutral-200/70 transition cursor-pointer shrink-0"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="w-full bg-[#f8f9fa] hover:bg-neutral-100 border border-dashed border-neutral-300 rounded-xl px-3 py-3 flex items-center justify-center gap-2 text-neutral-600 hover:text-black transition cursor-pointer"
                    >
                      <Upload className="w-4 h-4 shrink-0" />
                      <span className="text-[11.5px] font-medium">
                        Attach PDF, Image, or Document (Max 10 MB)
                      </span>
                    </button>
                  )}

                  {attachmentUploadError && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{attachmentUploadError}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 px-4 sm:px-5 py-3 bg-[#fafbfc] flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-[12px] font-medium text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingAttachment}
                  className="px-5 py-2 text-[12.5px] font-medium text-white bg-black hover:bg-neutral-800 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
