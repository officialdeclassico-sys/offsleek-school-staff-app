/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Calendar, Megaphone } from 'lucide-react';

export type StaffNavTab =
  | 'Home'
  | 'Attendance'
  | 'Announcements'
  | 'Calendar'
  | 'My Requests'
  | 'Profile';

interface StaffBottomNavProps {
  activeTab: StaffNavTab;
  onNavigateHome: () => void;
  onNavigateAttendance: () => void;
  onNavigateAnnouncements: () => void;
  onNavigateCalendar?: () => void;
  onNavigateMyRequests?: () => void;
  onNavigateProfile: () => void;
}

export default function StaffBottomNav({
  activeTab,
  onNavigateHome,
  onNavigateAttendance,
  onNavigateAnnouncements,
  onNavigateProfile,
}: StaffBottomNavProps) {
  return (
    <nav
      aria-label="Staff Bottom Navigation"
      className="shrink-0 w-full bg-white border-t border-[#e5e7eb] px-2 sm:px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-30 select-none"
    >
      <div className="grid grid-cols-4 items-stretch w-full">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="w-full min-w-0 flex flex-col items-center justify-center cursor-pointer group py-1 px-1 active:scale-95 transition-transform duration-150"
        >
          <div className="h-6 w-6 flex items-center justify-center shrink-0 transition">
            <Home
              className={`w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] transition-colors ${
                activeTab === 'Home'
                  ? 'text-black stroke-[2.25]'
                  : 'text-[#6b7280] stroke-[1.85] group-hover:text-black'
              }`}
            />
          </div>
          <span
            className={`w-full text-center text-[10.5px] sm:text-[11px] tracking-[-0.01em] mt-1 leading-tight whitespace-nowrap transition-colors ${
              activeTab === 'Home'
                ? 'font-bold text-black'
                : 'text-[#6b7280] font-medium group-hover:text-black'
            }`}
          >
            Home
          </span>
        </button>

        {/* Tab 2: Attendance */}
        <button
          type="button"
          onClick={onNavigateAttendance}
          className="w-full min-w-0 flex flex-col items-center justify-center cursor-pointer group py-1 px-1 active:scale-95 transition-transform duration-150"
        >
          <div className="h-6 w-6 flex items-center justify-center shrink-0 transition">
            <Calendar
              className={`w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] transition-colors ${
                activeTab === 'Attendance'
                  ? 'text-black stroke-[2.25]'
                  : 'text-[#6b7280] stroke-[1.85] group-hover:text-black'
              }`}
            />
          </div>
          <span
            className={`w-full text-center text-[10.5px] sm:text-[11px] tracking-[-0.01em] mt-1 leading-tight whitespace-nowrap transition-colors ${
              activeTab === 'Attendance'
                ? 'font-bold text-black'
                : 'text-[#6b7280] font-medium group-hover:text-black'
            }`}
          >
            Attendance
          </span>
        </button>

        {/* Tab 3: Announcements */}
        <button
          type="button"
          onClick={onNavigateAnnouncements}
          className="w-full min-w-0 flex flex-col items-center justify-center cursor-pointer group py-1 px-1 active:scale-95 transition-transform duration-150"
        >
          <div className="h-6 w-6 flex items-center justify-center shrink-0 transition">
            <Megaphone
              className={`w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] transition-colors ${
                activeTab === 'Announcements'
                  ? 'text-black stroke-[2.25]'
                  : 'text-[#6b7280] stroke-[1.85] group-hover:text-black'
              }`}
            />
          </div>
          <span
            className={`w-full text-center text-[10.5px] sm:text-[11px] tracking-[-0.01em] mt-1 leading-tight whitespace-nowrap transition-colors ${
              activeTab === 'Announcements'
                ? 'font-bold text-black'
                : 'text-[#6b7280] font-medium group-hover:text-black'
            }`}
          >
            Announcements
          </span>
        </button>

        {/* Tab 4: Profile */}
        <button
          type="button"
          onClick={onNavigateProfile}
          className="w-full min-w-0 flex flex-col items-center justify-center cursor-pointer group py-1 px-1 active:scale-95 transition-transform duration-150"
        >
          <div className="h-6 w-6 flex items-center justify-center shrink-0 transition">
            <img
              src="/assets/priya-sharma.png"
              alt="Profile"
              className={`w-[21px] h-[21px] sm:w-[23px] sm:h-[23px] rounded-full object-cover transition ${
                activeTab === 'Profile'
                  ? 'brightness-100 opacity-100 ring-1 ring-black/20'
                  : 'opacity-75 group-hover:opacity-100'
              }`}
            />
          </div>
          <span
            className={`w-full text-center text-[10.5px] sm:text-[11px] tracking-[-0.01em] mt-1 leading-tight whitespace-nowrap transition-colors ${
              activeTab === 'Profile'
                ? 'font-bold text-black'
                : 'text-[#6b7280] font-medium group-hover:text-black'
            }`}
          >
            Profile
          </span>
        </button>
      </div>

      {/* iOS Home Indicator Bar */}
      <div className="w-24 sm:w-32 h-1 bg-black rounded-full mx-auto mt-1.5 mb-0.5" />
    </nav>
  );
}
