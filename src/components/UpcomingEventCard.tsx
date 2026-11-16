/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CalendarEventDetail,
  DateTileAccent,
  getCategoryDateAccent,
} from '../services/calendarService';
import { getISTDateParts, parseDateKeySafe } from '../utils/dateTimeUtils';

interface UpcomingEventCardProps {
  event: CalendarEventDetail;
  todayDateKey: string;
  onSelect: (event: CalendarEventDetail) => void;
  isClone?: boolean;
  cardRef?: React.Ref<HTMLButtonElement>;
}

const ACCENT_CLASSES: Record<DateTileAccent, string> = {
  orange: 'bg-orange-50/90 border border-orange-100/80 text-orange-500',
  purple: 'bg-purple-50/90 border border-purple-100/80 text-purple-600',
  green: 'bg-emerald-50/90 border border-emerald-100/80 text-emerald-600',
};

export function UpcomingEventSkeletonCards() {
  return (
    <div
      className="flex items-stretch gap-2.5 w-full overflow-hidden py-0.5"
      aria-busy="true"
      aria-label="Loading upcoming events"
    >
      {[0, 1].map((idx) => (
        <div
          key={idx}
          className="w-[190px] min-h-[98px] shrink-0 p-3 rounded-[16px] bg-white border border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-2.5 animate-pulse"
        >
          <div className="w-[44px] h-[56px] rounded-[12px] bg-neutral-100 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-4/5 rounded bg-neutral-100" />
            <div className="h-2.5 w-full rounded bg-neutral-100" />
            <div className="h-2 w-1/2 rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UpcomingEventCard({
  event,
  todayDateKey,
  onSelect,
  isClone = false,
  cardRef,
}: UpcomingEventCardProps) {
  // For active multi-day events that started prior to today, show today's IST date on the tile
  const displayDateKey =
    event.endDateKey && event.dateKey < todayDateKey && event.endDateKey >= todayDateKey
      ? todayDateKey
      : event.dateKey;

  const dateParts = getISTDateParts(parseDateKeySafe(displayDateKey));
  const dayDisplay = String(dateParts.day);
  const monthDisplay = dateParts.monthShort.slice(0, 3).toUpperCase();
  const accent = getCategoryDateAccent(event.category);

  const trimmedDescription = event.description?.trim();
  const trimmedTime = event.time?.trim();

  return (
    <button
      ref={cardRef}
      type="button"
      tabIndex={isClone ? -1 : 0}
      aria-hidden={isClone ? true : undefined}
      onClick={() => onSelect(event)}
      className="w-[190px] min-h-[98px] shrink-0 p-[12px] rounded-[16px] bg-white border border-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-neutral-300 active:scale-[0.99] transition-all flex items-center gap-[10px] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
    >
      {/* Left Date Tile (44x56, 12px radius) */}
      <div
        className={`w-[44px] h-[56px] rounded-[12px] shrink-0 flex flex-col items-center justify-center ${ACCENT_CLASSES[accent]}`}
      >
        <span className="text-[16px] font-bold leading-none tabular-nums">
          {dayDisplay}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider mt-1 leading-none">
          {monthDisplay}
        </span>
      </div>

      {/* Right Event Information Stack */}
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="text-[12px] font-bold text-black truncate leading-snug">
          {event.title}
        </div>
        {trimmedDescription && (
          <p className="text-[10.5px] text-neutral-500 leading-[1.35] line-clamp-2 mt-0.5 break-words">
            {trimmedDescription}
          </p>
        )}
        {trimmedTime && (
          <div className="text-[10px] font-medium text-neutral-400 tabular-nums truncate mt-1">
            {trimmedTime}
          </div>
        )}
      </div>
    </button>
  );
}
