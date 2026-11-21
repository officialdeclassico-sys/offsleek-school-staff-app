/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Eye, Loader2 } from 'lucide-react';
import { AnnouncementAttachment } from '../services/announcementsService';
import { getAttachmentBadgeLabel } from '../utils/announcementAttachmentUtils';

interface AnnouncementAttachmentRowProps {
  attachment: AnnouncementAttachment;
  onPreview: (triggerEl?: HTMLElement | null) => void;
  onDownload: () => void;
  isDownloading?: boolean;
  className?: string;
}

export default function AnnouncementAttachmentRow({
  attachment,
  onPreview,
  onDownload,
  isDownloading = false,
  className = '',
}: AnnouncementAttachmentRowProps) {
  const badgeLabel = getAttachmentBadgeLabel(attachment);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onPreview(e.currentTarget);
      }}
      className={`w-full min-w-0 box-border bg-neutral-100/80 hover:bg-neutral-100 border border-neutral-200/60 rounded-xl p-2.5 flex items-center justify-between gap-2 mt-3.5 transition-colors cursor-pointer ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wider shrink-0">
          {badgeLabel}
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-black truncate leading-snug">
            {attachment.name}
          </div>
          <div className="text-[10px] text-neutral-400 tabular-nums">
            {attachment.size}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(e.currentTarget);
          }}
          className="p-1.5 hover:bg-neutral-200/80 rounded-lg text-neutral-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
          title="Preview Document"
          aria-label={`Preview ${attachment.name}`}
        >
          <Eye className="w-4 h-4" strokeWidth={1.8} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          disabled={isDownloading}
          className="p-1.5 hover:bg-neutral-200/80 rounded-lg text-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
          title="Download PDF"
          aria-label={`Download ${attachment.name}`}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          ) : (
            <Download className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
