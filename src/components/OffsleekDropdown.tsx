/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useAlignedDropdownPosition } from '../hooks/useAlignedDropdownPosition';

export interface OffsleekDropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface OffsleekDropdownProps {
  value: string;
  options: OffsleekDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  triggerLabel?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  align?: 'left' | 'right';
  menuWidthClass?: string;
  triggerClassName?: string;
  maxMenuHeightClass?: string;
  maxMenuHeightPx?: number;
  hasError?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const OFFSLEEK_DROPDOWN_TOKENS = {
  triggerBase:
    'offsleek-dropdown-trigger w-full flex items-center justify-between gap-2 bg-white border border-[#e5e7eb] text-black shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black',
  menuBase: 'offsleek-dropdown-menu fixed z-[70]',
  listBase: 'offsleek-dropdown-list overflow-y-auto no-scrollbar',
  optionBase:
    'offsleek-dropdown-option focus-visible:outline-none',
};

export default function OffsleekDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  triggerLabel,
  icon,
  ariaLabel,
  align = 'left',
  menuWidthClass = '',
  triggerClassName = '',
  maxMenuHeightClass = '',
  maxMenuHeightPx = 196,
  hasError = false,
  disabled = false,
  size = 'md',
}: OffsleekDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const handleAutoClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const geometry = useAlignedDropdownPosition({
    isOpen,
    triggerRef,
    onAutoClose: handleAutoClose,
    align,
    matchTriggerWidth: true,
    preferredMaxHeight: maxMenuHeightPx,
    minComfortHeight: 120,
    gap: 4,
    edgePadding: 8,
  });

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const selectedIndex = useMemo(
    () => options.findIndex((opt) => opt.value === value),
    [options, value]
  );

  const displayLabel = triggerLabel ?? selectedOption?.label ?? placeholder;
  const isPlaceholder = !selectedOption && !triggerLabel;

  // Outside click (checks both trigger wrapper and portaled menu) & Escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inTrigger && !inMenu) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Sync highlighted option & scroll selected option into view when opened
  useEffect(() => {
    if (!isOpen) return;
    const initialIdx = selectedIndex >= 0 ? selectedIndex : 0;
    setHighlightedIndex(initialIdx);

    requestAnimationFrame(() => {
      const targetEl = optionRefs.current[initialIdx];
      if (targetEl && typeof targetEl.scrollIntoView === 'function') {
        targetEl.scrollIntoView({ block: 'nearest' });
      }
    });
  }, [isOpen, selectedIndex]);

  const moveHighlight = (direction: 1 | -1) => {
    if (options.length === 0) return;
    let next = highlightedIndex;
    for (let step = 0; step < options.length; step++) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) {
        setHighlightedIndex(next);
        optionRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
  };

  const selectOption = (opt: OffsleekDropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          moveHighlight(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          moveHighlight(-1);
        }
        break;
      case 'Home':
        if (isOpen && options.length > 0) {
          event.preventDefault();
          const firstEnabled = options.findIndex((o) => !o.disabled);
          if (firstEnabled >= 0) {
            setHighlightedIndex(firstEnabled);
            optionRefs.current[firstEnabled]?.scrollIntoView({ block: 'nearest' });
          }
        }
        break;
      case 'End':
        if (isOpen && options.length > 0) {
          event.preventDefault();
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i].disabled) {
              setHighlightedIndex(i);
              optionRefs.current[i]?.scrollIntoView({ block: 'nearest' });
              break;
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && options[highlightedIndex]) {
          selectOption(options[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      case 'Tab':
        if (isOpen) setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const sizePaddingClass =
    size === 'sm' ? 'px-2.5 py-2 text-[12px]' : 'px-3 py-2.5 text-[12.5px]';

  const optionSizeClass =
    size === 'sm'
      ? 'px-3 py-2 text-[12px] leading-snug'
      : 'px-3.5 py-2.5 text-[12.5px] leading-snug';

  const menuContent =
    isOpen && geometry ? (
      <div
        ref={menuRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel || placeholder}
        data-placement={geometry.placement}
        style={{
          top: geometry.top !== undefined ? `${geometry.top}px` : undefined,
          bottom: geometry.bottom !== undefined ? `${geometry.bottom}px` : undefined,
          left: `${geometry.left}px`,
          width: `${geometry.width}px`,
          maxHeight: `${geometry.maxHeight}px`,
        }}
        className={`${OFFSLEEK_DROPDOWN_TOKENS.menuBase} ${menuWidthClass} animate-in fade-in duration-120`}
      >
        <div
          style={{ maxHeight: `${geometry.maxHeight}px` }}
          className={`${OFFSLEEK_DROPDOWN_TOKENS.listBase} ${maxMenuHeightClass}`}
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-3 text-[12px] text-[#6b7280] text-center bg-white">
              No options available
            </div>
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt.value}
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-highlighted={isHighlighted ? 'true' : 'false'}
                  disabled={opt.disabled}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => selectOption(opt)}
                  className={`${OFFSLEEK_DROPDOWN_TOKENS.optionBase} ${optionSizeClass} ${
                    isSelected ? 'font-semibold' : 'font-medium'
                  } ${opt.disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate leading-snug">{opt.label}</div>
                    {opt.description && (
                      <div
                        className={`text-[10px] mt-0.5 truncate leading-tight ${
                          isSelected ? 'text-neutral-300' : 'text-[#6b7280]'
                        }`}
                      >
                        {opt.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white stroke-[2.4] shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`${OFFSLEEK_DROPDOWN_TOKENS.triggerBase} ${sizePaddingClass} ${
          hasError ? '!border-red-500' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && (
            <span className="text-black shrink-0 flex items-center justify-center">
              {icon}
            </span>
          )}
          <span
            className={`truncate font-semibold ${
              isPlaceholder ? 'text-[#6b7280] font-medium' : 'text-black'
            }`}
          >
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-black stroke-[2] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {menuContent && typeof document !== 'undefined'
        ? createPortal(menuContent, document.body)
        : null}
    </div>
  );
}
