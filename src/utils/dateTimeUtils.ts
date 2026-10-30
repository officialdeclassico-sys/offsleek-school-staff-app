import { useState, useEffect, useCallback } from 'react';

export const SCHOOL_TIME_ZONE = 'Asia/Kolkata';

// Optional controlled test clock override for deterministic testing of midnight rollover and timestamps
let testClockOverrideMs: number | null = null;

export const setTestClockOverride = (dateOrIso: Date | string | number | null): void => {
  if (dateOrIso === null) {
    testClockOverrideMs = null;
  } else if (dateOrIso instanceof Date) {
    testClockOverrideMs = dateOrIso.getTime();
  } else if (typeof dateOrIso === 'number') {
    testClockOverrideMs = dateOrIso;
  } else {
    const parsed = new Date(dateOrIso);
    testClockOverrideMs = isNaN(parsed.getTime()) ? null : parsed.getTime();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('offsleek_clock_override'));
  }
};

export const getNow = (): Date => {
  return testClockOverrideMs !== null ? new Date(testClockOverrideMs) : new Date();
};

export const getNowISO = (): string => {
  return getNow().toISOString();
};

const toValidDate = (input?: Date | string | number): Date => {
  if (input === undefined || input === null) return getNow();
  if (input instanceof Date) return isNaN(input.getTime()) ? getNow() : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? getNow() : d;
  }
  // Safe handling for YYYY-MM-DD date-only strings so they do not shift across timezones
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return parseDateKeySafe(input.trim());
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? getNow() : d;
};

export interface ISTDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  yearStr: string;
  monthStr: string; // '01'-'12'
  dayStr: string; // '01'-'31'
  weekdayLong: string; // 'Tuesday'
  weekdayShort: string; // 'Tue'
  monthLong: string; // 'October'
  monthShort: string; // 'Oct'
  hour24: number; // 0-23
  hour12Str: string; // '09'
  hour12Unpadded: string; // '9'
  minuteStr: string; // '41'
  secondStr: string; // '05'
  dayPeriod: string; // 'AM' | 'PM'
}

export const getISTDateParts = (input?: Date | string | number): ISTDateParts => {
  const date = toValidDate(input);

  const longParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(date);

  const shortParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).formatToParts(date);

  const numericParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const time12Parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHOOL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value || '';

  const yearStr = getPart(numericParts, 'year');
  const monthStr = getPart(numericParts, 'month');
  const dayStr = getPart(numericParts, 'day');
  const hour24Str = getPart(numericParts, 'hour');
  const minuteStr = getPart(numericParts, 'minute');
  const secondStr = getPart(numericParts, 'second');

  const weekdayLong = getPart(longParts, 'weekday');
  const monthLong = getPart(longParts, 'month');
  const weekdayShort = getPart(shortParts, 'weekday');
  const monthShort = getPart(shortParts, 'month');

  const hour12Raw = getPart(time12Parts, 'hour');
  const hour12Num = parseInt(hour12Raw, 10) || 12;
  const hour12Str = String(hour12Num).padStart(2, '0');
  const hour12Unpadded = String(hour12Num);
  const dayPeriod = (getPart(time12Parts, 'dayPeriod') || 'AM').toUpperCase();

  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
    yearStr,
    monthStr,
    dayStr,
    weekdayLong,
    weekdayShort,
    monthLong,
    monthShort,
    hour24: parseInt(hour24Str, 10) || 0,
    hour12Str,
    hour12Unpadded,
    minuteStr,
    secondStr,
    dayPeriod,
  };
};

/**
 * Formats date as "Tuesday, 27 October 2026" in Asia/Kolkata
 */
export const formatISTFullDate = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.weekdayLong}, ${p.day} ${p.monthLong} ${p.yearStr}`;
};

/**
 * Formats date as "Tue, 27 Oct 2026" in Asia/Kolkata
 */
export const formatISTShortWeekdayDate = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.weekdayShort}, ${p.day} ${p.monthShort} ${p.yearStr}`;
};

/**
 * Formats date as "27 Oct 2026" in Asia/Kolkata
 */
export const formatISTDateMedium = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.day} ${p.monthShort} ${p.yearStr}`;
};

/**
 * Formats date as "27 Oct" in Asia/Kolkata
 */
export const formatISTDateShort = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.day} ${p.monthShort}`;
};

/**
 * Formats date as "YYYY-MM-DD" in Asia/Kolkata
 */
export const formatISTDateKey = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.yearStr}-${p.monthStr}-${p.dayStr}`;
};

/**
 * Formats date as "YYYYMMDD" in Asia/Kolkata (used for request IDs)
 */
export const formatISTCompactDateKey = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.yearStr}${p.monthStr}${p.dayStr}`;
};

/**
 * Formats time as "09:41 AM" in Asia/Kolkata
 */
export const formatISTTime12h = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.hour12Str}:${p.minuteStr} ${p.dayPeriod}`;
};

/**
 * Formats time as "9:41" for mobile status bar in Asia/Kolkata
 */
export const formatISTStatusBarTime = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.hour12Unpadded}:${p.minuteStr}`;
};

/**
 * Formats date and time as "27 Oct 2026, 09:41 AM" in Asia/Kolkata
 */
export const formatISTDateTime = (input?: Date | string | number): string => {
  return `${formatISTDateMedium(input)}, ${formatISTTime12h(input)}`;
};

/**
 * Formats short date and time as "27 Oct, 09:41 AM" in Asia/Kolkata
 */
export const formatISTShortDateTime = (input?: Date | string | number): string => {
  return `${formatISTDateShort(input)}, ${formatISTTime12h(input)}`;
};

/**
 * Formats Month and Year as "October 2026" in Asia/Kolkata
 */
export const formatISTMonthYear = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.monthLong} ${p.yearStr}`;
};

/**
 * Safely parses a "YYYY-MM-DD" string into a Date anchored at 12:00 UTC
 * so it never shifts across calendar days in Asia/Kolkata or local browser timezones.
 */
export const parseDateKeySafe = (dateKey: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) {
    const fallback = new Date(dateKey);
    return isNaN(fallback.getTime()) ? getNow() : fallback;
  }
  const year = parseInt(match[1], 10);
  const monthIndex = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
};

/**
 * Formats a "YYYY-MM-DD" date key as "27 Oct 2026" without timezone shift
 */
export const formatDateKeyDisplayIST = (dateKey: string): string => {
  if (!dateKey) return '';
  return formatISTDateMedium(parseDateKeySafe(dateKey));
};

/**
 * Calculates inclusive calendar days between two "YYYY-MM-DD" date keys
 */
export const calculateInclusiveDays = (fromDateKey: string, toDateKey: string): number => {
  if (!fromDateKey || !toDateKey) return 0;
  const start = parseDateKeySafe(fromDateKey);
  const end = parseDateKeySafe(toDateKey);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Adds a specified number of calendar days to a Date based on its Asia/Kolkata calendar date
 */
export const addDaysIST = (input?: Date | string | number, daysToAdd: number = 1): Date => {
  const p = getISTDateParts(input);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + daysToAdd, 12, 0, 0));
};

/**
 * Returns a list of upcoming dates for homework/scheduling dropdowns based on current IST date
 */
export const getUpcomingSchoolDatesIST = (baseDate?: Date): { label: string; value: string }[] => {
  const now = baseDate || getNow();
  const todayVal = formatISTShortWeekdayDate(now);
  const tomorrowVal = formatISTShortWeekdayDate(addDaysIST(now, 1));
  const day2Val = formatISTShortWeekdayDate(addDaysIST(now, 2));
  const day3Val = formatISTShortWeekdayDate(addDaysIST(now, 3));

  return [
    { label: `Today (${todayVal})`, value: todayVal },
    { label: `Tomorrow (${tomorrowVal})`, value: tomorrowVal },
    { label: day2Val, value: day2Val },
    { label: day3Val, value: day3Val },
  ];
};

/**
 * Formats Month Key as "YYYY-MM" in Asia/Kolkata
 */
export const formatISTMonthKey = (input?: Date | string | number): string => {
  const p = getISTDateParts(input);
  return `${p.yearStr}-${p.monthStr}`;
};

export const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Parses a "Month YYYY" (e.g. "October 2026") or "YYYY-MM" string into { year, monthIndex, monthKey, monthName }.
 * Falls back to the current Asia/Kolkata month and year if empty or unparseable.
 */
export const parseMonthYearToYearMonth = (
  monthInput?: string
): { year: number; monthIndex: number; monthKey: string; monthName: string } => {
  const nowParts = getISTDateParts();
  if (!monthInput) {
    return {
      year: nowParts.year,
      monthIndex: nowParts.month - 1,
      monthKey: `${nowParts.yearStr}-${nowParts.monthStr}`,
      monthName: `${nowParts.monthLong} ${nowParts.yearStr}`,
    };
  }

  const trimmed = monthInput.trim();

  // Check YYYY-MM format
  const keyMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (keyMatch) {
    const year = parseInt(keyMatch[1], 10);
    const monthNum = parseInt(keyMatch[2], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const monthIndex = monthNum - 1;
      const monthLong = MONTH_NAMES_LONG[monthIndex];
      return {
        year,
        monthIndex,
        monthKey: `${year}-${String(monthNum).padStart(2, '0')}`,
        monthName: `${monthLong} ${year}`,
      };
    }
  }

  // Check "Month YYYY" format
  const nameMatch = /^([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (nameMatch) {
    const mName = nameMatch[1].toLowerCase();
    const year = parseInt(nameMatch[2], 10);
    const foundIdx = MONTH_NAMES_LONG.findIndex(
      (m) => m.toLowerCase() === mName || m.slice(0, 3).toLowerCase() === mName.slice(0, 3)
    );
    if (foundIdx >= 0) {
      const monthLong = MONTH_NAMES_LONG[foundIdx];
      return {
        year,
        monthIndex: foundIdx,
        monthKey: `${year}-${String(foundIdx + 1).padStart(2, '0')}`,
        monthName: `${monthLong} ${year}`,
      };
    }
  }

  return {
    year: nowParts.year,
    monthIndex: nowParts.month - 1,
    monthKey: `${nowParts.yearStr}-${nowParts.monthStr}`,
    monthName: `${nowParts.monthLong} ${nowParts.yearStr}`,
  };
};

/**
 * Formats a "YYYY-MM" month key into "Month YYYY" (e.g. "October 2026")
 */
export const formatMonthKeyToMonthYear = (monthKey: string): string => {
  return parseMonthYearToYearMonth(monthKey).monthName;
};

/**
 * Shifts a "Month YYYY" or "YYYY-MM" by deltaMonths (e.g. -1 for previous month, +1 for next month)
 * and returns the resulting "Month YYYY" string.
 */
export const shiftMonthYear = (monthInput: string, deltaMonths: number): string => {
  const { year, monthIndex } = parseMonthYearToYearMonth(monthInput);
  const shifted = new Date(Date.UTC(year, monthIndex + deltaMonths, 15, 12, 0, 0));
  return formatISTMonthYear(shifted);
};

/**
 * Returns surrounding Month-Year labels centered around the current Asia/Kolkata month
 * (e.g. [Current Month, Previous Month, 2 Months Ago, Next Month])
 */
export const getRecentAndSurroundingMonthYears = (centerDate?: Date): string[] => {
  const currentMonthYear = formatISTMonthYear(centerDate);
  const prevMonth1 = shiftMonthYear(currentMonthYear, -1);
  const prevMonth2 = shiftMonthYear(currentMonthYear, -2);
  const nextMonth1 = shiftMonthYear(currentMonthYear, 1);
  return [currentMonthYear, prevMonth1, prevMonth2, nextMonth1];
};

/**
 * Computes the trailing day numbers of the previous month to pad the first week row
 * (Sunday = 0 through Saturday = 6) before day 1 of (year, monthIndex).
 */
export const getCalendarLeadingPaddingDays = (year: number, monthIndex: number): number[] => {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Sun ... 6 = Sat
  if (firstDayOfWeek === 0) return [];
  const prevMonthTotalDays = new Date(year, monthIndex, 0).getDate();
  const padding: number[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    padding.push(prevMonthTotalDays - i);
  }
  return padding;
};

/**
 * Computes the milliseconds remaining until the next midnight (00:00:00) in Asia/Kolkata
 */
export const getMsUntilNextISTMidnight = (input?: Date): number => {
  const now = input || getNow();
  const p = getISTDateParts(now);
  const secondsElapsedToday = p.hour24 * 3600 + parseInt(p.minuteStr, 10) * 60 + parseInt(p.secondStr, 10);
  const secondsRemaining = Math.max(1, 86400 - secondsElapsedToday);
  // Add a 500ms buffer past midnight so the timer triggers cleanly in the new IST day
  return secondsRemaining * 1000 + 500;
};

export interface LiveISTDateState {
  now: Date;
  year: number;
  month: number; // 1-12
  monthIndex: number; // 0-11
  day: number; // 1-31
  fullDateStr: string; // "Tuesday, 27 October 2026"
  shortWeekdayDateStr: string; // "Tue, 27 Oct 2026"
  mediumDateStr: string; // "27 Oct 2026"
  todayDateKey: string; // "2026-10-27"
  monthKey: string; // "2026-10"
  time12hStr: string; // "09:41 AM"
  statusBarTime: string; // "9:41"
  monthYearStr: string; // "October 2026"
  previousMonthYearStr: string; // "September 2026"
  dayOfMonth: number; // 27
}

const buildLiveISTState = (now: Date): LiveISTDateState => {
  const parts = getISTDateParts(now);
  const monthYearStr = `${parts.monthLong} ${parts.yearStr}`;
  return {
    now,
    year: parts.year,
    month: parts.month,
    monthIndex: parts.month - 1,
    day: parts.day,
    fullDateStr: formatISTFullDate(now),
    shortWeekdayDateStr: formatISTShortWeekdayDate(now),
    mediumDateStr: formatISTDateMedium(now),
    todayDateKey: formatISTDateKey(now),
    monthKey: `${parts.yearStr}-${parts.monthStr}`,
    time12hStr: formatISTTime12h(now),
    statusBarTime: formatISTStatusBarTime(now),
    monthYearStr,
    previousMonthYearStr: shiftMonthYear(monthYearStr, -1),
    dayOfMonth: parts.day,
  };
};

/**
 * React hook that keeps the current Asia/Kolkata date and time automatically refreshed:
 * - Updates when the component mounts
 * - Updates immediately across midnight in Asia/Kolkata via scheduled timeout
 * - Updates every 1 second to keep live clocks and day boundaries accurate
 * - Updates when the user returns to the tab/app (window focus / visibilitychange)
 */
export const useISTCurrentDate = (): LiveISTDateState => {
  const [state, setState] = useState<LiveISTDateState>(() => buildLiveISTState(getNow()));

  const refresh = useCallback(() => {
    const currentNow = getNow();
    const next = buildLiveISTState(currentNow);
    setState((prev) => {
      if (
        prev.todayDateKey === next.todayDateKey &&
        prev.time12hStr === next.time12hStr &&
        prev.statusBarTime === next.statusBarTime
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();

    // Periodic check every 1 second for live clock and midnight rollover
    const intervalId = window.setInterval(refresh, 1000);

    // Exact timer scheduled for the next Asia/Kolkata midnight rollover
    let midnightTimeoutId: number | undefined;
    const scheduleMidnightTimer = () => {
      const msUntilMidnight = getMsUntilNextISTMidnight(getNow());
      midnightTimeoutId = window.setTimeout(() => {
        refresh();
        scheduleMidnightTimer();
      }, msUntilMidnight);
    };
    scheduleMidnightTimer();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('offsleek_clock_override', refresh);

    return () => {
      window.clearInterval(intervalId);
      if (midnightTimeoutId !== undefined) {
        window.clearTimeout(midnightTimeoutId);
      }
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('offsleek_clock_override', refresh);
    };
  }, [refresh]);

  return state;
};

