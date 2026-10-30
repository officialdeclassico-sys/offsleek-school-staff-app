/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  formatISTDateShort,
  formatISTFullDate,
  formatISTMonthYear,
  getISTDateParts,
  getNow,
  parseMonthYearToYearMonth,
} from '../utils/dateTimeUtils';

export type StaffAttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Half Day' | 'Holiday' | 'None';

export interface StaffDayAttendance {
  day: number;
  dateStr: string; // 'YYYY-MM-DD'
  status: StaffAttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  isToday?: boolean;
}

export interface StaffMonthlyAttendance {
  month: string; // e.g. 'October 2026'
  year: number;
  monthIndex: number; // 0-indexed (0 = Jan, 9 = Oct)
  summary: {
    present: number;
    absent: number;
    leave: number;
    holiday: number;
  };
  todayRecord: {
    dateFormatted: string;
    status: 'Present' | 'Absent' | 'Leave' | 'Half Day' | 'Holiday';
    checkIn: string;
    checkOut: string;
    tracker: {
      submittedTime: string;
      reviewStatus: string;
      approvalStatus: string;
    };
  };
  days: StaffDayAttendance[];
}

const STAFF_ATTENDANCE_STORAGE_KEY = 'offsleek_staff_my_attendance_v1';

export function getStaffAttendance(month?: string): StaffMonthlyAttendance {
  const now = getNow();
  const istParts = getISTDateParts(now);
  const currentDay = istParts.day;
  const resolvedMonthStr = month || formatISTMonthYear(now);
  const { year, monthIndex, monthKey, monthName } = parseMonthYearToYearMonth(resolvedMonthStr);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const isCurrentMonthAndYear = year === istParts.year && monthIndex === istParts.month - 1;

  // Generate accurate monthly attendance while preserving historical pattern
  const days: StaffDayAttendance[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
    let status: StaffAttendanceStatus = 'Present';

    const dateObj = new Date(year, monthIndex, d);
    const dow = dateObj.getDay(); // 0 = Sun, 6 = Sat

    if (dow === 0 || dow === 6) {
      status = 'Holiday';
    } else if (d === 15) {
      status = 'Absent';
    } else if (d === 21) {
      status = 'Leave';
    } else if (d === 22) {
      status = 'Half Day';
    } else {
      status = 'Present';
    }

    days.push({
      day: d,
      dateStr,
      status,
      checkIn: status === 'Present' || status === 'Half Day' ? '08:58 AM' : undefined,
      checkOut: status === 'Present' ? '05:12 PM' : status === 'Half Day' ? '01:30 PM' : undefined,
      isToday: isCurrentMonthAndYear && d === currentDay,
    });
  }

  return {
    month: monthName,
    year,
    monthIndex,
    summary: {
      present: 20,
      absent: 2,
      leave: 1,
      holiday: 0,
    },
    todayRecord: {
      dateFormatted: formatISTFullDate(now),
      status: 'Present',
      checkIn: '08:58 AM',
      checkOut: '05:12 PM',
      tracker: {
        submittedTime: `${formatISTDateShort(now)}, 08:58 AM`,
        reviewStatus: 'Under Review\n(Administration)',
        approvalStatus: 'Approved\n(End of Day)',
      },
    },
    days,
  };
}

