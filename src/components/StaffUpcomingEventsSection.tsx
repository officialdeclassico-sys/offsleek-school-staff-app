/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CalendarDays, RefreshCw } from 'lucide-react';
import {
  CalendarEventDetail,
  CalendarSubscriptionStatus,
  getActiveStaffCalendarContext,
  getUpcomingStaffEvents,
  subscribeToStaffCalendarEvents,
} from '../services/calendarService';
import { useISTCurrentDate } from '../utils/dateTimeUtils';
import { UpcomingEventSkeletonCards } from './UpcomingEventCard';
import UpcomingEventsCarousel from './UpcomingEventsCarousel';

interface StaffUpcomingEventsSectionProps {
  onViewAll: () => void;
  onSelectEvent: (event: CalendarEventDetail) => void;
  isOverlayOpen?: boolean;
}

export default function StaffUpcomingEventsSection({
  onViewAll,
  onSelectEvent,
  isOverlayOpen = false,
}: StaffUpcomingEventsSectionProps) {
  const { todayDateKey } = useISTCurrentDate();
  const staffContext = useMemo(() => getActiveStaffCalendarContext(), []);

  const [events, setEvents] = useState<CalendarEventDetail[]>([]);
  const [status, setStatus] = useState<CalendarSubscriptionStatus>({
    loading: true,
    isLiveFirestore: false,
    requiresFirebaseAuth: false,
    error: null,
  });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToStaffCalendarEvents(
      staffContext,
      (loadedEvents, nextStatus) => {
        setEvents(loadedEvents);
        setStatus(nextStatus);
      }
    );

    const handleRefresh = () => {
      setRefreshTick((t) => t + 1);
    };

    window.addEventListener('storage', handleRefresh);
    window.addEventListener('offsleek_calendar_updated', handleRefresh);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('offsleek_calendar_updated', handleRefresh);
    };
  }, [staffContext, refreshTick]);

  const upcomingEvents = useMemo(
    () => getUpcomingStaffEvents(events, todayDateKey),
    [events, todayDateKey]
  );

  return (
    <section aria-labelledby="staff-upcoming-events-heading" className="space-y-2 pt-0.5">
      {/* A. Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-neutral-900 stroke-[2] shrink-0" />
          <h3
            id="staff-upcoming-events-heading"
            className="text-[14px] font-bold text-[#000000] tracking-tight"
          >
            Upcoming Events
          </h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[12px] font-semibold text-neutral-600 hover:text-black underline underline-offset-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm"
        >
          View All
        </button>
      </div>

      {/* Loading / Error / Empty / Carousel States */}
      {status.loading ? (
        <UpcomingEventSkeletonCards />
      ) : status.error ? (
        <div
          role="alert"
          className="bg-white border border-rose-200 rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-black">
                Unable to load upcoming events
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 break-words">
                {status.error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-[11px] font-semibold text-black transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      ) : upcomingEvents.length === 0 ? (
        <div className="bg-white border border-neutral-100 rounded-2xl p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-1">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 mx-auto mb-1.5">
            <Calendar className="w-4.5 h-4.5 stroke-[1.8]" />
          </div>
          <div className="text-xs font-bold text-black">No Upcoming Events</div>
          <p className="text-[11px] text-neutral-500">
            There are no upcoming events scheduled at the moment.
          </p>
        </div>
      ) : (
        <UpcomingEventsCarousel
          events={upcomingEvents}
          todayDateKey={todayDateKey}
          onSelectEvent={onSelectEvent}
          isOverlayOpen={isOverlayOpen}
        />
      )}
    </section>
  );
}
