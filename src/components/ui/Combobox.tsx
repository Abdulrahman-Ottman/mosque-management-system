'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { cx, inputClass } from '@/components/ui';

export type ComboboxOption = { value: string; label: string; hint?: string };

/**
 * Searchable select, replacing Tom Select from the Blade pages.
 *
 * Arabic search is normalised so that typing "ال عمران" finds "آل عمران" - alef
 * variants, hamza forms, taa marbuta and diacritics are all folded before matching.
 * Without that, the surah picker feels broken for anyone not typing the exact glyph.
 */
export function Combobox({
  name,
  options,
  value,
  onChange,
  placeholder = 'اختر…',
  searchPlaceholder = 'ابحث…',
  disabled = false,
  required = false,
  id,
}: {
  name: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = foldArabic(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => foldArabic(o.label).includes(q) || foldArabic(o.hint ?? '').includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const openPopover = () => {
    // Reset here rather than in an effect - doing it on the event avoids a second
    // render pass, and the filter box is focused once the popover has painted.
    setQuery('');
    setHighlight(0);
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openPopover();
        return;
      }
      setHighlight((h) => {
        const next = e.key === 'ArrowDown' ? h + 1 : h - 1;
        return Math.max(0, Math.min(filtered.length - 1, next));
      });
      return;
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault();
      const option = filtered[highlight];
      if (option) choose(option);
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      {/* The real value the form submits. */}
      <input type="hidden" name={name} value={value} required={required} />

      <button
        type="button"
        id={inputId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          inputClass,
          'flex cursor-pointer items-center justify-between gap-2 text-right',
          disabled && 'cursor-not-allowed bg-paper text-ink-faint',
        )}
      >
        <span className={cx('truncate', !selected && 'text-ink-faint')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={cx(
            'size-4 shrink-0 text-ink-faint transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && !disabled ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface shadow-[0_12px_28px_rgba(16,24,40,.14)]">
          <div className="border-b border-border p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              placeholder={searchPlaceholder}
              className={cx(inputClass, 'py-2 text-[length:var(--text-sm)]')}
            />
          </div>

          <ul role="listbox" className="m-0 max-h-64 list-none overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-[length:var(--text-sm)] text-ink-muted">
                لا توجد نتائج
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => choose(option)}
                      className={cx(
                        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-right text-[length:var(--text-sm)] transition-colors',
                        index === highlight ? 'bg-accent-soft text-accent' : 'text-ink',
                        isSelected && 'font-bold',
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.hint ? (
                        <span className="shrink-0 text-[length:var(--text-xs)] text-ink-faint">
                          {option.hint}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Fold Arabic text for searching: strip diacritics and tatweel, and normalise the
 * letter forms people type inconsistently (أ إ آ ٱ -> ا, ى -> ي, ة -> ه).
 */
function foldArabic(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
