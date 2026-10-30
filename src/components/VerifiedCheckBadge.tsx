/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

export type VerifiedBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';

export interface VerifiedCheckBadgeProps {
  /**
   * Predefined standard size variant or 'custom'
   * xs: 16px, sm: 20px, md: 28px, lg: 40px, xl: 64px, 2xl: 80px
   */
  size?: VerifiedBadgeSize;
  /**
   * Optional custom CSS classes (especially when size="custom" or for positioning/margins)
   */
  className?: string;
  /**
   * Whether to trigger the PhonePe / Google Pay / Paytm style scale-in & settle success animation
   */
  animate?: boolean;
  /**
   * Whether to display the subtle concentric ripple ring during the animation (default: true if animate=true)
   */
  showRipple?: boolean;
  /**
   * Alt label for accessibility
   */
  alt?: string;
  /**
   * Tooltip title on hover
   */
  title?: string;
  /**
   * Callback fired when animation finishes
   */
  onAnimationEnd?: () => void;
  /**
   * Optional inline style
   */
  style?: React.CSSProperties;
}

const SIZE_MAP: Record<Exclude<VerifiedBadgeSize, 'custom'>, { container: string; img: string; ripple: string }> = {
  xs: {
    container: 'w-4 h-4',
    img: 'w-4 h-4',
    ripple: 'inset-[-4px]',
  },
  sm: {
    container: 'w-5 h-5',
    img: 'w-5 h-5',
    ripple: 'inset-[-6px]',
  },
  md: {
    container: 'w-7 h-7',
    img: 'w-7 h-7',
    ripple: 'inset-[-8px]',
  },
  lg: {
    container: 'w-10 h-10',
    img: 'w-10 h-10',
    ripple: 'inset-[-12px]',
  },
  xl: {
    container: 'w-16 h-16',
    img: 'w-16 h-16',
    ripple: 'inset-[-16px]',
  },
  '2xl': {
    container: 'w-20 h-20',
    img: 'w-20 h-20',
    ripple: 'inset-[-20px]',
  },
};

export default function VerifiedCheckBadge({
  size = 'md',
  className = '',
  animate = false,
  showRipple = true,
  alt = 'Verified Authentic',
  title,
  onAnimationEnd,
  style,
}: VerifiedCheckBadgeProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const sizeConfig = size !== 'custom' ? SIZE_MAP[size] : null;
  const containerSizeClass = sizeConfig ? sizeConfig.container : '';
  const rippleClass = sizeConfig ? sizeConfig.ripple : 'inset-[-14px]';

  // Primary image path to organized transparent glossy badge asset
  const assetSrc = '/assets/Dark Verified Check Badge.png';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${containerSizeClass} ${className}`}
      style={style}
      title={title}
    >
      {/* PhonePe/GPay Style Concentric Ripple Ring */}
      {animate && showRipple && (
        <>
          <div
            className={`absolute ${rippleClass} rounded-full border border-neutral-900/35 animate-payment-ripple pointer-events-none`}
            aria-hidden="true"
          />
          <div
            className={`absolute inset-0 rounded-full bg-neutral-900/10 animate-payment-glow pointer-events-none`}
            aria-hidden="true"
          />
        </>
      )}

      {/* Glossy Black Verified Check Badge Image */}
      <img
        src={assetSrc}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onAnimationEnd={onAnimationEnd}
        className={`w-full h-full object-contain select-none pointer-events-none ${
          animate ? 'animate-payment-badge' : 'transition-transform duration-200'
        } ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}
