/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileCheck,
  FileWarning,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { AnnouncementAttachment } from './services/announcementsService';
import {
  downloadAnnouncementAttachment,
  fetchAttachmentFile,
  ResolvedAttachmentData,
} from './utils/announcementAttachmentUtils';

interface AnnouncementPdfModalProps {
  attachment: AnnouncementAttachment;
  announcementTitle?: string;
  onClose: () => void;
  onDownload?: (attachment: AnnouncementAttachment) => Promise<void> | void;
  isDownloading?: boolean;
  returnFocusTo?: HTMLElement | null;
}

export default function AnnouncementPdfModal({
  attachment,
  onClose,
  onDownload,
  isDownloading: externalIsDownloading = false,
  returnFocusTo,
}: AnnouncementPdfModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [resolvedFile, setResolvedFile] = useState<ResolvedAttachmentData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [internalDownloading, setInternalDownloading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isDownloading = externalIsDownloading || internalDownloading;

  // Capture focus on open, lock body scroll, handle Escape key, and restore focus on unmount
  useEffect(() => {
    previousFocusRef.current = returnFocusTo || (document.activeElement as HTMLElement | null);

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button asynchronously so keyboard users immediately have dialog focus
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = prevBodyOverflow;

      const targetToFocus = previousFocusRef.current;
      if (targetToFocus && typeof targetToFocus.focus === 'function') {
        targetToFocus.focus();
      }
    };
  }, [onClose, returnFocusTo]);

  // Retrieve real attachment file for preview
  useEffect(() => {
    const controller = new AbortController();
    let createdObjectUrl: string | null = null;

    setLoadState('loading');
    setErrorMessage('');
    setResolvedFile(null);

    fetchAttachmentFile(attachment, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          URL.revokeObjectURL(data.objectUrl);
          return;
        }
        createdObjectUrl = data.objectUrl;
        setResolvedFile(data);
        setLoadState('ready');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof Error
            ? err.message
            : `Unable to load preview for "${attachment.name}".`;
        setErrorMessage(msg);
        setLoadState('error');
      });

    return () => {
      controller.abort();
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [attachment, retryCount]);

  const handleFooterDownload = async () => {
    if (isDownloading) return;
    if (onDownload) {
      await onDownload(attachment);
      return;
    }

    setInternalDownloading(true);
    try {
      await downloadAnnouncementAttachment(attachment);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : `Failed to download "${attachment.name}".`
      );
      setLoadState('error');
    } finally {
      setInternalDownloading(false);
    }
  };

  return (
    <div
      className="absolute inset-0 w-full h-full z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="announcement-detail-modal bg-white rounded-3xl p-4 sm:p-5 border border-neutral-200 space-y-3.5 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileCheck className="w-5 h-5 text-black shrink-0" strokeWidth={2} />
            <h4 id={titleId} className="text-xs font-bold text-black truncate">
              {attachment.name}
            </h4>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Attachment Preview Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain announcement-modal-scroll">
          {loadState === 'loading' && (
            <div className="w-full h-[260px] sm:h-[300px] bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-neutral-500">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-700" />
              <span className="text-xs font-medium text-neutral-600">
                Loading document preview...
              </span>
            </div>
          )}

          {loadState === 'error' && (
            <div className="w-full min-h-[200px] bg-neutral-50 border border-neutral-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-black">Preview Unavailable</p>
              <p className="text-[11px] text-neutral-500 leading-relaxed max-w-[260px]">
                {errorMessage || 'This file could not be loaded for preview.'}
              </p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-[11px] font-semibold text-neutral-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {loadState === 'ready' && resolvedFile && resolvedFile.kind === 'pdf' && (
            <div className="w-full h-[320px] sm:h-[360px] rounded-2xl border border-neutral-200 bg-neutral-100 overflow-auto overscroll-contain announcement-modal-scroll">
              <iframe
                src={resolvedFile.objectUrl}
                title={`Preview of ${attachment.name}`}
                className="w-full h-full border-0 bg-white rounded-2xl"
              />
            </div>
          )}

          {loadState === 'ready' && resolvedFile && resolvedFile.kind === 'image' && (
            <div className="w-full max-h-[360px] rounded-2xl border border-neutral-200 bg-neutral-50 p-2 flex items-center justify-center overflow-auto overscroll-contain announcement-modal-scroll">
              <img
                src={resolvedFile.objectUrl}
                alt={attachment.name}
                className="max-w-full max-h-[330px] w-auto h-auto object-contain rounded-xl"
              />
            </div>
          )}

          {loadState === 'ready' && resolvedFile && resolvedFile.kind === 'unsupported' && (
            <div className="w-full min-h-[200px] bg-neutral-50 border border-neutral-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-neutral-200/70 flex items-center justify-center text-neutral-700">
                <FileWarning className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-black">Preview Unavailable</p>
              <p className="text-[11px] text-neutral-500 leading-relaxed max-w-[260px]">
                In-browser preview is not supported for this file type. You can still download the attachment below.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            Close Preview
          </button>

          <button
            type="button"
            onClick={handleFooterDownload}
            disabled={isDownloading}
            className="py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
