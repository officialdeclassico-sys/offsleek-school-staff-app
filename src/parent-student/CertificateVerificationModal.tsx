/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Download, ShieldCheck, Award, QrCode, FileText, CheckCircle2 } from 'lucide-react';
import VerifiedCheckBadge from '../components/VerifiedCheckBadge';

export interface CertificateRecord {
  id: string;
  title: string;
  type: 'Bonafide' | 'Merit' | 'Transfer' | 'Conduct';
  studentName: string;
  grade: string;
  admissionNo: string;
  issuedDate: string;
  verificationHash: string;
  signatory: string;
  signatoryTitle: string;
  description: string;
}

export interface CertificateVerificationModalProps {
  certificate: CertificateRecord;
  onClose: () => void;
  onDownloadPdf?: () => void;
}

export default function CertificateVerificationModal({
  certificate,
  onClose,
  onDownloadPdf,
}: CertificateVerificationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-neutral-900 font-sans">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <VerifiedCheckBadge size="sm" alt="Verified Official Certificate" />
            <span className="text-[12px] font-bold tracking-wider text-neutral-900 uppercase">
              Official Digital Credential
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Preview Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
          
          {/* Certificate Frame */}
          <div className="relative border-2 border-neutral-800 rounded-2xl p-4.5 bg-gradient-to-b from-[#fafaf9] to-white shadow-xs">
            
            {/* Top School Header */}
            <div className="text-center pb-3 border-b border-neutral-200">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <img
                  src="/assets/logo-ring.png"
                  alt="Greenwood"
                  className="w-5 h-5 object-contain"
                />
                <span className="font-extrabold text-[13px] tracking-tight text-neutral-950 uppercase font-sans">
                  GREENWOOD INTERNATIONAL SCHOOL
                </span>
              </div>
              <div className="text-[8.5px] tracking-[0.25em] text-neutral-500 font-medium uppercase">
                ACADEMIC CREDENTIAL VERIFICATION SYSTEM
              </div>
            </div>

            {/* Certificate Title & Student */}
            <div className="py-4 text-center space-y-1">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">
                {certificate.type} CERTIFICATE
              </span>
              <h3 className="text-[17px] font-bold text-neutral-950 tracking-tight">
                {certificate.title}
              </h3>
              <p className="text-[11.5px] text-neutral-600 leading-relaxed pt-1">
                This is to officially certify that
              </p>
              <div className="text-[16px] font-extrabold text-neutral-950 tracking-tight pt-0.5 pb-0.5 underline decoration-neutral-300 underline-offset-4">
                {certificate.studentName}
              </div>
              <p className="text-[11.5px] text-neutral-600">
                Grade: <strong>{certificate.grade}</strong> • Admission No: <strong className="font-mono">{certificate.admissionNo}</strong>
              </p>
              <p className="text-[11px] text-neutral-600 pt-1.5 leading-snug px-1 text-justify sm:text-center">
                {certificate.description}
              </p>
            </div>

            {/* Official Verification Seal with Custom Glossy Badge */}
            <div className="pt-3 pb-2 border-t border-dashed border-neutral-300 flex items-center justify-between">
              
              {/* Seal Stamp */}
              <div className="flex items-center gap-2.5 bg-neutral-100/80 px-2.5 py-1.5 rounded-xl border border-neutral-200">
                <VerifiedCheckBadge size="md" alt="Digital Signature Verified" />
                <div className="text-left">
                  <div className="text-[9.5px] font-bold text-neutral-950 tracking-tight leading-tight">
                    AUTHENTICATED
                  </div>
                  <div className="text-[8px] text-neutral-500 uppercase tracking-wider">
                    School Seal Verified
                  </div>
                </div>
              </div>

              {/* Signatory Info */}
              <div className="text-right">
                <div className="text-[10.5px] font-bold text-neutral-950">
                  {certificate.signatory}
                </div>
                <div className="text-[8.5px] text-neutral-500">
                  {certificate.signatoryTitle}
                </div>
              </div>

            </div>

            {/* Cryptographic hash & issue date */}
            <div className="pt-2 text-[8.5px] text-neutral-500 flex items-center justify-between border-t border-neutral-100 font-mono">
              <span>Ref: {certificate.verificationHash}</span>
              <span>Issued: {certificate.issuedDate}</span>
            </div>

          </div>

          {/* Verification Status Banner */}
          <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200/80 flex items-start gap-3">
            <VerifiedCheckBadge size="sm" className="mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <div className="font-bold text-[12px] text-neutral-950">
                Certificate Status: Active & Authenticated
              </div>
              <p className="text-[11px] text-neutral-600 leading-snug">
                This document is secured on OFFSLEEK School OS. Third-party institutions can verify its authenticity using the reference code.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={onDownloadPdf}
            className="w-full bg-black hover:bg-neutral-800 text-white font-semibold text-[13px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Download className="w-4 h-4" />
            <span>Download Verified Certificate PDF</span>
          </button>

        </div>

      </div>
    </div>
  );
}
