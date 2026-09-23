/*
 * The shared design system, ported from public/css/theme.css.
 *
 * One component per class family in the original stylesheet, so a Blade page that
 * said `class="btn btn-primary"` becomes `<Button variant="primary">`. Tokens live
 * in app/globals.css; nothing here should hard-code a hex value.
 */
import Link from 'next/link';

import { ArrowBackIcon } from '@/components/icons';
import type { ComponentProps, ReactNode } from 'react';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export function Page({
  children,
  wide = false,
  className,
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('mx-auto w-full p-4', wide ? 'max-w-[1100px]' : 'max-w-[760px]', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="m-0 text-[length:var(--text-xl)] font-extrabold text-ink">{title}</h1>
        {subtitle ? (
          <p className="mt-1 mb-0 text-[length:var(--text-sm)] text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** In RTL, a RIGHT-pointing arrow means "back". Matches the original markup. */
export function BackLink({ href, children = 'رجوع' }: { href: string; children?: ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex items-center gap-2 text-[length:var(--text-sm)] font-semibold text-ink-muted no-underline transition-colors hover:text-accent"
    >
      <ArrowBackIcon className="size-4 shrink-0" />
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'info' | 'ghost';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border font-bold no-underline transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent border-accent text-white hover:bg-accent-strong hover:border-accent-strong',
  secondary: 'bg-surface border-border text-ink hover:bg-accent-soft hover:border-accent',
  danger: 'bg-danger-soft border-danger/30 text-danger hover:bg-danger hover:text-white',
  info: 'bg-info-soft border-info/30 text-info hover:bg-info hover:text-white',
  ghost: 'bg-transparent border-transparent text-ink-muted hover:text-accent',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  opts: { size?: 'sm' | 'md'; block?: boolean; className?: string } = {},
) {
  const { size = 'md', block = false, className } = opts;
  return cx(
    BUTTON_BASE,
    BUTTON_VARIANTS[variant],
    size === 'sm'
      ? 'px-3 py-1.5 text-[length:var(--text-xs)]'
      : 'px-4 py-2.5 text-[length:var(--text-sm)]',
    block && 'w-full',
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  ...props
}: ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  block?: boolean;
}) {
  return <button className={buttonClass(variant, { size, block, className })} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  block?: boolean;
}) {
  return <Link className={buttonClass(variant, { size, block, className })} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  return (
    <Tag
      className={cx(
        'rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionCard({
  title,
  count,
  action,
  children,
  className,
}: {
  title: ReactNode;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'mb-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-[length:var(--text-lg)] font-extrabold text-ink">
          {title}
          {typeof count === 'number' ? (
            <span className="rounded-[var(--radius-full)] bg-accent-soft px-2 py-0.5 text-[length:var(--text-xs)] font-bold text-accent">
              {count}
            </span>
          ) : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-paper px-4 py-8 text-center text-[length:var(--text-sm)] text-ink-muted">
      {icon ? (
        <div className="mb-2.5 flex justify-center text-ink-faint [&>svg]:size-8">{icon}</div>
      ) : null}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chips, avatars, pills                                                       */
/* -------------------------------------------------------------------------- */

type ChipTone = 'green' | 'amber' | 'rose' | 'gray' | 'blue' | 'gold';

const CHIP_TONES: Record<ChipTone, string> = {
  green: 'bg-accent-soft text-accent',
  amber: 'bg-warning-soft text-warning',
  rose: 'bg-danger-soft text-danger',
  gray: 'bg-paper text-ink-muted border border-border',
  blue: 'bg-info-soft text-info',
  gold: 'bg-gold-soft text-gold-strong',
};

export function Chip({
  tone = 'gray',
  children,
  className,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-[length:var(--text-xs)] font-bold whitespace-nowrap',
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0) || '؟';
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-accent-soft text-[length:var(--text-base)] font-extrabold text-accent',
        className,
      )}
    >
      {initial}
    </span>
  );
}

export function TypePill({ type }: { type: string }) {
  const isMemorization = type === 'memorization';
  return (
    <Chip tone={isMemorization ? 'green' : 'gold'}>
      {isMemorization ? 'حفظ جديد' : 'مراجعة كبرى'}
    </Chip>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

export function ProgressBar({
  percent,
  label,
  sublabel,
}: {
  percent: number;
  label?: ReactNode;
  sublabel?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div>
      {label || sublabel ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[length:var(--text-xs)] font-bold text-ink-muted">
          <span>{label}</span>
          <span>{sublabel}</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-border"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-[var(--radius-full)] bg-accent transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stats and leaderboards                                                      */
/* -------------------------------------------------------------------------- */

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'gold';
}) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius)] border p-3 text-center shadow-[var(--shadow-xs)]',
        tone === 'gold' ? 'border-gold/40 bg-gold-soft' : 'border-border bg-surface',
      )}
    >
      <div className="text-[length:var(--text-2xl)] font-extrabold text-ink tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[length:var(--text-xs)] font-semibold text-ink-muted">
        {label}
      </div>
      {hint ? <div className="mt-1 text-[length:var(--text-xs)] text-ink-faint">{hint}</div> : null}
    </div>
  );
}

export function RankList({ children }: { children: ReactNode }) {
  return <ol className="m-0 flex list-none flex-col gap-2 p-0">{children}</ol>;
}

export function RankRow({
  index,
  name,
  sub,
  value,
}: {
  index: number;
  name: ReactNode;
  sub?: ReactNode;
  value: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-accent-soft text-[length:var(--text-xs)] font-extrabold text-accent tabular-nums">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[length:var(--text-sm)] font-bold text-ink">{name}</span>
        {sub ? <span className="block text-[length:var(--text-xs)] text-ink-muted">{sub}</span> : null}
      </span>
      <span className="text-[length:var(--text-sm)] font-extrabold text-accent tabular-nums">
        {value}
      </span>
    </li>
  );
}

/** A labelled proportion bar, as used by the admin attendance breakdown. */
export function BreakdownRow({
  label,
  count,
  total,
  color = 'var(--color-accent)',
}: {
  label: ReactNode;
  count: number;
  total: number;
  color?: string;
}) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[length:var(--text-xs)] font-semibold text-ink-muted">
        <span>{label}</span>
        <span className="tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-border">
        <div
          className="h-full rounded-[var(--radius-full)]"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                    */
/* -------------------------------------------------------------------------- */

export function Flash({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="mb-3 rounded-[var(--radius-sm)] border border-accent/25 bg-accent-soft px-3 py-2.5 text-[length:var(--text-sm)] font-semibold text-accent"
    >
      {children}
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-3 rounded-[var(--radius-sm)] border border-danger/25 bg-danger-soft px-3 py-2.5 text-[length:var(--text-sm)] font-semibold text-danger"
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Forms                                                                       */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[length:var(--text-sm)] font-bold text-ink"
      >
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 mb-0 text-[length:var(--text-xs)] text-ink-faint">{hint}</p> : null}
      {error ? (
        <p className="mt-1 mb-0 text-[length:var(--text-xs)] font-semibold text-danger">{error}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'block w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-[length:var(--text-sm)] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-paper disabled:text-ink-faint';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cx(inputClass, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cx(inputClass, 'appearance-none', className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Log entries                                                                 */
/* -------------------------------------------------------------------------- */

export function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
      <span className="text-[length:var(--text-xs)] font-semibold text-ink-muted">{label}</span>
      <span className="text-[length:var(--text-sm)] font-bold text-ink">{value}</span>
    </div>
  );
}
