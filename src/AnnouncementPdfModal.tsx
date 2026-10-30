/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Download, FileText, Check, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { AnnouncementAttachment } from './services/announcementsService';

interface AnnouncementPdfModalProps {
  attachment: AnnouncementAttachment;
  announcementTitle: string;
  onClose: () => void;
}

export default function AnnouncementPdfModal({
  attachment,
  announcementTitle,
  onClose,
}: AnnouncementPdfModalProps) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleDownload = () => {
    setIsDownloaded(true);
    // Create a real downloadable text file representation
    const textContent = `=====================================================
GREENWOOD INTERNATIONAL SCHOOL - OFFICIAL DOCUMENT
=====================================================
Document: ${attachment.name}
Reference: ${announcementTitle}
File Size: ${attachment.size}
Pages: ${attachment.pages || 8}
Date: Academic Session 2025–26

Description:
${attachment.previewSummary || 'Official school communication document.'}

--- GREENWOOD INTERNATIONAL SCHOOL ARCHIVE ---
Learn • Grow • Belong
`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name.replace('.pdf', '-official.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setIsDownloaded(false);
    }, 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200">
        
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-[#fbfcfd]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <FileText className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-neutral-900 truncate">
                {attachment.name}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 truncate">
                {attachment.size} • {attachment.pages || 6} Pages • PDF Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer transition"
              title="Print document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Document Controls Bar */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#f4f5f7] border-b border-neutral-200 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[11px]">Page 1 of {attachment.pages || 6}</span>
            <span className="text-neutral-300">|</span>
            <span className="text-[11px] text-neutral-500">Greenwood Verified</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(75, prev - 15))}
              className="p-1 hover:bg-neutral-200 rounded text-neutral-600 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(150, prev + 15))}
              className="p-1 hover:bg-neutral-200 rounded text-neutral-600 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Document Body Simulation */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#8e95a2]/20 flex justify-center">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-full max-w-[420px] bg-white rounded-lg shadow-md p-6 sm:p-7 text-neutral-900 border border-neutral-200 min-h-[480px] flex flex-col justify-between transition-transform duration-150"
          >
            {/* Document Header */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                    GW
                  </div>
                  <div>
                    <h5 className="text-[12px] font-bold tracking-tight uppercase">
                      Greenwood International School
                    </h5>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-widest">
                      Affiliation Code: GW-2025-IND
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold text-red-600 border border-red-200 bg-red-50 px-2 py-0.5 rounded">
                    OFFICIAL
                  </div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">Oct 2025</div>
                </div>
              </div>

              {/* Document Subject */}
              <div className="mb-4">
                <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold mb-0.5">
                  Circular Ref: GW/ADM/2025/104
                </div>
                <h3 className="text-[16px] font-bold text-neutral-900 leading-snug">
                  {attachment.previewTitle || attachment.name}
                </h3>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Regarding: {announcementTitle}
                </div>
              </div>

              {/* Document Content text */}
              <div className="space-y-2.5 text-[11px] text-neutral-700 leading-relaxed border-t border-neutral-100 pt-3">
                <p>
                  {attachment.previewSummary ||
                    'This document has been reviewed and approved by the academic council for immediate compliance.'}
                </p>
                <div className="bg-[#f8f9fa] rounded-lg p-2.5 border border-neutral-200/80 text-[10px] space-y-1">
                  <div className="font-semibold text-neutral-800">
                    Mandatory Guidelines:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-neutral-600">
                    <li>Applicable to all registered students and instructional staff.</li>
                    <li>Authorized for electronic access and parent portal recordkeeping.</li>
                    <li>Any discrepancy must be submitted to the administration desk.</li>
                  </ul>
                </div>
                <p className="text-[10.5px] text-neutral-600 italic">
                  "Excellence, Integrity, and Service" — Greenwood International Board of Education.
                </p>
              </div>
            </div>

            {/* Document Signature footer */}
            <div className="border-t border-neutral-200 pt-3 mt-6 flex items-end justify-between">
              <div>
                <div className="text-[9px] text-neutral-400 uppercase">Authorized Signatory</div>
                <div className="font-serif italic text-[12px] font-semibold text-neutral-800">
                  Dr. Radhika Sen
                </div>
                <div className="text-[9px] text-neutral-500">Principal & Head of School</div>
              </div>

              <div className="w-14 h-14 rounded-full border border-dashed border-neutral-400 flex flex-col items-center justify-center text-[7px] text-neutral-400 text-center leading-tight">
                <span>OFFICIAL</span>
                <span className="font-bold">SEAL</span>
                <span>2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-4 py-3 bg-white border-t border-neutral-100 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            {attachment.name} ({attachment.size})
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 cursor-pointer transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-1.5 text-[12px] font-medium text-white bg-black hover:bg-neutral-800 rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              {isDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                  <span>Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
