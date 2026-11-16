/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Calendar,
  Share2,
  Check,
  Building2,
  Users,
  Megaphone,
  Trophy,
  FileText,
  Star,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Announcement, AnnouncementAttachment } from './services/announcementsService';
import AnnouncementPdfModal from './AnnouncementPdfModal';
import AnnouncementAttachmentRow from './components/AnnouncementAttachmentRow';
import { downloadAnnouncementAttachment } from './utils/announcementAttachmentUtils';

interface AnnouncementDetailModalProps {
  announcement: Announcement;
  onClose: () => void;
}

export default function AnnouncementDetailModal({
  announcement,
  onClose,
}: AnnouncementDetailModalProps) {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfTriggerEl, setPdfTriggerEl] = useState<HTMLElement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadToast, setDownloadToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showPdfModal) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [onClose, showPdfModal]);

  const showDownloadToast = (type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setDownloadToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => {
      setDownloadToast(null);
      toastTimerRef.current = null;
    }, 2800);
  };

  const handleDownload = async (attachment: AnnouncementAttachment) => {
    if (isDownloading) return;
    setIsDownloading(true);
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
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    setCopiedLink(true);
    navigator.clipboard?.writeText(window.location.href);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getCategoryConfig = (category: Announcement['category']) => {
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

  const config = getCategoryConfig(announcement.category);
  const CategoryIcon = config.icon;

  return (
    <>
      <div
        onClick={onClose}
        className="absolute inset-0 w-full h-full z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center overscroll-contain animate-in fade-in duration-200"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className="announcement-detail-modal bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200"
        >
          {/* Modal Header (Fixed) */}
          <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${config.badge}`}>
                {announcement.category}
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">
                {announcement.dateStr}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
                title="Share or Copy Link"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close announcement details"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body (Independently Scrollable, Hidden Scrollbar) */}
          <div
            className={`flex-1 min-h-0 px-4 sm:px-5 py-4 space-y-4 overflow-x-hidden overscroll-y-contain announcement-modal-scroll ${
              showPdfModal ? 'overflow-y-hidden' : 'overflow-y-auto'
            }`}
          >
            
            {/* Title with Category Icon */}
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-2xl ${config.iconTile} flex items-center justify-center shrink-0`}>
                <CategoryIcon className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[17px] sm:text-[18px] font-bold text-neutral-900 leading-snug">
                  {announcement.title}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Greenwood International School</span>
                </div>
              </div>
            </div>

            {/* Publisher Metadata Card */}
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] uppercase font-semibold text-neutral-400 tracking-wider">
                  Published By
                </div>
                <div className="text-[12px] font-bold text-neutral-900 mt-0.5 truncate">
                  {announcement.publisher.name}
                </div>
                <div className="text-[10.5px] text-neutral-500 leading-snug">
                  {announcement.publisher.role} • {announcement.publisher.department}
                </div>
              </div>
              <div className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[11px] text-neutral-600 bg-white px-2.5 py-1 rounded-lg border border-neutral-200/80 shadow-2xs">
                <Users className="w-3 h-3 text-neutral-500" />
                <span>All Parents</span>
              </div>
            </div>

            {/* Full announcement message */}
            <div className="prose prose-sm text-neutral-700 leading-relaxed text-[12.5px] whitespace-pre-line space-y-2 pt-1 border-t border-neutral-100">
              {announcement.fullContent}
            </div>

            {/* Attachment preview box if exists */}
            {announcement.attachment && (
              <div className="pt-2">
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Attached Document (1)
                </div>
                <AnnouncementAttachmentRow
                  attachment={announcement.attachment}
                  isDownloading={isDownloading}
                  className="mt-0!"
                  onPreview={(triggerEl) => {
                    setPdfTriggerEl(triggerEl || null);
                    setShowPdfModal(true);
                  }}
                  onDownload={() => handleDownload(announcement.attachment!)}
                />
              </div>
            )}

            {/* Target Audience / Scope */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span className="flex items-center gap-1">
                <span>Scope:</span>
                <span className="font-medium text-neutral-700">School-Wide (Grades 1–12)</span>
              </span>
              <span className="text-neutral-400">Ref: #{announcement.id.slice(-6)}</span>
            </div>

          </div>

          {/* Modal Footer (Fixed) */}
          <div className="shrink-0 px-4 sm:px-5 py-3 bg-[#fafbfc] border-t border-neutral-100 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 text-[12.5px] font-medium text-white bg-black hover:bg-neutral-800 rounded-xl transition cursor-pointer text-center"
            >
              Done
            </button>
          </div>

        </div>
      </div>

      {/* PDF Modal if opened */}
      {showPdfModal && announcement.attachment && (
        <AnnouncementPdfModal
          attachment={announcement.attachment}
          announcementTitle={announcement.title}
          onClose={() => setShowPdfModal(false)}
          onDownload={handleDownload}
          isDownloading={isDownloading}
          returnFocusTo={pdfTriggerEl}
        />
      )}

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
    </>
  );
}
