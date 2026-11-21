/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Sparkles,
  Users,
} from 'lucide-react';
import StaffBottomNav from './components/StaffBottomNav';
import {
  buildDateKey,
  buildMonthCategoryIndicatorMap,
  CALENDAR_CATEGORY_DOT_CLASSES,
  CalendarCategory,
  CalendarEventDetail,
  CalendarSubscriptionStatus,
  formatMonthYearTitle,
  getActiveStaffCalendarContext,
  getDaysInMonthUTC,
  getEventsForExactDate,
  getMonthLeadingPaddingDaysUTC,
  getMonthTrailingPaddingDaysUTC,
  PRIMARY_LEGEND_CATEGORIES,
  subscribeToStaffCalendarEvents,
} from './services/calendarService';
import {
  formatISTFullDate,
  formatISTShortWeekdayDate,
  getISTDateParts,
  parseDateKeySafe,
  useISTCurrentDate,
} from './utils/dateTimeUtils';

interface SchoolCalendarScreenProps {
  onBack: () => void;
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateProfile: () => void;
  initialDateKey?: string;
  initialEvent?: CalendarEventDetail | null;
  highlightEventId?: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function getCategoryIcon(category: CalendarCategory) {
  switch (category) {
    case 'Holiday':
      return Sparkles;
    case 'Exam':
      return FileText;
    case 'Activity':
      return Activity;
    case 'Meeting':
      return Users;
    case 'Classes':
      return BookOpen;
    case 'Event':
    default:
      return Calendar;
  }
}

export default function SchoolCalendarScreen({
  onBack,
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateProfile,
  initialDateKey,
  initialEvent = null,
  highlightEventId,
}: SchoolCalendarScreenProps) {
  const istToday = useISTCurrentDate();
  const staffContext = useMemo(() => getActiveStaffCalendarContext(), []);

  const resolvedInitialDate = useMemo(() => {
    if (initialEvent) {
      return {
        year: initialEvent.year,
        monthIndex: initialEvent.monthIndex,
        day: initialEvent.dayNumber,
      };
    }
    if (initialDateKey && /^\d{4}-\d{2}-\d{2}$/.test(initialDateKey)) {
      const parts = getISTDateParts(parseDateKeySafe(initialDateKey));
      return {
        year: parts.year,
        monthIndex: parts.month - 1,
        day: parts.day,
      };
    }
    return {
      year: istToday.year,
      monthIndex: istToday.monthIndex,
      day: istToday.day,
    };
  }, [initialEvent, initialDateKey, istToday.year, istToday.monthIndex, istToday.day]);

  // Calendar view state (Month + Year + Selected Day preserved across Event Details navigation)
  const [viewYear, setViewYear] = useState<number>(() => resolvedInitialDate.year);
  const [viewMonthIndex, setViewMonthIndex] = useState<number>(() => resolvedInitialDate.monthIndex);
  const [selectedDay, setSelectedDay] = useState<number>(() => resolvedInitialDate.day);

  // Full-page replacement Event Details state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventDetail | null>(initialEvent);
  const activeHighlightId = highlightEventId || initialEvent?.id || null;

  // Calendar data & backend connection state
  const [events, setEvents] = useState<CalendarEventDetail[]>([]);
  const [status, setStatus] = useState<CalendarSubscriptionStatus>({
    loading: true,
    isLiveFirestore: false,
    requiresFirebaseAuth: false,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeToStaffCalendarEvents(
      staffContext,
      (loadedEvents, nextStatus) => {
        setEvents(loadedEvents);
        setStatus(nextStatus);
      }
    );
    return () => unsubscribe();
  }, [staffContext]);

  // Escape key returns from Event Details to Calendar cleanly
  useEffect(() => {
    if (!selectedEvent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent]);

  const handlePrevMonth = () => {
    const nextYear = viewMonthIndex === 0 ? viewYear - 1 : viewYear;
    const nextMonthIndex = viewMonthIndex === 0 ? 11 : viewMonthIndex - 1;
    setViewYear(nextYear);
    setViewMonthIndex(nextMonthIndex);
    setSelectedDay(
      nextYear === istToday.year && nextMonthIndex === istToday.monthIndex
        ? istToday.day
        : 1
    );
  };

  const handleNextMonth = () => {
    const nextYear = viewMonthIndex === 11 ? viewYear + 1 : viewYear;
    const nextMonthIndex = viewMonthIndex === 11 ? 0 : viewMonthIndex + 1;
    setViewYear(nextYear);
    setViewMonthIndex(nextMonthIndex);
    setSelectedDay(
      nextYear === istToday.year && nextMonthIndex === istToday.monthIndex
        ? istToday.day
        : 1
    );
  };

  const daysInMonth = useMemo(
    () => getDaysInMonthUTC(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );

  // Guard selected day against shorter months if needed
  const safeSelectedDay = Math.min(Math.max(1, selectedDay), daysInMonth);

  const leadingPaddingDays = useMemo(
    () => getMonthLeadingPaddingDaysUTC(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );

  const trailingPaddingDays = useMemo(
    () => getMonthTrailingPaddingDaysUTC(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );

  const monthLabel = useMemo(
    () => formatMonthYearTitle(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex]
  );

  const monthIndicatorMap = useMemo(
    () => buildMonthCategoryIndicatorMap(events, viewYear, viewMonthIndex),
    [events, viewYear, viewMonthIndex]
  );

  const selectedDateKey = useMemo(
    () => buildDateKey(viewYear, viewMonthIndex, safeSelectedDay),
    [viewYear, viewMonthIndex, safeSelectedDay]
  );

  const selectedDateHeading = useMemo(() => {
    const formatted = formatISTShortWeekdayDate(parseDateKeySafe(selectedDateKey));
    return `Events on ${formatted}`;
  }, [selectedDateKey]);

  const selectedDateEvents = useMemo(
    () => getEventsForExactDate(events, viewYear, viewMonthIndex, safeSelectedDay),
    [events, viewYear, viewMonthIndex, safeSelectedDay]
  );

  const hasClassesEvents = useMemo(
    () => events.some((ev) => ev.category === 'Classes'),
    [events]
  );

  const legendCategories = useMemo(
    () =>
      hasClassesEvents
        ? ([...PRIMARY_LEGEND_CATEGORIES, 'Classes'] as CalendarCategory[])
        : PRIMARY_LEGEND_CATEGORIES,
    [hasClassesEvents]
  );

  // ============================================================================
  // VIEW 2: FULL-PAGE EVENT DETAILS REPLACEMENT SCREEN (Phase 7)
  // ============================================================================
  if (selectedEvent) {
    const HeroIcon = getCategoryIcon(selectedEvent.category);

    return (
      <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-6">
          {/* Event Details ScreenHeader */}
          <div className="pt-[max(0.875rem,env(safe-area-inset-top))] px-4 pb-1.5 flex items-start justify-between">
            <div className="flex items-start min-w-0">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Back to Calendar"
                title="Back to Calendar"
                className="w-10 h-10 rounded-full -ml-2 -mt-1 flex items-center justify-center text-black hover:bg-neutral-100 active:scale-95 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <ChevronLeft className="w-[18px] h-[18px] stroke-[2.2]" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-black tracking-tight leading-snug">
                  Event Details
                </h1>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="text-xs text-neutral-500 font-normal mt-0.5 hover:text-black transition-colors cursor-pointer text-left"
                >
                  Back to Calendar
                </button>
              </div>
            </div>
          </div>

          {/* A. Hero Event Card */}
          <div className="px-5 pt-3">
            <div className="bg-white border border-neutral-100 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                  <HeroIcon className="w-5 h-5 stroke-[1.9]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-black leading-snug break-words">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    {selectedEvent.dateStr}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {selectedEvent.time}
                  </p>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-neutral-600">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="break-words">{selectedEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/80">
                  {selectedEvent.category}
                </span>
                {(selectedEvent.isSample || selectedEvent.source === 'sample') && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-50 text-neutral-500 border border-neutral-200">
                    Sample Event
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* B. Description Section */}
          <div className="px-5 pt-5 space-y-2">
            <h3 className="text-sm font-bold text-black">Description</h3>
            <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line break-words">
              {selectedEvent.description}
            </p>
            <div className="pt-3 border-b border-neutral-100" />
          </div>

          {/* C. Additional Information Card */}
          <div className="px-5 pt-4 space-y-2.5">
            <h3 className="text-sm font-bold text-black">Additional Information</h3>
            <div className="bg-white border border-neutral-100 rounded-3xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] divide-y divide-neutral-100/80">
              {selectedEvent.classesInvolved && (
                <div className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-black shrink-0">
                    <BookOpen className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span>Classes Involved</span>
                  </span>
                  <span className="text-neutral-600 text-right font-medium break-words">
                    {selectedEvent.classesInvolved}
                  </span>
                </div>
              )}

              {selectedEvent.syllabus && (
                <div className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-black shrink-0">
                    <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span>Syllabus</span>
                  </span>
                  <span className="text-neutral-600 text-right font-medium break-words">
                    {selectedEvent.syllabus}
                  </span>
                </div>
              )}

              <div className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-semibold text-black shrink-0">
                  <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span>Date &amp; Time</span>
                </span>
                <span className="text-neutral-600 text-right font-medium break-words">
                  {selectedEvent.time
                    ? `${selectedEvent.dateStr} • ${selectedEvent.time}`
                    : selectedEvent.dateStr}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-black shrink-0">
                    <MapPin className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span>Location</span>
                  </span>
                  <span className="text-neutral-600 text-right font-medium break-words">
                    {selectedEvent.location}
                  </span>
                </div>
              )}

              {selectedEvent.itemsToBring && (
                <div className="py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-black shrink-0">
                    <Pencil className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span>Items to Bring</span>
                  </span>
                  <span className="text-neutral-600 text-right font-medium break-words">
                    {selectedEvent.itemsToBring}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

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

  // ============================================================================
  // VIEW 1: MONTHLY SCHOOL CALENDAR VIEW (Phases 2–6)
  // ============================================================================
  return (
    <div className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden select-none text-neutral-900 font-sans">
      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-6">
        {/* A. Header (Exact Parent App Design) */}
        <div className="pt-[max(0.875rem,env(safe-area-inset-top))] px-4 pb-1.5 flex items-start justify-between">
          <div className="flex items-start min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Dashboard"
              title="Back"
              className="w-10 h-10 rounded-full -ml-2 -mt-1 flex items-center justify-center text-black hover:bg-neutral-100 active:scale-95 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <ChevronLeft className="w-[18px] h-[18px] stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-black tracking-tight leading-snug">
                School Calendar
              </h1>
              <p className="text-xs text-neutral-500 font-normal mt-0.5">
                Stay updated with important dates
              </p>
            </div>
          </div>
        </div>

        {/* B. Main Calendar Card Enclosure */}
        <div className="px-5 pt-2">
          <div className="bg-white border border-neutral-100 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
            {/* C. Month Navigation */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2]" />
              </button>

              <h2 className="text-sm font-bold text-black">{monthLabel}</h2>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                <ChevronRight className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Weekday Headings (Sunday First) */}
            <div className="grid grid-cols-7 text-center">
              {WEEKDAY_LABELS.map((dayLabel) => (
                <div
                  key={dayLabel}
                  className="text-[11px] font-medium text-neutral-400"
                >
                  {dayLabel}
                </div>
              ))}
            </div>

            {/* Monthly Calendar Grid */}
            <div className="grid grid-cols-7 text-center gap-y-2" role="grid" aria-label={monthLabel}>
              {/* Leading padding dates from previous month */}
              {leadingPaddingDays.map((padDay) => (
                <div
                  key={`prev-${padDay}`}
                  className="h-11 flex flex-col items-center justify-center"
                >
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    tabIndex={-1}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold opacity-35 text-neutral-400 cursor-default"
                  >
                    {padDay}
                  </button>
                </div>
              ))}

              {/* Active month dates */}
              {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map((day) => {
                const isSelected = safeSelectedDay === day;
                const isToday =
                  viewYear === istToday.year &&
                  viewMonthIndex === istToday.monthIndex &&
                  day === istToday.day;

                const dayCategories = monthIndicatorMap.get(day) || [];
                const visibleDots = dayCategories.slice(0, 3);
                const dateKey = buildDateKey(viewYear, viewMonthIndex, day);
                const fullAriaDate = formatISTFullDate(parseDateKeySafe(dateKey));
                const dayEventCount = getEventsForExactDate(
                  events,
                  viewYear,
                  viewMonthIndex,
                  day
                ).length;

                const ariaLabel =
                  dayEventCount > 0
                    ? `${fullAriaDate}, ${dayEventCount} ${dayEventCount === 1 ? 'event' : 'events'}`
                    : fullAriaDate;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    aria-label={ariaLabel}
                    aria-selected={isSelected}
                    onClick={() => setSelectedDay(day)}
                    className="h-11 flex flex-col items-center justify-center cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 group"
                  >
                    <span
                      className={
                        isSelected
                          ? `w-8 h-8 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center transition-colors ${
                              isToday ? 'ring-2 ring-black/20 ring-offset-1' : ''
                            }`
                          : isToday
                            ? 'w-7 h-7 rounded-full ring-1 ring-black bg-neutral-100 text-xs font-semibold text-neutral-800 flex items-center justify-center transition-colors'
                            : 'w-7 h-7 rounded-full text-xs font-semibold text-neutral-800 group-hover:bg-neutral-100 flex items-center justify-center transition-colors'
                      }
                    >
                      {day}
                    </span>

                    <span
                      className="flex items-center justify-center gap-0.5 mt-0.5 h-1.5"
                      aria-hidden="true"
                    >
                      {visibleDots.map((cat) => (
                        <span
                          key={cat}
                          className={`w-1 h-1 rounded-full ${CALENDAR_CATEGORY_DOT_CLASSES[cat]}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}

              {/* Trailing padding dates from next month */}
              {trailingPaddingDays.map((padDay) => (
                <div
                  key={`next-${padDay}`}
                  className="h-11 flex flex-col items-center justify-center"
                >
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    tabIndex={-1}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold opacity-35 text-neutral-400 cursor-default"
                  >
                    {padDay}
                  </button>
                </div>
              ))}
            </div>

            {/* Phase 5: Event Legend (Informational) */}
            <div className="pt-2 border-t border-neutral-100/80 flex items-center justify-between text-[10.5px] flex-wrap gap-1">
              {legendCategories.map((category) => (
                <div
                  key={category}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-100 text-neutral-600"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${CALENDAR_CATEGORY_DOT_CLASSES[category]}`}
                  />
                  <span>{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase 6: Selected-Date Event List */}
        <div className="px-5 pt-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-black tracking-tight">
              {selectedDateHeading}
            </h3>
            {status.loading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </span>
            )}
          </div>

          {status.error && (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2 text-xs text-rose-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{status.error}</span>
            </div>
          )}

          {!status.loading && status.requiresFirebaseAuth && !status.error && (
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl px-3.5 py-2.5 flex items-start gap-2 text-[11px] text-neutral-600">
              <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
              <span>
                Showing sample calendar events and local assessments for{' '}
                <span className="font-semibold text-neutral-800">
                  {staffContext.schoolName}
                </span>{' '}
                ({staffContext.academicYear}). Sign in with Firebase Authentication to sync official school events.
              </span>
            </div>
          )}

          {selectedDateEvents.length === 0 ? (
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 text-center space-y-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-500 mx-auto mb-2">
                <Calendar className="w-5 h-5 stroke-[1.8]" />
              </div>
              <p className="text-xs font-bold text-black">
                No events scheduled for this day
              </p>
              <p className="text-[11px] text-neutral-500">
                Select another date with event indicators above.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDateEvents.map((eventItem) => {
                const ItemIcon = getCategoryIcon(eventItem.category);
                const isHighlighted = activeHighlightId === eventItem.id;
                return (
                  <button
                    key={eventItem.id}
                    type="button"
                    onClick={() => setSelectedEvent(eventItem)}
                    className={`w-full text-left bg-white rounded-2xl p-3.5 flex items-center justify-between hover:border-neutral-300 transition-all cursor-pointer shadow-[0_1px_4px_rgba(0,0,0,0.02)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      isHighlighted
                        ? 'border border-black ring-1 ring-black/15'
                        : 'border border-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-black shrink-0">
                        <ItemIcon className="w-4.5 h-4.5 stroke-[1.9]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-black truncate leading-snug">
                          {eventItem.title}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                          {eventItem.time}
                        </div>
                        {eventItem.location && (
                          <div className="flex items-center gap-1 mt-0.5 min-w-0">
                            <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span className="text-[10.5px] text-neutral-500 truncate">
                              {eventItem.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 ml-2 flex flex-col items-end gap-1">
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                        {eventItem.category}
                      </span>
                      {(eventItem.isSample || eventItem.source === 'sample') && (
                        <span className="text-[9.5px] font-medium text-neutral-400">
                          Sample
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
