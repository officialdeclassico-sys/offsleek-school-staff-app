/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import StaffDashboard from './StaffDashboard';
import AttendanceSaved from './AttendanceSaved';
import TakeAttendance from './TakeAttendance';
import ClassReportModal from './ClassReportModal';
import AddMarks from './AddMarks';
import ReviewAndSaveMarks from './ReviewAndSaveMarks';
import MarksPublishedSuccess from './MarksPublishedSuccess';
import SavedMarksReviewModal from './SavedMarksReviewModal';
import AnnouncementsScreen from './AnnouncementsScreen';
import StaffProfileScreen from './StaffProfileScreen';
import AttendanceModuleScreen from './AttendanceModuleScreen';
import MyRequestsScreen from './MyRequestsScreen';
import MyDocumentsScreen from './MyDocumentsScreen';
import MyAttendanceScreen from './MyAttendanceScreen';
import LeaveRequestFormScreen from './LeaveRequestFormScreen';
import LeaveRequestSubmittedScreen from './LeaveRequestSubmittedScreen';
import ParentLeaveApprovalsScreen from './ParentLeaveApprovalsScreen';
import ParentLeaveDetailsScreen from './ParentLeaveDetailsScreen';
import ApprovalConfirmationScreen from './ApprovalConfirmationScreen';
import LogHomework from './LogHomework';
import ReviewHomework from './ReviewHomework';
import HomeworkAssignedSuccess from './HomeworkAssignedSuccess';
import ViewAssignedHomework from './ViewAssignedHomework';
import StaffStatusBar from './components/StaffStatusBar';
import { StaffRequest, ParentLeaveRequest } from './services/requestsService';
import {
  AttendanceRecord,
  findAttendanceRecord,
  getAttendanceRecords,
} from './services/attendanceService';
import {
  StudentMark,
  AssessmentRecord,
} from './services/marksService';
import {
  HomeworkDraft,
  HomeworkRecord,
} from './services/homeworkService';
import {
  addDaysIST,
  formatISTCompactDateKey,
  formatISTDateKey,
  formatISTDateMedium,
  formatISTDateTime,
  getNow,
} from './utils/dateTimeUtils';

type Screen =
  | 'LOGIN'
  | 'DASHBOARD'
  | 'ATTENDANCE_SAVED'
  | 'TAKE_ATTENDANCE'
  | 'ATTENDANCE_MODULE'
  | 'ADD_MARKS'
  | 'REVIEW_MARKS'
  | 'MARKS_PUBLISHED'
  | 'ANNOUNCEMENTS'
  | 'PROFILE'
  | 'MY_REQUESTS'
  | 'LEAVE_REQUEST_FORM'
  | 'LEAVE_REQUEST_SUBMITTED'
  | 'PARENT_LEAVE_APPROVALS'
  | 'PARENT_LEAVE_DETAILS'
  | 'APPROVAL_CONFIRMATION'
  | 'LOG_HOMEWORK'
  | 'REVIEW_HOMEWORK'
  | 'HOMEWORK_ASSIGNED_SUCCESS'
  | 'VIEW_ASSIGNED_HOMEWORK'
  | 'MY_DOCUMENTS'
  | 'MY_ATTENDANCE';


export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  const [emailOrStaffId, setEmailOrStaffId] = useState('priya.sharma@greenwood.edu');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);


  // Active attendance record
  const [activeAttendanceRecord, setActiveAttendanceRecord] = useState<AttendanceRecord | undefined>(() => {
    const todayKey = formatISTDateKey();
    return (
      findAttendanceRecord('greenwood-intl', 'Grade 5 - A', todayKey) ||
      findAttendanceRecord('greenwood-intl', 'Grade 5 - A', '2026-10-14')
    );
  });

  // Modal for Class Report
  const [showClassReport, setShowClassReport] = useState(false);

  // Working assessment marks data (draft)
  const [marksAssessmentData, setMarksAssessmentData] = useState<{
    grade: string;
    subject: string;
    assessmentType: string;
    totalMarks: number;
    passingMarks: number;
    examDate: string;
    showMarksToStudents: boolean;
    addRemarks: boolean;
    studentMarks: StudentMark[];
  } | undefined>(undefined);

  // Published marks record
  const [publishedMarksRecord, setPublishedMarksRecord] = useState<AssessmentRecord | undefined>(undefined);

  // Modal for reviewing saved marks
  const [showSavedMarksModal, setShowSavedMarksModal] = useState(false);

  // Active Staff Request for confirmation screen
  const [activeStaffRequest, setActiveStaffRequest] = useState<StaffRequest | null>(null);

  // Active Parent Leave Request & Decision for details / confirmation screens
  const [activeParentLeaveRequest, setActiveParentLeaveRequest] = useState<ParentLeaveRequest | null>(null);
  const [activeDecision, setActiveDecision] = useState<'Approved' | 'Rejected' | null>(null);

  // Homework Assignment Flow states (Draft & Published Record)
  const [homeworkDraft, setHomeworkDraft] = useState<HomeworkDraft | null>(null);
  const [assignedHomeworkRecord, setAssignedHomeworkRecord] = useState<HomeworkRecord | null>(null);

  // Inline validation state for login
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const newErrors: { email?: string; password?: string } = {};
    if (!emailOrStaffId.trim()) {
      newErrors.email = 'Please enter your email or staff ID.';
    }
    if (!password) {
      newErrors.password = 'Please enter your password.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    // Transition into Staff Dashboard after brief verification
    setTimeout(() => {
      setIsLoading(false);
      setCurrentScreen('DASHBOARD');
    }, 450);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setFeedback({
      type: 'info',
      message: 'Password Recovery: Please contact your school administrator or IT department.',
    });
  };

  // Track previous screen for accurate back navigation
  const [previousScreen, setPreviousScreen] = useState<Screen>('DASHBOARD');

  // Open Daily Take Attendance flow from Dashboard quick action
  const handleTakeAttendance = () => {
    const schoolId = 'greenwood-intl';
    const grade = 'Grade 5 - A';
    const dateKey = formatISTDateKey();

    const existing = findAttendanceRecord(schoolId, grade, dateKey);
    setActiveAttendanceRecord(existing);

    setPreviousScreen(currentScreen);
    setCurrentScreen('TAKE_ATTENDANCE');
  };

  // Open Monthly Attendance Module (Students list / Monthly Class Summary / Student Summary)
  const handleOpenAttendanceModule = () => {
    setPreviousScreen(currentScreen);
    setCurrentScreen('ATTENDANCE_MODULE');
  };

  // Handle Attendance saved / updated
  const handleAttendanceSaved = (savedRecord: AttendanceRecord) => {
    setActiveAttendanceRecord(savedRecord);
    setCurrentScreen('ATTENDANCE_SAVED');
  };

  // Open Add Marks flow from Dashboard
  const handleOpenAddMarks = () => {
    setPreviousScreen(currentScreen);
    setCurrentScreen('ADD_MARKS');
  };

  // Screen 1 -> Screen 2: Add Marks -> Review & Save
  const handleContinueToReviewMarks = (assessmentData: {
    grade: string;
    subject: string;
    assessmentType: string;
    totalMarks: number;
    passingMarks: number;
    examDate: string;
    showMarksToStudents: boolean;
    addRemarks: boolean;
    studentMarks: StudentMark[];
  }) => {
    setMarksAssessmentData(assessmentData);
    setPreviousScreen('ADD_MARKS');
    setCurrentScreen('REVIEW_MARKS');
  };

  // Screen 2 -> Screen 1: Edit Marks button
  const handleEditMarks = () => {
    setPreviousScreen('REVIEW_MARKS');
    setCurrentScreen('ADD_MARKS');
  };

  // Screen 2 -> Screen 3: Save & Publish
  const handlePublishMarksSuccess = (savedRecord: AssessmentRecord) => {
    setPublishedMarksRecord(savedRecord);
    setCurrentScreen('MARKS_PUBLISHED');
  };

  // Screen 3 -> Dashboard
  const handleBackToDashboardFromMarks = () => {
    setCurrentScreen('DASHBOARD');
  };

  // Screen 3 -> Review Saved Marks modal
  const handleReviewSavedMarks = () => {
    setShowSavedMarksModal(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#141820] flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-x-hidden select-none antialiased">
      
      {/* Unified notch-free mobile device container across Login and all Staff Portal screens */}
      <div className="relative w-full sm:max-w-[390px] h-screen sm:h-[844px] sm:max-h-[880px] bg-white sm:rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col justify-between">
        
        {/* Screen 1: Dashboard */}
        {currentScreen === 'DASHBOARD' && (
          <StaffDashboard
            onLogout={() => setCurrentScreen('LOGIN')}
            onOpenAttendance={handleOpenAttendanceModule}
            onTakeAttendance={handleTakeAttendance}
            onOpenAddMarks={handleOpenAddMarks}
            onOpenAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onOpenProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
            onOpenMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onOpenParentLeaveApprovals={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PARENT_LEAVE_APPROVALS');
            }}
            onOpenMyDocuments={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_DOCUMENTS');
            }}
            onOpenMyAttendance={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_ATTENDANCE');
            }}
            onLogHomework={() => {
              setHomeworkDraft(null);
              setPreviousScreen(currentScreen);
              setCurrentScreen('LOG_HOMEWORK');
            }}
          />
        )}

        {/* Screen 7: Announcements Screen (Task 3) */}
        {currentScreen === 'ANNOUNCEMENTS' && (
          <AnnouncementsScreen
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onLogout={() => setCurrentScreen('LOGIN')}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
          />
        )}

        {/* Screen 8: Staff Profile Section (Task 6) */}
        {currentScreen === 'PROFILE' && (
          <StaffProfileScreen
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => setCurrentScreen('ANNOUNCEMENTS')}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onLogout={() => setCurrentScreen('LOGIN')}
            onBack={() => setCurrentScreen(previousScreen || 'DASHBOARD')}
          />
        )}

        {/* Staff Attendance Module (Task 9: Student Attendance List, Individual Summary, Monthly Class Summary) */}
        {currentScreen === 'ATTENDANCE_MODULE' && (
          <AttendanceModuleScreen
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAnnouncements={() => setCurrentScreen('ANNOUNCEMENTS')}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
            onLogout={() => setCurrentScreen('LOGIN')}
          />
        )}

        {/* Screen 2: Attendance Saved Summary Screen */}
        {currentScreen === 'ATTENDANCE_SAVED' && activeAttendanceRecord && (
          <AttendanceSaved
            record={activeAttendanceRecord}
            onEdit={() => {
              setPreviousScreen('ATTENDANCE_SAVED');
              setCurrentScreen('TAKE_ATTENDANCE');
            }}
            onViewReport={() => setShowClassReport(true)}
            onBackToHome={() => setCurrentScreen('DASHBOARD')}
          />
        )}

        {/* Screen 3: Take Attendance / Edit Attendance Screen */}
        {currentScreen === 'TAKE_ATTENDANCE' && (
          <TakeAttendance
            initialRecord={activeAttendanceRecord}
            onSaved={handleAttendanceSaved}
            onBack={() => setCurrentScreen(previousScreen)}
          />
        )}

        {/* Screen 4: Add Marks (Three-Screen Flow: Screen 1) */}
        {currentScreen === 'ADD_MARKS' && (
          <AddMarks
            initialData={marksAssessmentData}
            onContinue={handleContinueToReviewMarks}
            onBack={() => setCurrentScreen(previousScreen || 'DASHBOARD')}
          />
        )}

        {/* Screen 5: Review & Save Marks (Three-Screen Flow: Screen 2) */}
        {currentScreen === 'REVIEW_MARKS' && marksAssessmentData && (
          <ReviewAndSaveMarks
            assessmentData={marksAssessmentData}
            onEditMarks={handleEditMarks}
            onPublishSuccess={handlePublishMarksSuccess}
            onBack={() => setCurrentScreen('ADD_MARKS')}
          />
        )}

        {/* Screen 6: Marks Published Successfully (Three-Screen Flow: Screen 3) */}
        {currentScreen === 'MARKS_PUBLISHED' && publishedMarksRecord && (
          <MarksPublishedSuccess
            record={publishedMarksRecord}
            onBackToDashboard={handleBackToDashboardFromMarks}
            onReviewSavedMarks={handleReviewSavedMarks}
          />
        )}

        {/* Screen 9: My Requests Screen */}
        {currentScreen === 'MY_REQUESTS' && (
          <MyRequestsScreen
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
            onOpenLeaveRequestForm={() => {
              setPreviousScreen('MY_REQUESTS');
              setCurrentScreen('LEAVE_REQUEST_FORM');
            }}
            onSubmitSuccess={(record) => {
              setActiveStaffRequest(record);
              setPreviousScreen('MY_REQUESTS');
              setCurrentScreen('LEAVE_REQUEST_SUBMITTED');
            }}
          />
        )}

        {/* Screen: My Documents Screen */}
        {currentScreen === 'MY_DOCUMENTS' && (
          <MyDocumentsScreen
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
          />
        )}

        {/* Screen: My Attendance Screen */}
        {currentScreen === 'MY_ATTENDANCE' && (
          <MyAttendanceScreen
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
          />
        )}

        {/* Screen 10: Leave Request Form Screen */}
        {currentScreen === 'LEAVE_REQUEST_FORM' && (
          <LeaveRequestFormScreen
            onBackToRequests={() => setCurrentScreen('MY_REQUESTS')}
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
            onSubmitSuccess={(record) => {
              setActiveStaffRequest(record);
              setPreviousScreen('LEAVE_REQUEST_FORM');
              setCurrentScreen('LEAVE_REQUEST_SUBMITTED');
            }}
          />
        )}

        {/* Screen 11: Leave Request Submitted Screen */}
        {currentScreen === 'LEAVE_REQUEST_SUBMITTED' && (
          <LeaveRequestSubmittedScreen
            record={
              activeStaffRequest || {
                id: `SL-${formatISTCompactDateKey()}-001`,
                staffId: 'T001',
                staffName: 'Ms. Priya Sharma',
                type: 'Leave',
                title: 'Casual Leave',
                leaveType: 'Casual Leave',
                fromDate: formatISTDateKey(),
                toDate: formatISTDateKey(addDaysIST(getNow(), 2)),
                duration: `${formatISTDateMedium()} - ${formatISTDateMedium(addDaysIST(getNow(), 2))} (3 days)`,
                reason: 'Family function in hometown',
                status: 'Pending Approval',
                details: `${formatISTDateMedium()} - ${formatISTDateMedium(addDaysIST(getNow(), 2))} (3 days)`,
                submittedOn: formatISTDateTime(),
              }
            }
            onViewMyRequests={() => setCurrentScreen('MY_REQUESTS')}
            onGoToHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
          />
        )}

        {/* Screen 12: Parent Leave Approvals Screen */}
        {currentScreen === 'PARENT_LEAVE_APPROVALS' && (
          <ParentLeaveApprovalsScreen
            onBackToHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
            onSelectRequest={(req) => {
              setActiveParentLeaveRequest(req);
              setPreviousScreen('PARENT_LEAVE_APPROVALS');
              setCurrentScreen('PARENT_LEAVE_DETAILS');
            }}
          />
        )}

        {/* Screen 13: Parent Leave Details Screen */}
        {currentScreen === 'PARENT_LEAVE_DETAILS' && activeParentLeaveRequest && (
          <ParentLeaveDetailsScreen
            request={activeParentLeaveRequest}
            onBackToApprovals={() => setCurrentScreen('PARENT_LEAVE_APPROVALS')}
            onNavigateHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
            onDecisionCompleted={(updatedReq, decision) => {
              setActiveParentLeaveRequest(updatedReq);
              setActiveDecision(decision);
              setPreviousScreen('PARENT_LEAVE_DETAILS');
              setCurrentScreen('APPROVAL_CONFIRMATION');
            }}
          />
        )}

        {/* Screen 14: Approval / Rejection Confirmation Screen */}
        {currentScreen === 'APPROVAL_CONFIRMATION' && activeParentLeaveRequest && (
          <ApprovalConfirmationScreen
            request={activeParentLeaveRequest}
            decision={activeDecision || 'Approved'}
            onBackToApprovals={() => setCurrentScreen('PARENT_LEAVE_APPROVALS')}
            onGoToHome={() => setCurrentScreen('DASHBOARD')}
            onNavigateAttendance={handleOpenAttendanceModule}
            onNavigateAnnouncements={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('ANNOUNCEMENTS');
            }}
            onNavigateMyRequests={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('MY_REQUESTS');
            }}
            onNavigateProfile={() => {
              setPreviousScreen(currentScreen);
              setCurrentScreen('PROFILE');
            }}
          />
        )}

        {/* Screen 15: Log Homework Screen */}
        {currentScreen === 'LOG_HOMEWORK' && (
          <LogHomework
            staffId="T001"
            staffName="Ms. Priya Sharma"
            initialDraft={homeworkDraft}
            onContinueToReview={(draft) => {
              setHomeworkDraft(draft);
              setCurrentScreen('REVIEW_HOMEWORK');
            }}
            onCancel={() => {
              setHomeworkDraft(null);
              setCurrentScreen(previousScreen || 'DASHBOARD');
            }}
          />
        )}

        {/* Screen 16: Review Homework Screen */}
        {currentScreen === 'REVIEW_HOMEWORK' && homeworkDraft && (
          <ReviewHomework
            draft={homeworkDraft}
            onEditHomework={() => {
              setCurrentScreen('LOG_HOMEWORK');
            }}
            onHomeworkAssigned={(record) => {
              setAssignedHomeworkRecord(record);
              setHomeworkDraft(null);
              setCurrentScreen('HOMEWORK_ASSIGNED_SUCCESS');
            }}
          />
        )}

        {/* Screen 17: Homework Assigned Successfully Screen */}
        {currentScreen === 'HOMEWORK_ASSIGNED_SUCCESS' && assignedHomeworkRecord && (
          <HomeworkAssignedSuccess
            record={assignedHomeworkRecord}
            onViewAssignedHomework={() => {
              setCurrentScreen('VIEW_ASSIGNED_HOMEWORK');
            }}
            onBackToDashboard={() => {
              setCurrentScreen('DASHBOARD');
            }}
          />
        )}

        {/* Screen 18: View Assigned Homework Screen */}
        {currentScreen === 'VIEW_ASSIGNED_HOMEWORK' && assignedHomeworkRecord && (
          <ViewAssignedHomework
            record={assignedHomeworkRecord}
            onBack={() => {
              setCurrentScreen('HOMEWORK_ASSIGNED_SUCCESS');
            }}
          />
        )}

        {/* Screen 4: Login Screen */}
        {currentScreen === 'LOGIN' && (
          <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
            <StaffStatusBar />

            {/* Compact Main Login Stack */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 py-2 flex flex-col justify-center">
              {/* Top Branding Section */}
              <div className="flex flex-col items-center justify-center pt-1 pb-3">
                {/* Main OFFSLEEK Floating Molecule Logo */}
                <img
                  src="/assets/OFFSLEEK%20Floating%20Molecule%20Logo.png"
                  alt="OFFSLEEK"
                  className="w-[224px] sm:w-[234px] h-auto object-contain"
                />

                {/* Subtitle directly beneath logo */}
                <div className="text-[10.5px] font-semibold tracking-[0.36em] text-neutral-900 uppercase -mt-1 pl-[0.36em]">
                  SCHOOL OS
                </div>

                {/* Tagline */}
                <div className="mt-1.5 text-[8.5px] tracking-[0.2em] text-[#646a79] font-semibold uppercase text-center">
                  SCHOOLS &nbsp;•&nbsp; PEOPLE &nbsp;•&nbsp; PROGRESS &nbsp;TOGETHER
                </div>
              </div>

              {/* Substantial, Compact Login Card */}
              <div className="w-full bg-white rounded-[28px] px-5 py-6 sm:px-6 sm:py-6 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.08),0_2px_10px_rgba(0,0,0,0.04)] border border-neutral-200/90">
                
                {/* Feedback notification toast if active */}
                {feedback && (
                  <div
                    className={`mb-3.5 p-3 rounded-xl text-xs flex items-start justify-between gap-2 border ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    <span className="font-medium">{feedback.message}</span>
                    <button
                      type="button"
                      onClick={() => setFeedback(null)}
                      className="text-neutral-500 hover:text-neutral-900 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Welcome Back & Title */}
                <div className="text-[10px] font-bold tracking-[0.22em] text-[#717684] uppercase">
                  WELCOME BACK
                </div>
                
                <h1 className="text-[26px] sm:text-[27px] leading-[1.14] font-extrabold text-[#0f172a] tracking-tight mt-1.5 mb-1.5">
                  Sign in to your<br />staff account
                </h1>

                <p className="text-[13px] text-[#646a79] leading-snug mb-4.5">
                  Manage your classes, students and school activities with OFFSLEEK.
                </p>

                <form onSubmit={handleLoginSubmit} noValidate>
                  {/* Email or Staff ID Field */}
                  <div>
                    <div
                      className={`flex items-center bg-[#f8f9fa] border ${
                        errors.email
                          ? 'border-red-500 bg-red-50/20'
                          : 'border-[#e5e7eb] focus-within:border-neutral-900 focus-within:bg-white'
                      } rounded-2xl px-4 py-3.5 transition`}
                    >
                      <Mail className="w-[19px] h-[19px] text-[#9ca3af] shrink-0 mr-3 stroke-[1.8]" />
                      <input
                        type="text"
                        value={emailOrStaffId}
                        onChange={(e) => {
                          setEmailOrStaffId(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        placeholder="Email or Staff ID"
                        className="w-full bg-transparent text-[14px] font-medium text-neutral-900 placeholder:text-[#9ca3af] focus:outline-none"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-[11.5px] text-red-600 mt-1 pl-1 font-medium">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="mt-3">
                    <div
                      className={`flex items-center bg-[#f8f9fa] border ${
                        errors.password
                          ? 'border-red-500 bg-red-50/20'
                          : 'border-[#e5e7eb] focus-within:border-neutral-900 focus-within:bg-white'
                      } rounded-2xl px-4 py-3.5 transition`}
                    >
                      <Lock className="w-[19px] h-[19px] text-[#9ca3af] shrink-0 mr-3 stroke-[1.8]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        placeholder="Password"
                        className="w-full bg-transparent text-[14px] font-medium text-neutral-900 placeholder:text-[#9ca3af] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#9ca3af] hover:text-neutral-700 cursor-pointer ml-2 p-0.5"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <Eye className="w-[19px] h-[19px] stroke-[1.8]" />
                        ) : (
                          <EyeOff className="w-[19px] h-[19px] stroke-[1.8]" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-[11.5px] text-red-600 mt-1 pl-1 font-medium">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div className="flex items-center justify-between mt-3.5 mb-5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe(!rememberMe)}
                      className="flex items-center gap-2 cursor-pointer select-none group"
                    >
                      <div
                        className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition ${
                          rememberMe
                            ? 'bg-black text-white'
                            : 'border border-[#d1d5db] bg-white group-hover:border-neutral-700'
                        }`}
                      >
                        {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-[12.5px] font-medium text-neutral-800">
                        Remember me
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[12.5px] font-semibold text-neutral-800 hover:text-black underline underline-offset-2 cursor-pointer transition"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Sign In Primary Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-black hover:bg-neutral-800 active:scale-[0.99] text-white font-semibold text-[14.5px] py-3.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 transition duration-150 shadow-xs cursor-pointer disabled:opacity-75"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </form>

                {/* Security Note directly below main Sign In button */}
                <div className="flex items-center justify-center gap-1.5 mt-4 text-[#646a79]">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-[#646a79] shrink-0">
                    <path
                      d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 8.5a2 2 0 0 0-2 2v1.2a1 1 0 0 0-1 1v2.6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.6a1 1 0 0 0-1-1v-1.2a2 2 0 0 0-2-2zm0 1.2a.8.8 0 0 1 .8.8v1.2h-1.6v-1.2a.8.8 0 0 1 .8-.8z"
                      fill="white"
                    />
                  </svg>
                  <span className="text-[11px] text-[#646a79] font-medium tracking-tight">
                    Secure access for authorised school staff only
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Class Report Modal */}
        {showClassReport && activeAttendanceRecord && (
          <ClassReportModal
            record={activeAttendanceRecord}
            onClose={() => setShowClassReport(false)}
          />
        )}

        {/* Saved Marks Review Modal */}
        {showSavedMarksModal && publishedMarksRecord && (
          <SavedMarksReviewModal
            record={publishedMarksRecord}
            onClose={() => setShowSavedMarksModal(false)}
          />
        )}

      </div>
    </div>
  );
}
