/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backAriaLabel?: string;
  rightAction?: React.ReactNode;
  className?: string;
  isSticky?: boolean;
}

/**
 * Standard OFFSLEEK Page Header with Back Chevron
 * Layout: [Small left-facing chevron] [Page heading & subtitle]
 * - Minimal horizontal spacing between chevron and heading
 * - Subtitle aligns directly beneath heading text
 * - Clean, accessible clickable area with no borders or circular backgrounds
 */
export default function PageHeader({
  title,
  subtitle,
  onBack,
  backAriaLabel = 'Back',
  rightAction,
  className = '',
  isSticky = false,
}: PageHeaderProps) {
  const containerClasses = isSticky
    ? `sticky top-0 bg-white z-20 pt-1 pb-2 border-b border-[#f4f5f7] flex items-start justify-between gap-2 ${className}`
    : `flex items-start justify-between gap-2 pt-1 pb-2 border-b border-[#f4f5f7] ${className}`;

  return (
    <div className={containerClasses}>
      <div className="flex items-start gap-1.5 min-w-0 flex-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 -ml-1 text-neutral-800 hover:text-black active:scale-95 transition cursor-pointer shrink-0 mt-0.5 rounded-md hover:bg-neutral-100/60"
            aria-label={backAriaLabel}
            title={backAriaLabel}
          >
            <ChevronLeft className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] sm:text-[23px] font-bold text-neutral-950 tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] sm:text-[12.5px] text-[#717684] mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightAction && <div className="shrink-0">{rightAction}</div>}
    </div>
  );
}
