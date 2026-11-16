/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { CalendarEventDetail } from '../services/calendarService';
import UpcomingEventCard from './UpcomingEventCard';

interface UpcomingEventsCarouselProps {
  events: CalendarEventDetail[];
  todayDateKey: string;
  onSelectEvent: (event: CalendarEventDetail) => void;
  isOverlayOpen?: boolean;
}

const AUTO_SCROLL_SPEED_PX_PER_SEC = 35;
const RESUME_DELAY_MS = 2500;

export default function UpcomingEventsCarousel({
  events,
  todayDateKey,
  onSelectEvent,
  isOverlayOpen = false,
}: UpcomingEventsCarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const copy0StartRef = useRef<HTMLButtonElement | null>(null);
  const copy1StartRef = useRef<HTMLButtonElement | null>(null);

  const shouldLoop = events.length >= 3;

  // Refs controlling animation without per-frame React state updates
  const strideRef = useRef<number>(0);
  const scrollPosRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Pause flags
  const isHoveredRef = useRef<boolean>(false);
  const isTouchActiveRef = useRef<boolean>(false);
  const isFocusInsideRef = useRef<boolean>(false);
  const isManualCooldownRef = useRef<boolean>(false);
  const isInViewportRef = useRef<boolean>(true);
  const isTabHiddenRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.hidden : false
  );
  const prefersReducedMotionRef = useRef<boolean>(false);
  const hasExternalModalRef = useRef<boolean>(isOverlayOpen);

  // Mouse drag state
  const pointerDownRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartScrollRef = useRef<number>(0);
  const didDragRef = useRef<boolean>(false);
  const suppressNextClickRef = useRef<boolean>(false);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const pauseForManualInteraction = useCallback(() => {
    isManualCooldownRef.current = true;
    clearResumeTimer();
  }, [clearResumeTimer]);

  const scheduleResumeAfterInteraction = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = window.setTimeout(() => {
      isManualCooldownRef.current = false;
      resumeTimerRef.current = null;
    }, RESUME_DELAY_MS);
  }, [clearResumeTimer]);

  const measureStride = useCallback(() => {
    if (!shouldLoop || !viewportRef.current) {
      strideRef.current = 0;
      return;
    }

    let measured = 0;
    if (copy0StartRef.current && copy1StartRef.current) {
      measured = copy1StartRef.current.offsetLeft - copy0StartRef.current.offsetLeft;
    } else if (trackRef.current) {
      measured = trackRef.current.scrollWidth / 3;
    }

    if (measured > 0) {
      const prevStride = strideRef.current;
      strideRef.current = measured;
      if (prevStride === 0 || viewportRef.current.scrollLeft < measured * 0.5) {
        isProgrammaticScrollRef.current = true;
        viewportRef.current.scrollLeft = measured;
        scrollPosRef.current = measured;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
    }
  }, [shouldLoop]);

  // Keep overlay prop synced
  useEffect(() => {
    hasExternalModalRef.current = isOverlayOpen;
  }, [isOverlayOpen]);

  // Monitor DOM for any open dialog overlay & monitor prefers-reduced-motion & visibilitychange
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkReducedMotion = () => {
      prefersReducedMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    };
    checkReducedMotion();
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    motionQuery.addEventListener?.('change', onMotionChange);

    const onVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden;
      lastFrameTsRef.current = null;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const checkDomDialogs = () => {
      const openDialog = document.querySelector('[role="dialog"]');
      hasExternalModalRef.current = isOverlayOpen || Boolean(openDialog);
    };
    checkDomDialogs();
    const domObserver = new MutationObserver(checkDomDialogs);
    domObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      motionQuery.removeEventListener?.('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      domObserver.disconnect();
    };
  }, [isOverlayOpen]);

  // Measure layout via ResizeObserver & observe viewport intersection
  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    measureStride();

    const resizeObserver = new ResizeObserver(() => {
      measureStride();
    });
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isInViewportRef.current = entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [events, measureStride]);

  // Mouse drag handlers across window so dragging outside element finishes cleanly
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!pointerDownRef.current || !viewportRef.current) return;
      const dx = e.clientX - dragStartXRef.current;
      if (Math.abs(dx) > 4) {
        didDragRef.current = true;
      }
      if (didDragRef.current) {
        const nextScroll = dragStartScrollRef.current - dx;
        isProgrammaticScrollRef.current = true;
        viewportRef.current.scrollLeft = nextScroll;
        scrollPosRef.current = viewportRef.current.scrollLeft;
        requestAnimationFrame(() => {
          isProgrammaticScrollRef.current = false;
        });
      }
    };

    const handleWindowMouseUp = () => {
      if (!pointerDownRef.current) return;
      pointerDownRef.current = false;
      if (didDragRef.current) {
        suppressNextClickRef.current = true;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 120);
      }
      didDragRef.current = false;
      scheduleResumeAfterInteraction();
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [scheduleResumeAfterInteraction]);

  // Main requestAnimationFrame loop (single loop, zero state mutations per frame)
  useEffect(() => {
    if (!shouldLoop) return;

    const tick = (ts: number) => {
      const viewport = viewportRef.current;
      const stride = strideRef.current;

      const isPaused =
        !viewport ||
        stride <= 0 ||
        isHoveredRef.current ||
        isTouchActiveRef.current ||
        pointerDownRef.current ||
        isFocusInsideRef.current ||
        isManualCooldownRef.current ||
        !isInViewportRef.current ||
        isTabHiddenRef.current ||
        prefersReducedMotionRef.current ||
        hasExternalModalRef.current;

      if (!isPaused && viewport) {
        if (lastFrameTsRef.current !== null) {
          const dtSec = Math.min(ts - lastFrameTsRef.current, 100) / 1000;
          scrollPosRef.current += AUTO_SCROLL_SPEED_PX_PER_SEC * dtSec;

          if (scrollPosRef.current >= stride * 2) {
            scrollPosRef.current -= stride;
          } else if (scrollPosRef.current < stride) {
            scrollPosRef.current += stride;
          }

          isProgrammaticScrollRef.current = true;
          viewport.scrollLeft = scrollPosRef.current;
          isProgrammaticScrollRef.current = false;
        }
        lastFrameTsRef.current = ts;
      } else {
        lastFrameTsRef.current = null;
      }

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      clearResumeTimer();
    };
  }, [shouldLoop, events, clearResumeTimer]);

  const handleViewportScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport || isProgrammaticScrollRef.current) return;

    let current = viewport.scrollLeft;
    const stride = strideRef.current;
    if (shouldLoop && stride > 0) {
      if (current >= stride * 2) {
        current -= stride;
        isProgrammaticScrollRef.current = true;
        viewport.scrollLeft = current;
        isProgrammaticScrollRef.current = false;
      } else if (current <= stride * 0.25) {
        current += stride;
        isProgrammaticScrollRef.current = true;
        viewport.scrollLeft = current;
        isProgrammaticScrollRef.current = false;
      }
    }
    scrollPosRef.current = current;

    if (!pointerDownRef.current && !isTouchActiveRef.current) {
      pauseForManualInteraction();
      scheduleResumeAfterInteraction();
    }
  };

  const handleCardSelect = (event: CalendarEventDetail) => {
    if (suppressNextClickRef.current || didDragRef.current) return;
    onSelectEvent(event);
  };

  const copies = shouldLoop ? [0, 1, 2] : [0];

  return (
    <div
      ref={viewportRef}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
        if (!pointerDownRef.current) {
          scheduleResumeAfterInteraction();
        }
      }}
      onMouseDown={(e) => {
        if (e.button !== 0 || !viewportRef.current) return;
        pointerDownRef.current = true;
        didDragRef.current = false;
        suppressNextClickRef.current = false;
        dragStartXRef.current = e.clientX;
        dragStartScrollRef.current = viewportRef.current.scrollLeft;
        pauseForManualInteraction();
      }}
      onTouchStart={() => {
        isTouchActiveRef.current = true;
        pauseForManualInteraction();
      }}
      onTouchEnd={() => {
        isTouchActiveRef.current = false;
        scheduleResumeAfterInteraction();
      }}
      onTouchCancel={() => {
        isTouchActiveRef.current = false;
        scheduleResumeAfterInteraction();
      }}
      onWheel={(e) => {
        if (Math.abs(e.deltaX) > 0 || e.shiftKey) {
          pauseForManualInteraction();
          scheduleResumeAfterInteraction();
        }
      }}
      onScroll={handleViewportScroll}
      onFocusCapture={() => {
        isFocusInsideRef.current = true;
        pauseForManualInteraction();
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          isFocusInsideRef.current = false;
          scheduleResumeAfterInteraction();
        }
      }}
      className="w-full overflow-x-auto no-scrollbar overscroll-x-contain select-none"
      aria-label="Upcoming Events Carousel"
    >
      <div ref={trackRef} className="flex items-stretch gap-2.5 w-max py-0.5">
        {copies.map((copyIndex) => {
          const isMiddlePrimary = !shouldLoop || copyIndex === 1;
          return events.map((eventItem, idx) => {
            let assignedRef: React.Ref<HTMLButtonElement> | undefined;
            if (idx === 0 && copyIndex === 0) assignedRef = copy0StartRef;
            if (idx === 0 && copyIndex === 1) assignedRef = copy1StartRef;

            return (
              <UpcomingEventCard
                key={`${copyIndex}-${eventItem.id}`}
                event={eventItem}
                todayDateKey={todayDateKey}
                onSelect={handleCardSelect}
                isClone={!isMiddlePrimary}
                cardRef={assignedRef}
              />
            );
          });
        })}
      </div>
    </div>
  );
}
