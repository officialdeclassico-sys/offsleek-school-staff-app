/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export interface RectLike {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface AlignedDropdownGeometryOptions {
  align?: 'left' | 'right';
  matchTriggerWidth?: boolean;
  preferredMaxHeight?: number;
  minComfortHeight?: number;
  gap?: number;
  edgePadding?: number;
}

export interface AlignedDropdownGeometry {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
}

export function computeAlignedDropdownGeometry(
  triggerRect: RectLike,
  boundaryRect: RectLike,
  viewportHeight: number,
  options: AlignedDropdownGeometryOptions = {}
): AlignedDropdownGeometry {
  const {
    align = 'left',
    matchTriggerWidth = true,
    preferredMaxHeight = 200,
    minComfortHeight = 132,
    gap = 4,
    edgePadding = 8,
  } = options;

  const usableBoundaryWidth = Math.max(120, boundaryRect.width - edgePadding * 2);
  const rawWidth = matchTriggerWidth ? triggerRect.width : triggerRect.width;
  const width = Math.min(Math.max(rawWidth, 80), usableBoundaryWidth);

  let left = align === 'right' ? triggerRect.right - width : triggerRect.left;
  const minLeft = boundaryRect.left + edgePadding;
  const maxLeft = Math.max(minLeft, boundaryRect.right - edgePadding - width);
  left = Math.min(Math.max(left, minLeft), maxLeft);

  const spaceBelow = Math.max(0, boundaryRect.bottom - triggerRect.bottom - gap - edgePadding);
  const spaceAbove = Math.max(0, triggerRect.top - boundaryRect.top - gap - edgePadding);

  const shouldOpenUpward =
    spaceBelow < Math.min(preferredMaxHeight, minComfortHeight) && spaceAbove > spaceBelow;

  if (shouldOpenUpward) {
    const maxHeight = Math.max(88, Math.min(preferredMaxHeight, spaceAbove));
    return {
      bottom: Math.max(edgePadding, viewportHeight - triggerRect.top + gap),
      left,
      width,
      maxHeight,
      placement: 'top',
    };
  }

  const maxHeight = Math.max(88, Math.min(preferredMaxHeight, spaceBelow));
  return {
    top: triggerRect.bottom + gap,
    left,
    width,
    maxHeight,
    placement: 'bottom',
  };
}

function getEffectiveBoundaryRect(triggerEl: HTMLElement): {
  boundary: RectLike;
  viewportHeight: number;
} {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const vpLeft = vv ? vv.offsetLeft : 0;
  const vpTop = vv ? vv.offsetTop : 0;
  const vpWidth = vv ? vv.width : window.innerWidth;
  const vpHeight = vv ? vv.height : window.innerHeight;
  const vpRight = vpLeft + vpWidth;
  const vpBottom = vpTop + vpHeight;

  const frameEl = triggerEl.closest('[data-offsleek-frame="true"]') as HTMLElement | null;
  if (!frameEl) {
    return {
      boundary: {
        top: vpTop,
        left: vpLeft,
        right: vpRight,
        bottom: vpBottom,
        width: vpWidth,
        height: vpHeight,
      },
      viewportHeight: window.innerHeight,
    };
  }

  const frameRect = frameEl.getBoundingClientRect();
  const top = Math.max(vpTop, frameRect.top);
  const left = Math.max(vpLeft, frameRect.left);
  const right = Math.min(vpRight, frameRect.right);
  const bottom = Math.min(vpBottom, frameRect.bottom);

  return {
    boundary: {
      top,
      left,
      right: Math.max(left + 120, right),
      bottom: Math.max(top + 120, bottom),
      width: Math.max(120, right - left),
      height: Math.max(120, bottom - top),
    },
    viewportHeight: window.innerHeight,
  };
}

function isTriggerClippedOutOfScrollParent(triggerEl: HTMLElement): boolean {
  let parent = triggerEl.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      const parentRect = parent.getBoundingClientRect();
      const triggerRect = triggerEl.getBoundingClientRect();
      if (
        triggerRect.bottom <= parentRect.top + 4 ||
        triggerRect.top >= parentRect.bottom - 4
      ) {
        return true;
      }
    }
    parent = parent.parentElement;
  }
  return false;
}

export interface UseAlignedDropdownPositionParams extends AlignedDropdownGeometryOptions {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  onAutoClose?: () => void;
}

export function useAlignedDropdownPosition({
  isOpen,
  triggerRef,
  onAutoClose,
  align = 'left',
  matchTriggerWidth = true,
  preferredMaxHeight = 200,
  minComfortHeight = 132,
  gap = 4,
  edgePadding = 8,
}: UseAlignedDropdownPositionParams): AlignedDropdownGeometry | null {
  const [geometry, setGeometry] = useState<AlignedDropdownGeometry | null>(null);

  const measure = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === 'undefined') return;

    if (isTriggerClippedOutOfScrollParent(triggerEl)) {
      onAutoClose?.();
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    const { boundary, viewportHeight } = getEffectiveBoundaryRect(triggerEl);

    setGeometry(
      computeAlignedDropdownGeometry(triggerRect, boundary, viewportHeight, {
        align,
        matchTriggerWidth,
        preferredMaxHeight,
        minComfortHeight,
        gap,
        edgePadding,
      })
    );
  }, [
    triggerRef,
    onAutoClose,
    align,
    matchTriggerWidth,
    preferredMaxHeight,
    minComfortHeight,
    gap,
    edgePadding,
  ]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setGeometry(null);
      return;
    }
    measure();
  }, [isOpen, measure]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let rafId: number | null = null;
    const scheduleMeasure = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };

    window.addEventListener('resize', scheduleMeasure);
    document.addEventListener('scroll', scheduleMeasure, true);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', scheduleMeasure);
      vv.addEventListener('scroll', scheduleMeasure);
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleMeasure);
      document.removeEventListener('scroll', scheduleMeasure, true);
      if (vv) {
        vv.removeEventListener('resize', scheduleMeasure);
        vv.removeEventListener('scroll', scheduleMeasure);
      }
    };
  }, [isOpen, measure]);

  return geometry;
}
