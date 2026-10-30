/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  FileText,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  X,
  Check,
} from 'lucide-react';
import StaffStatusBar from './components/StaffStatusBar';
import StaffBottomNav from './components/StaffBottomNav';
import { StaffDocument, getStaffDocuments, downloadStaffDocument } from './services/documentsService';

interface MyDocumentsScreenProps {
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateMyRequests: () => void;
  onNavigateProfile: () => void;
}

export default function MyDocumentsScreen({
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateMyRequests,
  onNavigateProfile,
}: MyDocumentsScreenProps) {
  const [documents] = useState<StaffDocument[]>(() => getStaffDocuments('T001'));
  const [viewingDoc, setViewingDoc] = useState<StaffDocument | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const getStatusBadge = (status: StaffDocument['status']) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803d] bg-[#ecfdf5] border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Approved</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803d] bg-[#ecfdf5] border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Completed</span>
          </span>
        );
      case 'Issued':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563eb] bg-[#eff6ff] border border-blue-200 px-2.5 py-0.5 rounded-full">
            <Check className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Issued</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b45309] bg-[#fffbeb] border border-amber-200 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const handleDownload = (doc: StaffDocument) => {
    try {
      if (doc.status === 'Pending') {
        showToast('Document is pending issuance and cannot be downloaded yet.');
        return;
      }
      downloadStaffDocument(doc);
      showToast(`${doc.title} downloaded successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Download failed.');
    }
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

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-4 space-y-3.5">
        
        {/* Header matching reference: [Chevron back] [My Documents / Official documents and employment records] */}
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
              My Documents
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
              Official documents and employment records
            </p>
          </div>
        </div>

        {/* Document Cards Stack */}
        <div className="space-y-3">
          {documents.map((doc) => {
            const isPending = doc.status === 'Pending';
            return (
              <div
                key={doc.id}
                className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5 hover:border-neutral-300 transition"
              >
                {/* Top Row: Issued Date & Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-medium text-[#717684]">
                    Issued: {doc.issuedDate}
                  </span>
                  <div>{getStatusBadge(doc.status)}</div>
                </div>

                {/* Middle Row: Document Icon, Title & Description */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#f0f2f5] flex items-center justify-center shrink-0 text-neutral-900">
                    <FileText className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] font-bold text-neutral-900 truncate">
                      {doc.title}
                    </h3>
                    <p className="text-[12px] text-[#6b7280] mt-0.5 truncate">
                      {doc.description}
                    </p>
                  </div>
                </div>

                {/* Action Buttons Row: View Document (Left) & Download PDF (Right, Black) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setViewingDoc(doc)}
                    className="py-2.5 px-3 bg-[#f8f9fa] hover:bg-[#f1f3f5] text-neutral-900 font-semibold text-[12px] rounded-xl border border-neutral-200/80 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98]"
                  >
                    <Eye className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
                    <span>View Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={isPending}
                    className={`py-2.5 px-3 font-semibold text-[12px] rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] ${
                      isPending
                        ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                        : 'bg-black hover:bg-neutral-800 text-white'
                    }`}
                  >
                    <Download className="w-4 h-4 stroke-[1.8]" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Go to My Requests Full-Width Button matching reference */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onNavigateMyRequests}
            className="w-full py-3.5 px-4 bg-[#f8f9fa] hover:bg-[#f1f3f5] text-neutral-900 font-bold text-[13px] rounded-2xl border border-neutral-200/80 transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99]"
          >
            <FileText className="w-4.5 h-4.5 text-neutral-800 stroke-[1.8]" />
            <span>Go to My Requests</span>
          </button>
        </div>

      </div>

      {/* Shared 5-Button Bottom Navigation */}
      <StaffBottomNav
        activeTab="My Requests"
        onNavigateHome={onNavigateHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateMyRequests={onNavigateMyRequests}
        onNavigateProfile={onNavigateProfile}
      />

      {/* VIEW DOCUMENT PREVIEW MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900">
                  <FileText className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="font-bold text-[14.5px] text-neutral-900 leading-tight">
                    {viewingDoc.title}
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    Issued: {viewingDoc.issuedDate} ({viewingDoc.fileSize})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="text-neutral-400 hover:text-black p-1 cursor-pointer rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content Box */}
            <div className="bg-[#f8f9fa] border border-neutral-200/80 rounded-2xl p-4 text-[12px] text-neutral-800 font-mono whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto">
              {viewingDoc.fileContent || viewingDoc.description}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="flex-1 py-2.5 text-[12px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownload(viewingDoc);
                  setViewingDoc(null);
                }}
                disabled={viewingDoc.status === 'Pending'}
                className={`flex-1 py-2.5 text-[12px] font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  viewingDoc.status === 'Pending'
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
