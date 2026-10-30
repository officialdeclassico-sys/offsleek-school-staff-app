/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Users,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Upload,
  Search,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Check,
} from 'lucide-react';
import {
  HomeworkAttachment,
  HomeworkStudentItem,
  HomeworkDraft,
  HomeworkRecord,
  getStudentsForClass,
  getAuthorizedClassesForStaff,
  getAuthorizedSubjectsForClass,
  formatDueDateFromDateKey,
  formatFileSize,
  getFileExtensionType,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from './services/homeworkService';
import StaffStatusBar from './components/StaffStatusBar';
import {
  addDaysIST,
  formatISTDateKey,
  formatISTShortWeekdayDate,
  formatISTTime12h,
  useISTCurrentDate,
} from './utils/dateTimeUtils';

interface LogHomeworkProps {
  staffId?: string;
  staffName?: string;
  initialDraft?: HomeworkDraft | null;
  onContinueToReview: (draft: HomeworkDraft) => void;
  onHomeworkSaved?: (record: HomeworkRecord) => void;
  onCancel?: () => void;
}

export default function LogHomework({
  staffId = 'T001',
  staffName = 'Ms. Priya Sharma',
  initialDraft = null,
  onContinueToReview,
  onCancel,
}: LogHomeworkProps) {
  // 1. Class & Subject Selection
  const authorizedClasses = useMemo(() => getAuthorizedClassesForStaff(staffId), [staffId]);
  const [selectedClass, setSelectedClass] = useState<string>(
    initialDraft?.grade || authorizedClasses[0]?.className || 'Grade 5 - A'
  );
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // Available subjects for currently selected class
  const availableSubjects = useMemo(() => {
    return getAuthorizedSubjectsForClass(staffId, selectedClass);
  }, [staffId, selectedClass]);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (initialDraft?.subject) return initialDraft.subject;
    return availableSubjects[0] || 'Mathematics';
  });
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);

  // Handle class change: auto-select first authorized subject & reload students
  const handleSelectClass = (className: string) => {
    setSelectedClass(className);
    setIsClassDropdownOpen(false);
    const newSubjects = getAuthorizedSubjectsForClass(staffId, className);
    if (!newSubjects.includes(selectedSubject)) {
      setSelectedSubject(newSubjects[0] || 'Mathematics');
    }
    // Refresh student roster
    const freshStudents = getStudentsForClass(className);
    setStudents(freshStudents);
  };

  // 2. Date Selection (Defaults to current IST date and auto-updates if unchanged across midnight)
  const { now, shortWeekdayDateStr, todayDateKey } = useISTCurrentDate();
  const [assignedDateStr, setAssignedDateStr] = useState(
    () => initialDraft?.assignedDateStr || formatISTShortWeekdayDate()
  );
  const [assignedDateKey, setAssignedDateKey] = useState(
    () => initialDraft?.assignedDateKey || formatISTDateKey()
  );
  const [hasCustomDateSelected, setHasCustomDateSelected] = useState(() =>
    Boolean(initialDraft?.assignedDateKey && initialDraft.assignedDateKey !== formatISTDateKey())
  );
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  React.useEffect(() => {
    if (!hasCustomDateSelected && !initialDraft) {
      setAssignedDateStr(shortWeekdayDateStr);
      setAssignedDateKey(todayDateKey);
    }
  }, [shortWeekdayDateStr, todayDateKey, hasCustomDateSelected, initialDraft]);

  const predefinedDates = useMemo(() => {
    const day0 = now;
    const day1 = addDaysIST(now, 1);
    const day2 = addDaysIST(now, 2);
    const day5 = addDaysIST(now, 5);
    return [
      {
        label: `${formatISTShortWeekdayDate(day0)} (Today)`,
        key: formatISTDateKey(day0),
        text: formatISTShortWeekdayDate(day0),
      },
      {
        label: `${formatISTShortWeekdayDate(day1)} (Tomorrow)`,
        key: formatISTDateKey(day1),
        text: formatISTShortWeekdayDate(day1),
      },
      {
        label: formatISTShortWeekdayDate(day2),
        key: formatISTDateKey(day2),
        text: formatISTShortWeekdayDate(day2),
      },
      {
        label: formatISTShortWeekdayDate(day5),
        key: formatISTDateKey(day5),
        text: formatISTShortWeekdayDate(day5),
      },
    ];
  }, [todayDateKey, now]);

  // 3. Homework Instructions
  const [instructions, setInstructions] = useState(() => initialDraft?.instructions || '');
  const maxInstructionChars = 500;

  // 4. File Attachments
  const [attachments, setAttachments] = useState<HomeworkAttachment[]>(
    () => initialDraft?.attachments || []
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5. Students Selection
  const [students, setStudents] = useState<HomeworkStudentItem[]>(() => {
    if (initialDraft?.students && initialDraft.students.length > 0) {
      return initialDraft.students.map((s) => ({ ...s }));
    }
    return getStudentsForClass(initialDraft?.grade || 'Grade 5 - A');
  });
  const [searchQuery, setSearchQuery] = useState('');

  // 6. Form Validation / Toast states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) => s.name.toLowerCase().includes(query) || s.rollNo.includes(query)
    );
  }, [students, searchQuery]);

  // Selected students count
  const selectedStudentCount = useMemo(() => {
    return students.filter((s) => s.isSelected).length;
  }, [students]);

  // Toggle individual student
  const handleToggleStudent = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, isSelected: !s.isSelected } : s))
    );
    if (validationError) setValidationError(null);
  };

  // Mark all students
  const handleMarkAll = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, isSelected: true })));
    if (validationError) setValidationError(null);
  };

  // Unmark all students
  const handleUnmarkAll = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, isSelected: false })));
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate extension
      const fileNameLower = file.name.toLowerCase();
      const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
      if (!hasValidExt) {
        setFileError(`"${file.name}" is not supported. Allowed: PDF, JPG, PNG, DOC, DOCX.`);
        continue;
      }

      // Validate size (10 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`"${file.name}" exceeds 10 MB limit (${formatFileSize(file.size)}).`);
        continue;
      }

      // Read file data
      const reader = new FileReader();
      const fileId = `att-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
      const fileType = getFileExtensionType(file.name);

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: fileId,
            name: file.name,
            size: file.size,
            sizeFormatted: formatFileSize(file.size),
            type: fileType,
            dataUrl,
            uploadedAt: formatISTTime12h(),
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Validate form and proceed to Review Homework screen (do NOT publish yet)
  const handleSaveHomework = () => {
    setValidationError(null);

    // Validation 1: Instructions required
    if (!instructions.trim()) {
      setValidationError('Please enter homework instructions for the students.');
      return;
    }

    // Validation 2: Character limit
    if (instructions.length > maxInstructionChars) {
      setValidationError('Homework instructions cannot exceed 500 characters.');
      return;
    }

    // Validation 3: At least 1 student selected
    const selectedStudents = students.filter((s) => s.isSelected);
    const selectedIds = selectedStudents.map((s) => s.id);
    if (selectedIds.length === 0) {
      setValidationError('Please select at least 1 student to assign homework.');
      return;
    }

    const draft: HomeworkDraft = {
      schoolId: 'greenwood-intl',
      schoolName: 'Greenwood International School',
      teacherId: staffId,
      teacherName: staffName,
      teacherRole: 'Class Teacher',
      grade: selectedClass,
      subject: selectedSubject,
      assignedDateStr,
      assignedDateKey,
      dueDateStr: formatDueDateFromDateKey(assignedDateKey),
      instructions: instructions.trim(),
      attachments,
      totalEligibleStudents: students.length,
      assignedStudentIds: selectedIds,
      assignedStudentCount: selectedIds.length,
      students: students.map((s) => ({ ...s })),
      studentsSnapshot: selectedStudents.map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.name,
        avatar: s.avatar,
      })),
    };

    onContinueToReview(draft);
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`absolute top-12 left-4 right-4 z-50 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-neutral-950 text-white border border-neutral-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-950 text-rose-100 border border-rose-800'
              : 'bg-neutral-900 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 stroke-[2.5]" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <StaffStatusBar />

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3.5 sm:px-4.5 pt-1.5 pb-24 space-y-3">
        
        {/* Page Title & Subtitle with Back Chevron matching Screen 1 reference */}
        <div className="pt-0.5 flex items-start gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Go back"
              className="mt-1 p-1 -ml-1 rounded-lg hover:bg-neutral-100 text-neutral-900 transition cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-neutral-900 tracking-tight leading-tight">
              Log Homework
            </h1>
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] font-normal mt-0.5">
              Assign homework for your class
            </p>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11.5px] rounded-xl p-2.5 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{validationError}</span>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stacked Date, Class, and Subject Selectors matching Screen 1 reference */}
        <div className="space-y-2 relative">
          
          {/* 1. Date Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsDateDropdownOpen(!isDateDropdownOpen);
                setIsClassDropdownOpen(false);
                setIsSubjectDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl p-2.5 sm:p-3 text-[12.5px] sm:text-[13px] font-medium text-neutral-900 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate">
                <CalendarIcon className="w-4 h-4 text-neutral-700 shrink-0" />
                <span className="truncate">{assignedDateStr}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            </button>

            {/* Date Dropdown */}
            {isDateDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-xl py-1 z-40 animate-in fade-in zoom-in-95">
                {predefinedDates.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setAssignedDateStr(item.text);
                      setAssignedDateKey(item.key);
                      setHasCustomDateSelected(item.key !== todayDateKey);
                      setIsDateDropdownOpen(false);
                      showToast('info', `Date set to ${item.text}`);
                    }}
                    className={`w-full text-left px-3 py-2 text-[11.5px] sm:text-[12px] transition flex items-center justify-between ${
                      assignedDateKey === item.key
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {assignedDateKey === item.key && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Class Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsClassDropdownOpen(!isClassDropdownOpen);
                setIsDateDropdownOpen(false);
                setIsSubjectDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl p-2.5 sm:p-3 text-[12.5px] sm:text-[13px] font-medium text-neutral-900 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Users className="w-4 h-4 text-neutral-700 shrink-0" />
                <span className="truncate">{selectedClass}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            </button>

            {/* Class Dropdown */}
            {isClassDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-xl py-1 z-40 animate-in fade-in zoom-in-95">
                {authorizedClasses.map((item) => (
                  <button
                    key={item.classId}
                    type="button"
                    onClick={() => handleSelectClass(item.className)}
                    className={`w-full text-left px-3 py-2 text-[11.5px] sm:text-[12px] transition flex items-center justify-between ${
                      selectedClass === item.className
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{item.className}</div>
                      <div className={`text-[10px] ${selectedClass === item.className ? 'text-neutral-300' : 'text-neutral-400'}`}>
                        {item.role} ({item.studentCount} students)
                      </div>
                    </div>
                    {selectedClass === item.className && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Subject Selector Directly Below */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsSubjectDropdownOpen(!isSubjectDropdownOpen);
              setIsDateDropdownOpen(false);
              setIsClassDropdownOpen(false);
            }}
            className="w-full flex items-center justify-between bg-white border border-[#e5e7eb] hover:border-neutral-400 rounded-xl p-2.5 sm:p-3 text-[12.5px] sm:text-[13px] font-medium text-neutral-900 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5 truncate">
              <BookOpen className="w-4 h-4 text-neutral-700 shrink-0" />
              <span className="truncate">{selectedSubject}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
          </button>

          {/* Subject Dropdown */}
          {isSubjectDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-xl py-1 z-40 animate-in fade-in zoom-in-95">
              {availableSubjects.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(subj);
                    setIsSubjectDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[11.5px] sm:text-[12px] transition flex items-center justify-between ${
                    selectedSubject === subj
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-800 hover:bg-neutral-50'
                  }`}
                >
                  <span>{subj}</span>
                  {selectedSubject === subj && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Homework Instructions Multiline Input */}
        <div className="space-y-1.5">
          <label className="block text-[13px] sm:text-[13.5px] font-bold text-neutral-900">
            Homework Instructions
          </label>
          <div className="border border-[#e5e7eb] rounded-2xl bg-white p-3 focus-within:border-neutral-400 transition">
            <textarea
              rows={4}
              maxLength={maxInstructionChars}
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Enter homework instructions for the students..."
              className="w-full bg-transparent resize-none text-[12.5px] sm:text-[13px] text-neutral-900 placeholder:text-[#9ca3af] outline-none leading-relaxed min-h-[96px]"
            />
          </div>
          <div className="text-[11px] text-neutral-400 font-medium text-right pr-0.5">
            {instructions.length} / {maxInstructionChars}
          </div>
        </div>

        {/* 5. Attach Files (Optional) */}
        <div className="space-y-1.5">
          <label className="block text-[13px] sm:text-[13.5px] font-bold text-neutral-900">
            Attach Files (Optional)
          </label>

          {/* Hidden real file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
          />

          {/* Dashed Upload Area (Exact Replica of Reference) */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#d1d5db] hover:border-neutral-500 rounded-2xl bg-[#fcfdfd] hover:bg-[#f8f9fa] transition p-4 sm:p-5 text-center cursor-pointer flex flex-col items-center justify-center select-none"
          >
            <Upload className="w-6 h-6 text-neutral-800 stroke-[1.8]" />
            <div className="text-[12.5px] sm:text-[13px] font-semibold text-neutral-900 mt-2">
              Tap to upload files
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-[#8e95a2] mt-0.5">
              PDF, JPG, PNG, DOC, DOCX (Max 10 MB per file)
            </div>
          </div>

          {/* File Error Message */}
          {fileError && (
            <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Uploaded Files List */}
          {attachments.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-neutral-600 shrink-0" />
                    <span className="font-semibold text-neutral-900 truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <span className="text-[10.5px] text-neutral-400 shrink-0">
                      ({file.sizeFormatted})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(file.id)}
                    className="p-1 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Select Students Card Container */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Card Title */}
          <h2 className="text-[13.5px] sm:text-[14px] font-bold text-neutral-900 leading-tight">
            Select Students
          </h2>

          {/* Search Input */}
          <div className="bg-[#f8f9fa] border border-[#eef0f3] rounded-xl px-3 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or roll number..."
              className="w-full bg-transparent text-[12px] sm:text-[12.5px] text-neutral-900 placeholder:text-neutral-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Total Students Count & Mark / Unmark Controls */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[12px] sm:text-[12.5px] text-neutral-500 font-medium">
              {students.length} Students
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleMarkAll}
                className="border border-[#e5e7eb] rounded-xl px-3 py-1.5 text-[11.5px] font-semibold text-neutral-800 hover:bg-neutral-50 active:scale-95 transition cursor-pointer"
              >
                Mark All
              </button>
              <button
                type="button"
                onClick={handleUnmarkAll}
                className="border border-[#e5e7eb] rounded-xl px-3 py-1.5 text-[11.5px] font-semibold text-neutral-800 hover:bg-neutral-50 active:scale-95 transition cursor-pointer"
              >
                Unmark All
              </button>
            </div>
          </div>

          {/* Students Roster Rows (Exact Visual Match to Reference) */}
          <div className="space-y-3 pt-1">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No students match "{searchQuery}"
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = student.isSelected;
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between py-0.5 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Roll Number */}
                      <span className="text-[12px] font-medium text-neutral-400 w-5 shrink-0 text-left">
                        {student.rollNo}
                      </span>

                      {/* Avatar Image */}
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 border border-neutral-100 shadow-2xs"
                        onError={(e) => {
                          // Fallback to initials avatar if image file fails to load
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div
                        style={{ display: 'none' }}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-200 border border-neutral-300 items-center justify-center text-xs font-bold text-neutral-700 shrink-0"
                      >
                        {student.name.charAt(0)}
                      </div>

                      {/* Student Name */}
                      <span className="text-[13px] sm:text-[13.5px] font-semibold text-neutral-900 truncate ml-0.5">
                        {student.name}
                      </span>
                    </div>

                    {/* Minimal Toggle Switch (Exact Replica of Reference) */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isSelected}
                      onClick={() => handleToggleStudent(student.id)}
                      className={`relative inline-flex h-6 w-11 sm:h-6.5 sm:w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out outline-none ${
                        isSelected ? 'bg-black' : 'bg-[#dcdfe4]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 sm:h-5.5 sm:w-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isSelected ? 'translate-x-5 sm:translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Fixed Black Bottom Button (Exact Replica of Reference) */}
      <div className="shrink-0 bg-white/95 backdrop-blur-xs pt-2 pb-2.5 px-3.5 sm:px-4.5 border-t border-[#f4f5f7] z-20">
        <button
          type="button"
          onClick={handleSaveHomework}
          className="w-full py-3.5 rounded-2xl bg-black text-white text-[13.5px] sm:text-[14px] font-bold shadow-md hover:bg-neutral-900 active:scale-[0.99] transition cursor-pointer flex items-center justify-center"
        >
          {`Save Homework (${selectedStudentCount} Students)`}
        </button>

        {/* Device Home Bar */}
        <div className="w-28 sm:w-32 h-1 bg-black rounded-full mx-auto mt-2" />
      </div>

    </div>
  );
}
