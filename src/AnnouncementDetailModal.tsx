/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Download,
  Share2,
  Check,
  Building2,
  Users,
  Megaphone,
  Trophy,
  FileText,
  Star,
  Eye,
} from 'lucide-react';
import { Announcement } from './services/announcementsService';
import AnnouncementPdfModal from './AnnouncementPdfModal';

interface AnnouncementDetailModalProps {
  announcement: Announcement;
  onClose: () => void;
}

export default function AnnouncementDetailModal({
  announcement,
  onClose,
}: AnnouncementDetailModalProps) {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full sm:max-w-[420px] rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-neutral-200">
          
          {/* Top Grab Handle on mobile */}
          <div className="sm:hidden w-12 h-1 bg-neutral-300 rounded-full mx-auto mt-2 mb-1" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-100">
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
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
            
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
            <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[9.5px] uppercase font-semibold text-neutral-400 tracking-wider">
                  Published By
                </div>
                <div className="text-[12px] font-bold text-neutral-900 mt-0.5">
                  {announcement.publisher.name}
                </div>
                <div className="text-[10.5px] text-neutral-500">
                  {announcement.publisher.role} • {announcement.publisher.department}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-600 bg-white px-2.5 py-1 rounded-lg border border-neutral-200/80 shadow-2xs">
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
                <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-2xl p-3 flex items-center justify-between hover:bg-neutral-100/80 transition">
                  <div
                    onClick={() => setShowPdfModal(true)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    {/* Red PDF Icon badge */}
                    <div className="w-9 h-9 bg-[#e53935] rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                      <span className="text-[9px] font-black tracking-tight leading-none">PDF</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-neutral-900 truncate">
                        {announcement.attachment.name}
                      </div>
                      <div className="text-[10.5px] text-neutral-500 mt-0.5">
                        {announcement.attachment.size} • Tap to preview
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setShowPdfModal(true)}
                      className="p-2 rounded-xl text-neutral-600 hover:text-black hover:bg-white transition cursor-pointer border border-transparent hover:border-neutral-200"
                      title="Preview PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPdfModal(true)}
                      className="p-2 rounded-xl text-neutral-600 hover:text-black hover:bg-white transition cursor-pointer border border-transparent hover:border-neutral-200"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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

          {/* Modal Footer */}
          <div className="px-4 sm:px-5 py-3 bg-[#fafbfc] border-t border-neutral-100 flex items-center justify-end">
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
        />
      )}
    </>
  );
}
