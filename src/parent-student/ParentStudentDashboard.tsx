/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  CreditCard,
  Award,
  ChevronRight,
  Download,
  Send,
  ShieldCheck,
  CheckCircle,
  Clock,
  LogOut,
  User,
  AlertCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import VerifiedCheckBadge from '../components/VerifiedCheckBadge';
import CertificateVerificationModal, { CertificateRecord } from './CertificateVerificationModal';
import RequestCompletionModal from './RequestCompletionModal';
import FeePaymentSuccessModal from './FeePaymentSuccessModal';
import {
  getParentLeaveRequests,
  addParentLeaveRequest,
  ParentLeaveRequest,
} from '../services/requestsService';
import {
  addDaysIST,
  formatISTDateKey,
  formatISTDateMedium,
  formatISTDateShort,
  formatISTDateTime,
  getNow,
  useISTCurrentDate,
} from '../utils/dateTimeUtils';

export interface ParentStudentDashboardProps {
  onLogout: () => void;
  onSwitchToStaffPortal?: () => void;
}

const SAMPLE_CERTIFICATES: CertificateRecord[] = [
  {
    id: 'cert-01',
    title: 'Bonafide Student Certificate',
    type: 'Bonafide',
    studentName: 'Arjun Mehta',
    grade: 'Grade 5 - Section A',
    admissionNo: 'GIS-2024-503',
    issuedDate: '12 Oct 2026',
    verificationHash: 'VRF-GIS-8942-019',
    signatory: 'Dr. Anita Roy',
    signatoryTitle: 'Principal, Greenwood International',
    description:
      'This is to certify that Arjun Mehta, son of Mr. Rajesh Mehta, is a bonafide student of Grade 5 - Section A at Greenwood International School during academic year 2026-2027.',
  },
  {
    id: 'cert-02',
    title: 'Academic Excellence in Mathematics',
    type: 'Merit',
    studentName: 'Arjun Mehta',
    grade: 'Grade 5 - Section A',
    admissionNo: 'GIS-2024-503',
    issuedDate: '18 Oct 2026',
    verificationHash: 'VRF-GIS-9241-118',
    signatory: 'Mrs. Priya Sharma',
    signatoryTitle: 'Head of Mathematics Department',
    description:
      'Awarded for exemplary academic achievement, problem solving excellence, and securing top percentile rank in Term 1 Mathematics Assessments.',
  },
  {
    id: 'cert-03',
    title: 'Good Conduct & Character Certificate',
    type: 'Conduct',
    studentName: 'Arjun Mehta',
    grade: 'Grade 5 - Section A',
    admissionNo: 'GIS-2024-503',
    issuedDate: '05 Sep 2026',
    verificationHash: 'VRF-GIS-7310-093',
    signatory: 'Dr. Anita Roy',
    signatoryTitle: 'Principal, Greenwood International',
    description:
      'Certified that Arjun Mehta has maintained an exemplary disciplinary record, positive peer conduct, and high civic responsibility on school campus.',
  },
];

type ActiveTab = 'OVERVIEW' | 'CERTIFICATES' | 'FEES' | 'REQUESTS';

export default function ParentStudentDashboard({
  onLogout,
  onSwitchToStaffPortal,
}: ParentStudentDashboardProps) {
  const { statusBarTime, todayDateKey } = useISTCurrentDate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('OVERVIEW');

  // Modal states
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRecord | null>(null);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(34500);
  const [paymentTerm, setPaymentTerm] = useState('Term 2 Tuition & Activity Fee');
  const [paymentTimestamp, setPaymentTimestamp] = useState(() => formatISTDateTime());

  // Request flow states
  const [showRequestCompletionModal, setShowRequestCompletionModal] = useState(false);
  const [newRequestData, setNewRequestData] = useState<{
    title: string;
    category: string;
    requestId: string;
    submittedAt: string;
    notes?: string;
  } | null>(null);

  // Leave Form state
  const [leaveReason, setLeaveReason] = useState('Medical appointment and dental follow-up');
  const [leaveDays, setLeaveDays] = useState(() => {
    const now = getNow();
    const tomorrow = addDaysIST(now, 1);
    return `2 Days (${formatISTDateShort(now)} – ${formatISTDateMedium(tomorrow)})`;
  });
  // Strict check: standard form checkbox (NOT badge)
  const [parentConsentChecked, setParentConsentChecked] = useState(true);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Live parent leave requests shared with Staff Portal
  const [parentLeaveRequests, setParentLeaveRequests] = useState<ParentLeaveRequest[]>(() => {
    return getParentLeaveRequests();
  });

  React.useEffect(() => {
    const handleSync = () => {
      setParentLeaveRequests(getParentLeaveRequests());
    };
    window.addEventListener('offsleek_parent_leave_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('offsleek_parent_leave_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Fee state
  const [feePaid, setFeePaid] = useState(false);

  const handlePayFee = () => {
    setPaymentTimestamp(formatISTDateTime());
    setFeePaid(true);
    setShowPaymentSuccessModal(true);
  };

  const handleSubmitLeaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentConsentChecked) return;

    setIsSubmittingLeave(true);
    setTimeout(() => {
      setIsSubmittingLeave(false);
      const now = getNow();
      const fromKey = formatISTDateKey(now);
      const toKey = formatISTDateKey(addDaysIST(now, 1));
      const newRecord = addParentLeaveRequest({
        parentId: 'p-mehta',
        parentName: 'Rajesh Mehta',
        parentInitials: 'RM',
        parentColor: '#059669',
        studentId: 's-mehta-03',
        studentName: 'Arjun Mehta',
        classSection: 'Grade 5 - A',
        rollNo: '03',
        dates: leaveDays,
        fromDate: fromKey,
        toDate: toKey,
        durationDays: 2,
        reason: leaveReason,
        message: leaveReason,
      });

      setParentLeaveRequests(getParentLeaveRequests());

      setNewRequestData({
        title: 'Student Leave Application',
        category: 'Attendance & Leave',
        requestId: newRecord.id,
        submittedAt: newRecord.submittedOn,
        notes: `${leaveDays} • ${leaveReason}`,
      });
      setShowRequestCompletionModal(true);
    }, 400);
  };

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Top Status Bar with Dynamic Island */}
      <div className="shrink-0 bg-white z-30 pt-3 pb-2 px-4 sm:px-6 border-b border-neutral-100 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-900 text-[13px] font-semibold tracking-tight">
          <span className="w-10 sm:w-12">{statusBarTime}</span>
          
          <div className="w-[96px] sm:w-[105px] h-[26px] sm:h-[28px] bg-black rounded-full flex items-center justify-between px-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
            <div className="w-2 h-2 rounded-full bg-[#111] border border-neutral-800" />
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 w-10 sm:w-12 justify-end">
            <div className="flex items-end gap-[2px] h-3">
              <div className="w-[3px] h-1 bg-neutral-900 rounded-[0.5px]" />
              <div className="w-[3px] h-1.5 bg-neutral-900 rounded-[0.5px]" />
              <div className="w-[3px] h-2 bg-neutral-900 rounded-[0.5px]" />
              <div className="w-[3px] h-2.5 bg-neutral-900 rounded-[0.5px]" />
            </div>
            <svg className="w-3.5 h-3.5 fill-neutral-900" viewBox="0 0 24 24">
              <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 3.5c3.73 0 7.14 1.43 9.72 3.8L12 19.3 2.28 11.3C4.86 8.93 8.27 7.5 12 7.5z" />
            </svg>
            <div className="w-[20px] sm:w-[21px] h-[10px] border border-neutral-900 rounded-[3px] p-[1px] flex items-center">
              <div className="h-full w-[80%] bg-neutral-900 rounded-[1.5px]" />
            </div>
          </div>
        </div>

        {/* Portal Branding and Role Switcher Row */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-2">
            <img
              src="/assets/logo-ring.png"
              alt="OFFSLEEK"
              className="w-5 h-5 object-contain"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-black tracking-tight text-neutral-950 uppercase">
                OFFSLEEK
              </span>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                PARENT–STUDENT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToStaffPortal && (
              <button
                type="button"
                onClick={onSwitchToStaffPortal}
                className="text-[10.5px] font-semibold text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                Staff App
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 transition cursor-pointer rounded-lg hover:bg-neutral-100"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3.5 pb-4 space-y-4">
        
        {/* Student Profile Card with Verified Badge */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200">
              <img
                src="/assets/students/student-03-arjun.png"
                alt="Arjun Mehta"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/test-avatar.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[15px] font-bold text-neutral-950 tracking-tight">
                  Arjun Mehta
                </h2>
                {/* Official Verified Student Badge */}
                <VerifiedCheckBadge
                  size="xs"
                  alt="Verified Student Identity"
                  title="Officially Enrolled & Verified Student"
                />
              </div>
              <div className="text-[11.5px] text-neutral-500 font-medium mt-0.5">
                Grade 5 - A • Roll #03 • Greenwood Int.
              </div>
              <div className="text-[10px] text-neutral-400 font-medium">
                Parent: Rajesh Mehta (Father)
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Active
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CERTIFICATES')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              activeTab === 'CERTIFICATES'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Certificates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FEES')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              activeTab === 'FEES'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Fees
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
              activeTab === 'REQUESTS'
                ? 'bg-white text-neutral-950 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Requests
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white rounded-2xl p-3 border border-neutral-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
                  <span>Attendance</span>
                  <VerifiedCheckBadge size="xs" alt="Verified Record" />
                </div>
                <div className="text-[20px] font-black text-neutral-950 mt-1 leading-none">
                  96.4%
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                  Verified by Class Teacher
                </div>
              </div>

              <div className="bg-white rounded-2xl p-3 border border-neutral-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
                  <span>Term 1 Result</span>
                  <VerifiedCheckBadge size="xs" alt="Verified Marks" />
                </div>
                <div className="text-[20px] font-black text-neutral-950 mt-1 leading-none">
                  A+ (92%)
                </div>
                <div className="text-[10px] text-neutral-500 font-medium mt-1">
                  Marks Published & Signed
                </div>
              </div>
            </div>

            {/* School Fee Quick Action Banner */}
            <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                    ACADEMIC FEES
                  </span>
                  {feePaid ? (
                    <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <VerifiedCheckBadge size="xs" />
                      Paid & Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Due 31 Oct
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <div className="text-[22px] font-black tracking-tight leading-none">
                    {feePaid ? '₹0.00' : '₹34,500.00'}
                  </div>
                  <div className="text-[11.5px] text-neutral-300 mt-1">
                    {feePaid ? 'Term 2 Fees Fully Cleared' : 'Term 2 Tuition & Activity Fee'}
                  </div>
                </div>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePayFee}
                    className="bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-[12px] py-2 px-3.5 rounded-xl transition cursor-pointer flex items-center justify-center shadow-xs"
                  >
                    <span>{feePaid ? 'View Payment Receipt' : 'Pay Now (GPay / UPI)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPaymentSuccessModal(true)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-medium py-2 px-2.5 rounded-xl transition cursor-pointer border border-neutral-700"
                  >
                    Test Animation
                  </button>
                </div>
              </div>
            </div>

            {/* Verified Digital Credentials Preview */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-neutral-900" />
                  <span className="text-[12.5px] font-bold text-neutral-950">
                    Official Digital Credentials
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('CERTIFICATES')}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer"
                >
                  View All (3)
                </button>
              </div>

              {SAMPLE_CERTIFICATES.slice(0, 2).map((cert) => (
                <div
                  key={cert.id}
                  onClick={() => setSelectedCertificate(cert)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <VerifiedCheckBadge size="sm" alt="Verified Certificate" />
                    <div>
                      <div className="text-[12px] font-bold text-neutral-950">
                        {cert.title}
                      </div>
                      <div className="text-[10.5px] text-neutral-500">
                        Issued {cert.issuedDate} • Ref: {cert.verificationHash}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 2: CERTIFICATES & CREDENTIALS */}
        {activeTab === 'CERTIFICATES' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-3.5 border border-neutral-200/80 shadow-2xs">
              <div className="flex items-center gap-2 text-neutral-900 font-bold text-[13px]">
                <VerifiedCheckBadge size="xs" />
                <span>Greenwood Digital Credential Registry</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                All certificates carry digital cryptographic seals verified directly by school administration.
              </p>
            </div>

            <div className="space-y-2.5">
              {SAMPLE_CERTIFICATES.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-3 hover:border-neutral-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-neutral-100 text-neutral-900">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            {cert.type}
                          </span>
                          <VerifiedCheckBadge size="xs" alt="Verified" />
                        </div>
                        <h3 className="text-[13.5px] font-bold text-neutral-950 mt-0.5">
                          {cert.title}
                        </h3>
                        <p className="text-[11px] text-neutral-500 font-medium">
                          Issued on {cert.issuedDate} by {cert.signatoryTitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-neutral-400">
                      Hash: {cert.verificationHash}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedCertificate(cert)}
                      className="bg-black hover:bg-neutral-800 text-white font-semibold text-[11.5px] px-3 py-1.5 rounded-lg flex items-center justify-center transition cursor-pointer"
                    >
                      <span>Verify & View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FEES */}
        {activeTab === 'FEES' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            
            {/* Payment Summary */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-[12.5px] font-bold text-neutral-950">
                  School Fee Ledger (2026-27)
                </span>
                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  STUDENT ID: GIS-503
                </span>
              </div>

              {/* Term 2 Card */}
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-neutral-950">Term 2 School Fee</div>
                    <div className="text-[11px] text-neutral-500">Tuition, Labs, Sports & Smart Classroom</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold text-neutral-950">₹34,500</div>
                    {feePaid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <VerifiedCheckBadge size="xs" />
                        Verified Paid
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700">Due 31 Oct</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200/50 flex items-center justify-between">
                  <span className="text-[10.5px] text-neutral-500">Due Date: 31st October 2026</span>
                  <button
                    type="button"
                    onClick={handlePayFee}
                    className="bg-black hover:bg-neutral-800 text-white font-semibold text-[11.5px] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{feePaid ? 'View Verified Receipt' : 'Pay Now'}</span>
                  </button>
                </div>
              </div>

              {/* Term 1 Card (Already Paid & Verified) */}
              <div className="p-3.5 rounded-xl bg-white border border-neutral-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-neutral-950">Term 1 School Fee</div>
                    <div className="text-[11px] text-neutral-500">Paid on 15 Jul 2026 • Receipt #RCP-09214</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-bold text-neutral-950">₹34,500</div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <VerifiedCheckBadge size="xs" />
                      Verified Paid
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-neutral-400">TXN: UPI/2941094/hdfc</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentAmount(34500);
                      setPaymentTerm('Term 1 Tuition & Activity Fee');
                      setShowPaymentSuccessModal(true);
                    }}
                    className="text-neutral-700 hover:text-black font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Receipt</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: REQUESTS & SERVICES */}
        {activeTab === 'REQUESTS' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            
            {/* New Leave Application Form */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-[13px] font-bold text-neutral-950">
                  Submit Student Leave Request
                </span>
                <span className="text-[10px] font-semibold text-neutral-500">
                  CLASS 5-A
                </span>
              </div>

              <form onSubmit={handleSubmitLeaveRequest} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Leave Duration & Dates
                  </label>
                  <input
                    type="text"
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-[12px] text-neutral-900 focus:outline-none focus:border-neutral-900"
                    placeholder="e.g. 2 Days (26 Oct – 27 Oct 2026)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Reason for Absence
                  </label>
                  <textarea
                    rows={2}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-[12px] text-neutral-900 focus:outline-none focus:border-neutral-900 resize-none"
                    placeholder="Provide details for class teacher"
                  />
                </div>

                {/* Standard HTML Checkbox Control (Strictly preserved, NOT replaced with badge per instruction 2) */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="parent-consent-check"
                    checked={parentConsentChecked}
                    onChange={(e) => setParentConsentChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                  <label
                    htmlFor="parent-consent-check"
                    className="text-[11px] text-neutral-600 leading-tight cursor-pointer select-none"
                  >
                    I certify that this leave request is authorized by parent/guardian Rajesh Mehta.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLeave || !parentConsentChecked}
                  className="w-full bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-semibold text-[12.5px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  {isSubmittingLeave ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Request (Trigger Verified Flow)</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Past Request Log with Verified Badges */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs space-y-2.5">
              <span className="text-[12px] font-bold text-neutral-950">
                Recent Request History
              </span>

              <div className="space-y-2">
                {/* Live Shared Parent Leave Requests */}
                {parentLeaveRequests
                  .filter((req) => req.studentName.includes('Arjun') || req.parentName.includes('Rajesh') || req.classSection.includes('5'))
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-[12px] font-bold text-neutral-950">
                            Leave Application ({req.reason})
                          </div>
                          <div className="text-[10.5px] text-neutral-500">
                            {req.dates} • Req #{req.id}
                          </div>
                        </div>
                        {req.status === 'Approved' ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <VerifiedCheckBadge size="xs" alt="Approved & Verified" />
                            <span>Approved</span>
                          </div>
                        ) : req.status === 'Rejected' ? (
                          <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            <span>Rejected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Approval</span>
                          </div>
                        )}
                      </div>

                      {req.teacherRemarks && (
                        <div className="text-[10.5px] bg-white border border-neutral-200/80 rounded-lg p-2 text-neutral-700 flex items-start gap-1.5">
                          <span className="font-semibold text-neutral-900 shrink-0">Teacher Note:</span>
                          <span className="text-neutral-600">{req.teacherRemarks}</span>
                        </div>
                      )}
                    </div>
                  ))}

                {/* ID Card Re-issuance Record */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[12px] font-bold text-neutral-950">
                      ID Card Re-issuance Request
                    </div>
                    <div className="text-[10.5px] text-neutral-500">
                      Req #REQ-2026-0814 • 14 Oct 2026
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <VerifiedCheckBadge size="xs" alt="Approved & Verified" />
                    <span>Completed</span>
                  </div>
                </div>

                {/* Bonafide Certificate Record */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[12px] font-bold text-neutral-950">
                      Bonafide Certificate Request
                    </div>
                    <div className="text-[10.5px] text-neutral-500">
                      Req #REQ-2026-0418 • 10 Oct 2026
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <VerifiedCheckBadge size="xs" alt="Issued & Verified" />
                    <span>Issued</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Bottom Home Indicator Bar */}
      <div className="shrink-0 bg-white border-t border-neutral-100 py-2 flex flex-col items-center">
        <div className="w-28 h-1 bg-black rounded-full" />
      </div>

      {/* MODAL 1: Official Certificate Verification Viewer */}
      {selectedCertificate && (
        <CertificateVerificationModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          onDownloadPdf={() => {
            alert(`Certificate PDF for "${selectedCertificate.title}" generated with verified electronic seal.`);
          }}
        />
      )}

      {/* MODAL 2: Fee Payment Success Modal (PhonePe / GPay Style with Animated Badge) */}
      {showPaymentSuccessModal && (
        <FeePaymentSuccessModal
          amount={paymentAmount}
          transactionId="TXN-GW-982410294"
          studentName="Arjun Mehta"
          grade="Grade 5 - A"
          term={paymentTerm}
          date={paymentTimestamp}
          onClose={() => setShowPaymentSuccessModal(false)}
          onDownloadReceipt={() => {
            alert('Digital fee payment receipt downloaded.');
          }}
        />
      )}

      {/* MODAL 3: Request Submission & Completion Modal with Animated Badge */}
      {showRequestCompletionModal && newRequestData && (
        <RequestCompletionModal
          title={newRequestData.title}
          category={newRequestData.category}
          requestId={newRequestData.requestId}
          submittedAt={newRequestData.submittedAt}
          notes={newRequestData.notes}
          onClose={() => setShowRequestCompletionModal(false)}
          onViewAllRequests={() => setActiveTab('REQUESTS')}
        />
      )}

    </div>
  );
}
