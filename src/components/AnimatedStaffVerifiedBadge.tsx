/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export type VerifiedBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero' | 'xl' | '2xl' | 'custom';
export type StaffBadgeSize = VerifiedBadgeSize;

export interface AnimatedStaffVerifiedBadgeProps {
  /**
   * Predefined standard size variant:
   * 'xs': w-4 h-4
   * 'sm': w-8 h-8
   * 'md': w-12 h-12 (Attendance Saved banner)
   * 'hero': w-18 h-18 sm:w-20 sm:h-20 (Marks Published Successfully hero)
   * 'lg': w-14 h-14
   * 'xl': w-16 h-16
   * '2xl': w-20 h-20
   * 'custom': rely strictly on className
   */
  size?: VerifiedBadgeSize;
  className?: string;
  alt?: string;
  animate?: boolean;
}

export type GlobalVerifiedBadgeProps = AnimatedStaffVerifiedBadgeProps;

const SIZE_CLASSES: Record<Exclude<VerifiedBadgeSize, 'custom'>, string> = {
  xs: 'w-4 h-4',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  hero: 'w-18 h-18 sm:w-20 sm:h-20',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20',
};

// Global OFFSLEEK standard verified badge asset (Solid glossy black with crisp white checkmark)
export const OFFSLEEK_VERIFIED_BADGE_ASSET = '/assets/Dark Verified Check Badge.png';

export default function AnimatedStaffVerifiedBadge({
  size = 'md',
  className = '',
  alt = 'Verified and Confirmed',
  animate = true,
}: AnimatedStaffVerifiedBadgeProps) {
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    if (!animate) {
      setIsEntered(false);
      return;
    }

    // Phase A: Confident entrance (520ms), then smoothly transitions to continuous loop
    const timer = setTimeout(() => {
      setIsEntered(true);
    }, 520);

    return () => {
      clearTimeout(timer);
    };
  }, [animate]);

  const sizeClass = size !== 'custom' ? SIZE_CLASSES[size] : '';
  const heroBadgeSrc = OFFSLEEK_VERIFIED_BADGE_ASSET;
  const maskAssetSrc = OFFSLEEK_VERIFIED_BADGE_ASSET;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none bg-transparent ${sizeClass} ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Animated Badge Container with Entrance & Continuous Loop */}
      <div
        className={`relative w-full h-full flex items-center justify-center bg-transparent ${
          animate
            ? isEntered
              ? 'animate-offsleek-badge-loop'
              : 'animate-offsleek-badge-entrance'
            : ''
        }`}
      >
        {/* Global Solid Black Verified Badge (#000000 with crisp white checkmark) */}
        <img
          src={heroBadgeSrc}
          alt={alt}
          loading="eager"
          decoding="sync"
          className="w-full h-full object-contain pointer-events-none select-none block bg-transparent"
        />

        {/* Dynamic silver-white sheen sweep clipped strictly to the badge shape (zero background spill) */}
        {animate && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              WebkitMaskImage: `url('${encodeURI(maskAssetSrc)}')`,
              maskImage: `url('${encodeURI(maskAssetSrc)}')`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
            }}
            aria-hidden="true"
          >
            <div className="absolute inset-0 w-[45%] h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-25 animate-offsleek-sheen-sweep" />
          </div>
        )}
      </div>
    </div>
  );
}

// Global reusable standard component alias
export { AnimatedStaffVerifiedBadge as OffsleekVerifiedBadge };
