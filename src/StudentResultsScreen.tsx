/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  MessageSquareText,
  School,
  Star,
  User,
  X,
} from 'lucide-react';
import StaffBottomNav from './components/StaffBottomNav';
import StaffStatusBar from './components/StaffStatusBar';
import { getActiveStaffCalendarContext } from './services/calendarService';
import {
  AuthorizedStudentProfile,
  AVAILABLE_ASSESSMENTS,
  computeStudentExamResult,
  formatMarksPercentage,
  getAuthorizedStudentsForStaff,
  PublishedMarksSubscriptionSnapshot,
  subscribeToPublishedStudentMarks,
} from './services/marksService';
import { getAssetUrl } from './utils/assetUtils';

interface StudentResultsScreenProps {
  onBack: () => void;
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateProfile: () => void;
}

function StudentAvatar({
  name,
  avatar,
  sizeClass = 'w-11 h-11',
  textSizeClass = 'text-xs',
}: {
  name: string;
  avatar?: string;
  sizeClass?: string;
  textSizeClass?: string;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatar, name]);

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'S';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [name]);

  const resolvedSrc = avatar ? getAssetUrl(avatar) : '';

  if (!resolvedSrc || imgError) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-neutral-200 text-neutral-800 font-bold ${textSizeClass} flex items-center justify-center shrink-0 border border-[#e5e7eb]`}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={`${sizeClass} rounded-full object-cover shrink-0 border border-[#e5e7eb] bg-neutral-100`}
    />
  );
}

function getStudentCompositeKey(student: AuthorizedStudentProfile): string {
  return `${student.grade}::${student.studentId}`;
}

export default function StudentResultsScreen({
  onBack,
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateProfile,
}: StudentResultsScreenProps) {
  const staffContext = useMemo(() => getActiveStaffCalendarContext(), []);

  const [marksSnapshot, setMarksSnapshot] = useState<PublishedMarksSubscriptionSnapshot>({
    loading: true,
    records: [],
    isLiveFirestore: false,
    requiresFirebaseAuth: false,
    error: null,
  });

  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToPublishedStudentMarks(
      { staff: staffContext },
      (snapshot) => {
        setMarksSnapshot(snapshot);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [staffContext, retryTick]);

  const authorizedStudents = useMemo(
    () => getAuthorizedStudentsForStaff(staffContext, marksSnapshot.records),
    [staffContext, marksSnapshot.records]
  );

  const [selectedStudentKey, setSelectedStudentKey] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>(AVAILABLE_ASSESSMENTS[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keep selected student valid within authorized roster
  useEffect(() => {
    if (authorizedStudents.length === 0) {
      if (selectedStudentKey) setSelectedStudentKey('');
      return;
    }
    const stillValid = authorizedStudents.some(
      (st) => getStudentCompositeKey(st) === selectedStudentKey
    );
    if (!stillValid) {
      setSelectedStudentKey(getStudentCompositeKey(authorizedStudents[0]));
    }
  }, [authorizedStudents, selectedStudentKey]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return authorizedStudents;
    return authorizedStudents.filter((st) => {
      const nameMatch = st.name.toLowerCase().includes(q);
      const rollMatch = st.rollNo.toLowerCase().includes(q);
      const admissionMatch = st.admissionNo
        ? st.admissionNo.toLowerCase().includes(q)
        : false;
      const gradeMatch = st.grade.toLowerCase().includes(q);
      return nameMatch || rollMatch || admissionMatch || gradeMatch;
    });
  }, [authorizedStudents, searchQuery]);

  const selectedStudent = useMemo(() => {
    if (authorizedStudents.length === 0) return null;
    return (
      authorizedStudents.find(
        (st) => getStudentCompositeKey(st) === selectedStudentKey
      ) || authorizedStudents[0]
    );
  }, [authorizedStudents, selectedStudentKey]);

  const resultData = useMemo(() => {
    if (!selectedStudent) return null;
    return computeStudentExamResult({
      student: selectedStudent,
      examName: selectedExam,
      publishedRecords: marksSnapshot.records,
      staff: staffContext,
    });
  }, [selectedStudent, selectedExam, marksSnapshot.records, staffContext]);

  const handleSelectStudent = (student: AuthorizedStudentProfile) => {
    setSelectedStudentKey(getStudentCompositeKey(student));
    setSearchQuery('');
    setIsDropdownOpen(false);
    searchInputRef.current?.blur();
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      <StaffStatusBar />

      {/* Header */}
      <header className="shrink-0 px-3.5 sm:px-4 pt-1 pb-2.5 bg-white">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Staff Dashboard"
            className="mt-0.5 w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-neutral-900 hover:bg-neutral-100 active:scale-95 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[19px] sm:text-[20px] font-extrabold text-neutral-950 tracking-tight leading-tight">
              Student Results
            </h1>
            <p className="text-[11.5px] sm:text-[12px] text-[#6b7280] font-normal leading-snug mt-0.5">
              View the student&apos;s academic performance.
            </p>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4 pb-4 space-y-2.5">
        {/* B. Student Search Dropdown */}
        <div ref={dropdownContainerRef} className="relative z-20">
          <div
            className={`flex items-center gap-2 bg-white border ${
              isDropdownOpen
                ? 'border-neutral-900 ring-1 ring-neutral-900/10'
                : 'border-[#e5e7eb] hover:border-neutral-400'
            } rounded-2xl px-3 py-2.5 transition shadow-[0_1px_2px_rgba(0,0,0,0.02)]`}
          >
            <User className="w-4 h-4 text-neutral-800 stroke-[1.9] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-expanded={isDropdownOpen}
              aria-controls="student-results-dropdown-listbox"
              aria-label="Search or select a student"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onClick={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              placeholder="Search or select a student"
              className="w-full min-w-0 bg-transparent text-[12.5px] font-medium text-neutral-900 placeholder:text-[#6b7280] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer shrink-0 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={isDropdownOpen ? 'Close student list' : 'Open student list'}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="p-0.5 text-neutral-700 hover:text-black cursor-pointer shrink-0 transition"
            >
              <ChevronDown
                className={`w-4 h-4 stroke-[2] transition-transform duration-150 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {isDropdownOpen && (
            <div
              id="student-results-dropdown-listbox"
              role="listbox"
              aria-label="Authorized students"
              className="absolute left-0 right-0 mt-1.5 bg-white border border-[#e5e7eb] rounded-2xl shadow-[0_12px_30px_-8px_rgba(0,0,0,0.16)] max-h-[248px] overflow-y-auto no-scrollbar py-1.5 z-30"
            >
              {filteredStudents.length === 0 ? (
                <div className="px-3.5 py-4 text-center text-[12px] text-[#6b7280]">
                  No authorized students match &ldquo;{searchQuery.trim()}&rdquo;.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const key = getStudentCompositeKey(student);
                  const isSelected = selectedStudent
                    ? getStudentCompositeKey(selectedStudent) === key
                    : false;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectStudent(student)}
                      className={`w-full px-3 py-2 flex items-center justify-between gap-2.5 text-left transition cursor-pointer ${
                        isSelected ? 'bg-[#f4f5f7]' : 'hover:bg-[#f8f9fa]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StudentAvatar
                          name={student.name}
                          avatar={student.avatar}
                          sizeClass="w-8 h-8"
                          textSizeClass="text-[10.5px]"
                        />
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-semibold text-neutral-900 truncate">
                            {student.name}
                          </div>
                          <div className="text-[10.5px] text-[#6b7280] truncate tabular-nums">
                            {student.grade} &nbsp;|&nbsp; Roll No. {student.rollNo}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-black stroke-[2.4] shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* C. Selected Student Profile Card */}
        {selectedStudent ? (
          <section
            aria-label="Selected student details"
            className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3 flex items-center gap-3"
          >
            <StudentAvatar
              name={selectedStudent.name}
              avatar={selectedStudent.avatar}
              sizeClass="w-12 h-12"
              textSizeClass="text-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] sm:text-[15px] font-bold text-neutral-950 leading-tight truncate">
                {selectedStudent.name}
              </div>
              <div className="text-[11.5px] text-[#4b5563] font-normal mt-0.5 tabular-nums truncate">
                {selectedStudent.grade} &nbsp;|&nbsp; Roll No. {selectedStudent.rollNo}
              </div>
              {selectedStudent.classTeacher && (
                <div className="text-[11.5px] text-[#4b5563] font-normal mt-0.5 truncate">
                  Class Teacher: {selectedStudent.classTeacher}
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 text-center text-[12px] text-[#6b7280]">
            No students assigned to your staff account.
          </div>
        )}

        {/* D. Examination Tabs */}
        <div
          role="tablist"
          aria-label="Examination selector"
          className="bg-[#f4f5f7] p-1 rounded-full grid grid-cols-4 gap-0.5 border border-[#eceef2]"
        >
          {AVAILABLE_ASSESSMENTS.map((exam) => {
            const isActive = selectedExam === exam;
            return (
              <button
                key={exam}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedExam(exam)}
                className={`py-1.5 px-1 rounded-full text-[11px] sm:text-[11.5px] leading-tight whitespace-nowrap text-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                  isActive
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'text-[#374151] hover:text-black font-medium'
                }`}
              >
                {exam}
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {marksSnapshot.loading && (
          <div aria-label="Loading student results" className="space-y-2.5 pt-0.5">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#e5e7eb] rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-1.5"
                >
                  <div className="w-4 h-4 rounded bg-neutral-200 animate-pulse" />
                  <div className="w-10 h-5 rounded bg-neutral-200 animate-pulse" />
                  <div className="w-12 h-3 rounded bg-neutral-100 animate-pulse" />
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
              <div className="h-10 rounded-xl bg-neutral-200 animate-pulse" />
              <div className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
            </div>
          </div>
        )}

        {/* Error State */}
        {!marksSnapshot.loading && marksSnapshot.error && (
          <div
            role="alert"
            className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl p-3.5 flex items-start justify-between gap-2.5"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold text-neutral-900">
                  Unable to load results
                </div>
                <p className="text-[11.5px] text-[#6b7280] mt-0.5 break-words">
                  {marksSnapshot.error}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRetryTick((t) => t + 1)}
              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-white border border-[#fecdd3] text-[11px] font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty / Unpublished State */}
        {!marksSnapshot.loading &&
          !marksSnapshot.error &&
          selectedStudent &&
          (!resultData || !resultData.summary) && (
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-5 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center mx-auto text-neutral-700">
                <ClipboardList className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="text-[13.5px] font-bold text-neutral-900">
                No Published Results for {selectedExam}
              </div>
              <p className="text-[11.5px] text-[#6b7280] leading-relaxed max-w-[270px] mx-auto">
                Marks have not been published yet for {selectedStudent.name} ({selectedStudent.grade}) in {selectedExam}.
              </p>
            </div>
          )}

        {/* Published Results View */}
        {!marksSnapshot.loading &&
          !marksSnapshot.error &&
          selectedStudent &&
          resultData &&
          resultData.summary && (
            <div className="space-y-2.5">
              {/* E. 3 Performance Summary Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl py-2.5 px-2 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <BookOpen className="w-4 h-4 text-neutral-900 stroke-[1.9] mb-1" />
                  <div className="text-[18px] sm:text-[19px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {resultData.summary.totalSubjects}
                  </div>
                  <div className="text-[10.5px] text-[#6b7280] font-medium mt-1 leading-tight whitespace-nowrap">
                    Subjects
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-2xl py-2.5 px-2 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <BarChart2 className="w-4 h-4 text-neutral-900 stroke-[1.9] mb-1" />
                  <div className="text-[18px] sm:text-[19px] font-extrabold text-neutral-950 leading-none tabular-nums">
                    {formatMarksPercentage(resultData.summary.percentage)}
                  </div>
                  <div className="text-[10.5px] text-[#6b7280] font-medium mt-1 leading-tight whitespace-nowrap">
                    Average
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] rounded-2xl py-2.5 px-2 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <Star className="w-4 h-4 text-neutral-900 stroke-[1.9] mb-1" />
                  <div className="text-[18px] sm:text-[19px] font-extrabold text-neutral-950 leading-none">
                    {resultData.summary.overallGrade}
                  </div>
                  <div className="text-[10.5px] text-[#6b7280] font-medium mt-1 leading-tight whitespace-nowrap">
                    Overall Grade
                  </div>
                </div>
              </div>

              {/* F + G + H. Main Result Summary Card */}
              <section
                aria-label={`${selectedExam} result summary`}
                className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              >
                {/* F. Black School Header */}
                <div className="bg-black text-white px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0">
                      <School className="w-4.5 h-4.5 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] sm:text-[12.5px] font-bold leading-tight truncate">
                        {resultData.schoolName}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] text-neutral-300 leading-tight mt-0.5 truncate">
                        {resultData.boardAndLocation}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-7 w-px bg-white/25" aria-hidden="true" />
                    <span className="text-[10.5px] font-medium text-white whitespace-nowrap tabular-nums">
                      {selectedExam} &ndash; {resultData.summary.academicYearLabel}
                    </span>
                  </div>
                </div>

                {/* Selected Student Info Inside Result Card */}
                <div className="px-3 py-2.5 flex items-center gap-3">
                  <StudentAvatar
                    name={selectedStudent.name}
                    avatar={selectedStudent.avatar}
                    sizeClass="w-11 h-11"
                    textSizeClass="text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-neutral-950 leading-tight truncate">
                      {selectedStudent.name}
                    </div>
                    <div className="text-[11px] text-[#4b5563] font-normal mt-0.5 tabular-nums truncate">
                      {selectedStudent.grade} &nbsp;|&nbsp; Roll No. {selectedStudent.rollNo}
                    </div>
                    {selectedStudent.classTeacher && (
                      <div className="text-[11px] text-[#4b5563] font-normal mt-0.5 truncate">
                        Class Teacher: {selectedStudent.classTeacher}
                      </div>
                    )}
                  </div>
                </div>

                {/* G. Subject-Wise Marks Table */}
                <div className="px-2.5 pb-2">
                  <div className="bg-[#f4f5f7] px-2.5 py-2 rounded-xl grid grid-cols-[1.5fr_0.9fr_0.55fr_0.8fr] items-center text-[10.5px] font-bold text-neutral-900">
                    <span className="text-left">Subject</span>
                    <span className="text-center">Marks</span>
                    <span className="text-center">Grade</span>
                    <span className="text-center">Status</span>
                  </div>

                  <div className="divide-y divide-[#eef0f3]">
                    {resultData.subjects.map((row) => (
                      <div
                        key={row.recordId}
                        className="px-2.5 py-2 grid grid-cols-[1.5fr_0.9fr_0.55fr_0.8fr] items-center gap-1"
                      >
                        <span className="text-[11.5px] font-semibold text-neutral-900 truncate pr-1">
                          {row.subject}
                        </span>
                        <span className="text-[11.5px] text-neutral-800 text-center tabular-nums whitespace-nowrap">
                          {row.isAbsent
                            ? `AB / ${row.maxMarks}`
                            : `${row.marksObtained ?? 0} / ${row.maxMarks}`}
                        </span>
                        <span className="text-[11.5px] font-bold text-neutral-950 text-center">
                          {row.grade}
                        </span>
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-tight whitespace-nowrap ${
                              row.status === 'Pass'
                                ? 'bg-[#15803d] text-white'
                                : row.status === 'Absent'
                                  ? 'bg-[#d97706] text-white'
                                  : 'bg-[#dc2626] text-white'
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* H. Combined Overall Result Summary — ONE BOX ONLY */}
                <div className="mx-2.5 mb-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3">
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div className="pr-3 border-r border-[#e5e7eb] space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-[#4b5563]">Total Subjects</span>
                        <span className="font-bold text-neutral-950 tabular-nums">
                          {resultData.summary.totalSubjects}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-[#4b5563]">Total Marks</span>
                        <span className="font-bold text-neutral-950 tabular-nums">
                          {resultData.summary.totalMaxMarks}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-[#4b5563]">Marks Obtained</span>
                        <span className="font-bold text-neutral-950 tabular-nums">
                          {resultData.summary.totalMarksObtained}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-[#4b5563]">Result</span>
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[9.5px] font-bold leading-tight whitespace-nowrap ${
                            resultData.summary.overallResult === 'PASS'
                              ? 'bg-[#15803d] text-white'
                              : 'bg-[#dc2626] text-white'
                          }`}
                        >
                          {resultData.summary.overallResult}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-[#4b5563]">Grade</span>
                        <span className="font-bold text-neutral-950">
                          {resultData.summary.overallGrade}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-[#4b5563]">Percentage</span>
                        <span className="font-bold text-neutral-950 tabular-nums">
                          {formatMarksPercentage(resultData.summary.percentage)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* I. Remarks Card (Separate Card) */}
              <section
                aria-label="Exam remarks"
                className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3 flex items-start gap-2.5"
              >
                <MessageSquareText className="w-4 h-4 text-neutral-900 stroke-[2] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-neutral-950 leading-tight">
                    Remarks
                  </div>
                  <p className="text-[11.5px] text-[#374151] font-normal leading-snug mt-0.5 break-words">
                    {resultData.summary.remarksText || 'No remarks available.'}
                  </p>
                </div>
              </section>
            </div>
          )}
      </main>

      {/* Fixed Bottom Navigation (Preserves Exact 4-Tab StaffBottomNav) */}
      <StaffBottomNav
        activeTab="Home"
        onNavigateHome={onNavigateHome}
        onNavigateAttendance={onNavigateAttendance}
        onNavigateAnnouncements={onNavigateAnnouncements}
        onNavigateProfile={onNavigateProfile}
      />
    </div>
  );
}
