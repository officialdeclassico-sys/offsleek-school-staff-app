/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useISTCurrentDate } from '../utils/dateTimeUtils';

export default function StaffStatusBar() {
  const { statusBarTime } = useISTCurrentDate();

  return (
    <div className="shrink-0 bg-white/95 backdrop-blur-xs z-30 pt-3 pb-1.5 px-4 sm:px-6 select-none">
      <div className="flex items-center justify-between text-neutral-900 text-[13px] sm:text-[14px] font-semibold tracking-tight">
        <span className="w-10 sm:w-12">{statusBarTime}</span>

        <div className="flex items-center gap-1 sm:gap-1.5 w-10 sm:w-12 justify-end">
          {/* Cellular */}
          <div className="flex items-end gap-[2px] h-3">
            <div className="w-[3px] h-1 bg-neutral-900 rounded-[0.5px]" />
            <div className="w-[3px] h-1.5 bg-neutral-900 rounded-[0.5px]" />
            <div className="w-[3px] h-2 bg-neutral-900 rounded-[0.5px]" />
            <div className="w-[3px] h-2.5 bg-neutral-900 rounded-[0.5px]" />
          </div>

          {/* Wifi */}
          <svg className="w-3.5 h-3.5 fill-neutral-900" viewBox="0 0 24 24">
            <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 3.5c3.73 0 7.14 1.43 9.72 3.8L12 19.3 2.28 11.3C4.86 8.93 8.27 7.5 12 7.5z" />
          </svg>

          {/* Battery */}
          <div className="w-[20px] sm:w-[21px] h-[10px] border border-neutral-900 rounded-[3px] p-[1px] flex items-center">
            <div className="h-full w-[80%] bg-neutral-900 rounded-[1.5px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
