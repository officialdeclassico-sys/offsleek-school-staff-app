/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
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
import StaffBottomNav from './components/StaffBottomNav';
import StaffStatusBar from './components/StaffStatusBar';
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
  } | null>(null);

  // Create Announcement Modal for Staff (RBAC)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Important' | 'Academic' | 'Events' | 'Holidays' | 'General'>('General');
  const [newContent, setNewContent] = useState('');

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

  // Handle Staff create announcement
  const handleCreateAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showToast('Please provide a title and announcement content');
      return;
    }

    const created = addAnnouncement({
      title: newTitle.trim(),
      category: newCategory,
      dateStr: formatISTDateMedium(),
      preview: newContent.trim().slice(0, 110) + '...',
      fullContent: newContent.trim(),
      publisher: {
        name: currentProfile.name,
        role: currentProfile.subtext,
        department: 'Academic Staff',
      },
      schoolId: currentProfile.schoolId,
      targetGrades: ['All'],
      targetRoles: ['STAFF', 'PARENT', 'STUDENT'],
      isImportant: newCategory === 'Important',
    });

    setAllAnnouncements((prev) => [created, ...prev]);
    setShowCreateModal(false);
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1.5 pb-4 space-y-3.5">
        
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
                onClick={() => setShowCreateModal(true)}
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

                      {/* Attachment Box if exists (Matching Reference Screenshot) */}
                      {ann.attachment && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePdfAttachment({
                              attachment: ann.attachment!,
                              title: ann.title,
                            });
                          }}
                          className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-2 sm:p-2.5 flex items-center justify-between mt-2.5 hover:bg-neutral-100 transition group/att"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Red PDF Icon badge */}
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#e53935] rounded-lg flex flex-col items-center justify-center text-white shrink-0 shadow-2xs">
                              <span className="text-[8.5px] font-black tracking-tight leading-none">
                                PDF
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11.5px] sm:text-[12px] font-medium text-neutral-800 truncate">
                                {ann.attachment.name}
                              </div>
                              <div className="text-[9.5px] sm:text-[10px] text-neutral-400">
                                {ann.attachment.size}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePdfAttachment({
                                attachment: ann.attachment!,
                                title: ann.title,
                              });
                            }}
                            className="p-1.5 text-neutral-500 group-hover/att:text-neutral-900 hover:bg-white rounded-lg transition shrink-0 cursor-pointer"
                            title="Download / View PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                    </div>
                  </div>

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
        />
      )}

      {/* Modal: Staff Create Announcement (Authorized staff only) */}
      {showCreateModal && isStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl p-5 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">
                Create School Announcement
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncementSubmit} className="mt-3.5 space-y-3">
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

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(
                      e.target.value as 'Important' | 'Academic' | 'Events' | 'Holidays' | 'General'
                    )
                  }
                  className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-[12.5px] text-neutral-900 focus:outline-none focus:border-black"
                >
                  <option value="General">General</option>
                  <option value="Important">Important</option>
                  <option value="Academic">Academic</option>
                  <option value="Events">Events</option>
                  <option value="Holidays">Holidays</option>
                </select>
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

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[12px] font-medium text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[12.5px] font-medium text-white bg-black hover:bg-neutral-800 rounded-xl transition cursor-pointer shadow-xs"
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
