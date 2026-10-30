/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  BookOpen,
  Globe,
  Lock,
  HelpCircle,
  Bell,
  Home,
  Megaphone,
  Check,
  X,
  Shield,
} from 'lucide-react';
import StaffBottomNav from './components/StaffBottomNav';
import StaffStatusBar from './components/StaffStatusBar';
import { getAssetUrl } from './utils/assetUtils';

interface StaffProfileScreenProps {
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateMyRequests?: () => void;
  onLogout: () => void;
  onBack?: () => void;
}

type ProfileSubView =
  | 'MAIN'
  | 'PERSONAL_INFO'
  | 'APP_SETTINGS'
  | 'ASSIGNED_CLASSES'
  | 'DOCUMENTS';

export default function StaffProfileScreen({
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateMyRequests,
  onLogout,
  onBack,
}: StaffProfileScreenProps) {
  const [subView, setSubView] = useState<ProfileSubView>('MAIN');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings modals
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Authenticated Staff Profile Data (Read-Only)
  const staffData = {
    name: 'Ms. Priya Sharma',
    employeeId: 'T001',
    designation: 'Class Teacher',
    assignedClass: 'Grade 5 - A',
    email: 'priya.sharma@greenwood.edu.in',
    phone: '+91 98765 43210',
    department: 'Primary School',
    role: 'Class Teacher',
    joiningDate: '12 June 2024',
    subjectsAssigned: 'Mathematics, Science',
    avatar: getAssetUrl('/assets/priya-sharma.png'),
  };

  const assignedClassesList = [
    {
      classSection: 'Grade 5 - A',
      role: 'Class Teacher & Subject Teacher',
      subjects: ['Mathematics', 'Science'],
      studentsCount: 38,
      room: 'Room 204 (Primary Block)',
    },
    {
      classSection: 'Grade 5 - B',
      role: 'Subject Teacher',
      subjects: ['English'],
      studentsCount: 40,
      room: 'Room 206 (Primary Block)',
    },
    {
      classSection: 'Grade 6 - A',
      role: 'Subject Teacher',
      subjects: ['Mathematics'],
      studentsCount: 36,
      room: 'Room 302 (Middle Block)',
    },
  ];

  const authorizedDocumentsList = [
    {
      id: 'doc-01',
      title: 'Teacher Appointment Letter',
      refNo: 'GW/HR/2024/082',
      date: '12 June 2024',
      status: 'Verified & Active',
    },
    {
      id: 'doc-02',
      title: 'Faculty Identity & Background Clearance',
      refNo: 'GW/SEC/2024/114',
      date: '15 June 2024',
      status: 'Cleared',
    },
    {
      id: 'doc-03',
      title: 'Academic Code of Professional Conduct 2025–26',
      refNo: 'GW/ACAD/2025/009',
      date: '01 July 2025',
      status: 'Acknowledged',
    },
    {
      id: 'doc-04',
      title: 'Staff Medical & Health Insurance Policy Card',
      refNo: 'GW/MED/2025/443',
      date: '01 August 2025',
      status: 'Active',
    },
  ];

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-4 right-4 z-50 bg-neutral-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1 pb-3 space-y-3">
        
        {/* =================================================================== */}
        {/* VIEW 1: MAIN PROFILE SCREEN (Exact Replica of Left Reference Image) */}
        {/* =================================================================== */}
        {subView === 'MAIN' && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Profile Title & Subtitle with Standardized Back Chevron */}
            <div className="flex items-start gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => (onBack ? onBack() : onNavigateHome())}
                className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] sm:text-[24px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Profile
                </h2>
                <p className="text-[12px] sm:text-[12.5px] text-neutral-500 font-normal mt-0.5">
                  View your information and app settings
                </p>
              </div>
            </div>

            {/* Staff Profile Header Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex items-center gap-3">
              <img
                src={staffData.avatar}
                alt={staffData.name}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover shrink-0 border border-neutral-100 shadow-2xs"
              />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] sm:text-[15px] font-bold text-neutral-900 truncate">
                    {staffData.name}
                  </span>
                  <img
                    src={getAssetUrl('/assets/Dark Verified Check Badge.png')}
                    alt="Verified Staff"
                    className="w-4 h-4 object-contain shrink-0"
                    title="Verified Faculty"
                  />
                </div>
                <div className="text-[11.5px] text-[#6b7280] font-normal mt-0.5 truncate">
                  {staffData.designation}
                </div>
                <div className="text-[11px] text-[#8e95a2] font-normal mt-0.5 truncate">
                  {staffData.assignedClass} &nbsp;|&nbsp; Employee ID: {staffData.employeeId}
                </div>
              </div>
            </div>

            {/* Menu Options List */}
            <div className="space-y-2 pt-0.5">
              
              {/* Option 1: Personal Information */}
              <div
                onClick={() => setSubView('PERSONAL_INFO')}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      Personal Information
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      View your details assigned by admin
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </div>

              {/* Option 2: Assigned Classes */}
              <div
                onClick={() => setSubView('ASSIGNED_CLASSES')}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      Assigned Classes
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      View your classes and subjects
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </div>

              {/* Option 3: Documents */}
              <div
                onClick={() => setSubView('DOCUMENTS')}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      Documents
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      View official documents shared by school
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </div>

              {/* Option 4: App Settings */}
              <div
                onClick={() => setSubView('APP_SETTINGS')}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      App Settings
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      Language, password and more
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </div>

              {/* Option 5: Logout Action Card */}
              <div
                onClick={() => setShowLogoutConfirm(true)}
                className="bg-white border border-[#e5e7eb] hover:bg-neutral-50 rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-3 cursor-pointer transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] text-neutral-800 border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <LogOut className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                    Logout
                  </div>
                  <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                    Sign out from your account
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: PERSONAL INFORMATION (Exact Replica of Center Reference Image) */}
        {/* =================================================================== */}
        {subView === 'PERSONAL_INFO' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Standardized Header */}
            <div className="flex items-start gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setSubView('MAIN')}
                className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
                aria-label="Back to Profile"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[20px] sm:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Personal Information
                </h2>
                <p className="text-[11.5px] sm:text-[12px] text-neutral-500 font-normal mt-0.5">
                  Your information assigned by the administrative team
                </p>
              </div>
            </div>

            {/* Staff Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex items-center gap-3">
              <img
                src={staffData.avatar}
                alt={staffData.name}
                className="w-12 h-12 rounded-full object-cover shrink-0 border border-neutral-100"
              />
              <div className="min-w-0 leading-tight flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold text-neutral-900 truncate">
                    {staffData.name}
                  </span>
                  <img
                    src={getAssetUrl('/assets/Dark Verified Check Badge.png')}
                    alt="Verified Staff"
                    className="w-3.5 h-3.5 object-contain shrink-0"
                    title="Verified Faculty"
                  />
                </div>
                <div className="text-[11px] text-[#6b7280] mt-0.5 truncate">
                  {staffData.designation}
                </div>
                <div className="text-[10.5px] text-[#8e95a2] mt-0.5 truncate">
                  {staffData.assignedClass}
                </div>
                <div className="text-[10.5px] text-[#8e95a2] mt-0.5 truncate">
                  Employee ID: {staffData.employeeId}
                </div>
              </div>
            </div>

            {/* Read-Only Details List (Exact Match to Center Image) */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-2.5 sm:p-3 divide-y divide-[#f0f2f5] shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              
              {/* Row 1: Full Name */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Full Name</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.name}
                  </div>
                </div>
              </div>

              {/* Row 2: Email Address */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Email Address</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.email}
                  </div>
                </div>
              </div>

              {/* Row 3: Contact Number */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Contact Number</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.phone}
                  </div>
                </div>
              </div>

              {/* Row 4: Department */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Building className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Department</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.department}
                  </div>
                </div>
              </div>

              {/* Row 5: Role */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Role</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.role}
                  </div>
                </div>
              </div>

              {/* Row 6: Date of Joining */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Date of Joining</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.joiningDate}
                  </div>
                </div>
              </div>

              {/* Row 7: Subjects Assigned */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Subjects Assigned</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.subjectsAssigned}
                  </div>
                </div>
              </div>

              {/* Row 8: Assigned Classes */}
              <div className="flex items-start gap-3 py-2.5 px-1">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-medium text-neutral-400">Assigned Classes</div>
                  <div className="text-[13px] font-semibold text-neutral-900 mt-0.5 truncate">
                    {staffData.assignedClass}
                  </div>
                </div>
              </div>

            </div>

            <div className="text-center pt-1 pb-1">
              <span className="text-[10.5px] text-neutral-400 font-medium">
                Information managed by Greenwood School HR Administration
              </span>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 3: APP SETTINGS (Exact Replica of Right Reference Image)       */}
        {/* =================================================================== */}
        {subView === 'APP_SETTINGS' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Standardized Header */}
            <div className="flex items-start gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setSubView('MAIN')}
                className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
                aria-label="Back to Profile"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[20px] sm:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">
                  App Settings
                </h2>
                <p className="text-[11.5px] sm:text-[12px] text-neutral-500 font-normal mt-0.5">
                  Manage your app preferences
                </p>
              </div>
            </div>

            {/* 4 Setting Options List (Exact Match to Right Image) */}
            <div className="space-y-2 pt-1">
              
              {/* Option 1: Language */}
              <div
                onClick={() => setShowLanguageModal(true)}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      Language
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      Choose your preferred language
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[12px] text-neutral-500 font-medium">{selectedLanguage}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>

              {/* Option 2: Change Password */}
              <div
                onClick={() => setShowPasswordModal(true)}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      Change Password
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      Update your login password
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </div>

              {/* Option 3: Help & Support */}
              <div
                onClick={() => setShowHelpModal(true)}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      Help & Support
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      FAQs and contact support
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </div>

              {/* Option 4: Terms & Policy */}
              <div
                onClick={() => setShowTermsModal(true)}
                className="bg-white border border-[#e5e7eb] hover:border-neutral-400 hover:bg-neutral-50/50 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb] text-neutral-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                      Terms & Policy
                    </div>
                    <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                      Read our terms and privacy policy
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
              </div>

              {/* Option 5: Logout */}
              <div
                onClick={() => setShowLogoutConfirm(true)}
                className="bg-white border border-[#e5e7eb] hover:bg-neutral-50 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-3 cursor-pointer transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f8f9fa] text-neutral-800 border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-2xs">
                  <LogOut className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-[13px] sm:text-[13.5px] font-bold text-neutral-900 leading-snug truncate">
                    Logout
                  </div>
                  <div className="text-[11px] text-[#6b7280] mt-0.5 leading-tight truncate">
                    Sign out from your staff account
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 4: ASSIGNED CLASSES (Dedicated Page)                           */}
        {/* =================================================================== */}
        {subView === 'ASSIGNED_CLASSES' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Standardized Header */}
            <div className="flex items-start gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setSubView('MAIN')}
                className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
                aria-label="Back to Profile"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[20px] sm:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Assigned Classes
                </h2>
                <p className="text-[11.5px] sm:text-[12px] text-neutral-500 font-normal mt-0.5">
                  View your classes and subjects
                </p>
              </div>
            </div>

            {/* Assigned Classes List */}
            <div className="space-y-2.5">
              {assignedClassesList.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold text-xs">
                        {item.classSection.replace('Grade ', '')}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-bold text-neutral-900">
                          {item.classSection}
                        </div>
                        <div className="text-[11px] text-neutral-500">{item.role}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-700 bg-[#f8f9fa] border border-neutral-200 px-2 py-0.5 rounded-md">
                      {item.studentsCount} Students
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600">
                    <div>
                      <span className="text-neutral-400">Subjects: </span>
                      <span className="font-semibold text-neutral-800">
                        {item.subjects.join(', ')}
                      </span>
                    </div>
                    <span className="text-neutral-400">{item.room}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 5: DOCUMENTS (Dedicated Page)                                  */}
        {/* =================================================================== */}
        {subView === 'DOCUMENTS' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Standardized Header */}
            <div className="flex items-start gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setSubView('MAIN')}
                className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
                aria-label="Back to Profile"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-[20px] sm:text-[22px] font-bold text-neutral-900 tracking-tight leading-tight">
                  Documents
                </h2>
                <p className="text-[11.5px] sm:text-[12px] text-neutral-500 font-normal mt-0.5">
                  View official documents shared by school
                </p>
              </div>
            </div>

            {/* Authorized Documents List */}
            <div className="space-y-2.5">
              {authorizedDocumentsList.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-[#e5e7eb] rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4.5 h-4.5 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1 leading-snug">
                    <div className="text-[13px] font-bold text-neutral-900 truncate">
                      {doc.title}
                    </div>
                    <div className="text-[10.5px] text-neutral-500 mt-0.5">
                      Ref: {doc.refNo} • Issued: {doc.date}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10.5px]">
                      <span className="inline-flex items-center gap-1 text-neutral-800 bg-[#f8f9fa] border border-neutral-200 px-2 py-0.5 rounded-full font-medium">
                        <img
                          src={getAssetUrl('/assets/Dark Verified Check Badge.png')}
                          alt="Verified"
                          className="w-3.5 h-3.5 object-contain shrink-0"
                        />
                        <span>{doc.status}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-2 text-center text-[11px] text-neutral-400">
                Official records verified by Greenwood International School HR
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Fixed Bottom Navigation Bar (5 Tabs with Profile Selected) */}
      <StaffBottomNav
        activeTab="Profile"
        onNavigateHome={onNavigateHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateMyRequests={onNavigateMyRequests || (() => showToast('Opening Staff Requests'))}
        onNavigateProfile={() => setSubView('MAIN')}
      />

      {/* =================================================================== */}
      {/* MODAL: Language Preferences Selector (Limited to 5 App Settings)    */}
      {/* =================================================================== */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 sm:p-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Select Language</h3>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-2 space-y-1">
              {['English', 'Hindi', 'Spanish', 'French'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setSelectedLanguage(lang);
                    setShowLanguageModal(false);
                    showToast(`Language set to ${lang}`);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition cursor-pointer ${
                    selectedLanguage === lang
                      ? 'bg-neutral-100 font-bold text-neutral-900'
                      : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <span>{lang}</span>
                  {selectedLanguage === lang && <Check className="w-4 h-4 text-black" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: Change Password                                             */}
      {/* =================================================================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 sm:p-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Change Password</h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!oldPassword || !newPassword) {
                  showToast('Please enter both passwords');
                  return;
                }
                setShowPasswordModal(false);
                setOldPassword('');
                setNewPassword('');
                showToast('Password updated successfully');
              }}
              className="py-3 space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-[13px] text-neutral-900 focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-[#f8f9fa] border border-neutral-200 rounded-xl px-3 py-2 text-[13px] text-neutral-900 focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[12px] font-medium text-white bg-black hover:bg-neutral-800 rounded-lg shadow-xs"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: Help & Support                                              */}
      {/* =================================================================== */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 sm:p-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Help & Support</h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-3 space-y-2.5 text-[12px] text-neutral-700 leading-relaxed">
              <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-neutral-200/80">
                <div className="font-bold text-neutral-900">IT Helpdesk Desk</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Ext: 104 • helpdesk@greenwood.edu.in
                </div>
              </div>
              <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-neutral-200/80">
                <div className="font-bold text-neutral-900">Academic Coordinator</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Office Hours: 08:00 AM – 04:00 PM
                </div>
              </div>
            </div>
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 text-[12px] font-medium text-white bg-black rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: Terms & Policy                                              */}
      {/* =================================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 sm:p-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Terms & Policy</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-3 space-y-2 text-[11.5px] text-neutral-600 leading-relaxed max-h-60 overflow-y-auto">
              <p>
                <strong>Greenwood School OS:</strong> Authorized use only. All student evaluation records, attendance data, and academic circulars are confidential school property.
              </p>
              <p>
                Staff credentials must not be shared. Access logs and attendance marking actions are cryptographically registered.
              </p>
            </div>
            <div className="pt-2 text-right border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-1.5 text-[12px] font-medium text-white bg-black rounded-lg"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: Logout Confirmation                                          */}
      {/* =================================================================== */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl border border-neutral-200 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-[15px] font-bold text-neutral-900">Log Out?</h3>
            <p className="text-[12px] text-neutral-500 mt-1 mb-4 leading-relaxed">
              Are you sure you want to sign out from your Greenwood staff session?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2 text-[12.5px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="py-2 text-[12.5px] font-medium text-white bg-neutral-900 hover:bg-black rounded-xl transition cursor-pointer shadow-xs"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
