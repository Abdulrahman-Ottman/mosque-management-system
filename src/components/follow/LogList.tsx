'use client';

import { useEffect, useState } from 'react';

import { BookIcon, CloseIcon, RotateIcon, StarIcon } from '@/components/icons';
import { Chip, DetailRow, EmptyState, cx } from '@/components/ui';
import { appDateOf, appDateTimeLabel } from '@/lib/arabic-date';
import { PASS_THRESHOLD } from '@/lib/quran-progress';

export type ProgressLogRow = {
  id: number;
  type: 'memorization' | 'big_review';
  created_at: string;
  surah: string | null;
  from_ayah: number | null;
  to_ayah: number | null;
  score: number | null;
  homework: string | null;
  daily_review: string | null;
  review_score: number | null;
  review_homework: string | null;
  notes: string | null;
  weekly_memorization: string | null;
};

const isFailed = (log: ProgressLogRow) =>
  log.type === 'memorization' && log.score !== null && log.score < PASS_THRESHOLD;

// Timestamps arrive as UTC; show them in the mosque's local time.
const dateOnly = (iso: string) => appDateOf(iso);
const dateTime = (iso: string) => appDateTimeLabel(iso);

/**
 * The history list plus its detail modal.
 *
 * The Blade version built the modal's HTML by string concatenation and needed a
 * hand-rolled escapeHtml() to avoid injecting a student's notes as markup. Passing
 * the log object as a prop removes that whole class of bug.
 */
export function LogList({ logs }: { logs: ProgressLogRow[] }) {
  const [openLog, setOpenLog] = useState<ProgressLogRow | null>(null);

  useEffect(() => {
    if (!openLog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenLog(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openLog]);

  if (logs.length === 0) {
    return <EmptyState>لا يوجد تسجيلات بعد.</EmptyState>;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {logs.map((log) => {
          const failed = isFailed(log);
          const title =
            log.type === 'memorization'
              ? (log.surah ?? 'بدون سورة')
              : (log.weekly_memorization ?? 'بدون عنوان');

          return (
            <button
              key={log.id}
              type="button"
              onClick={() => setOpenLog(log)}
              className="w-full cursor-pointer rounded-[var(--radius)] border border-border bg-surface p-3 text-right transition-colors hover:border-accent hover:bg-accent-soft/40"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="m-0 flex min-w-0 items-center gap-1.5 text-[length:var(--text-sm)] font-extrabold text-ink">
                  {log.type === 'memorization' ? (
                    <BookIcon className="size-4 shrink-0 text-accent" />
                  ) : (
                    <RotateIcon className="size-4 shrink-0 text-gold-strong" />
                  )}
                  <span className="truncate">{title}</span>
                </p>
                <span className="shrink-0 text-[length:var(--text-xs)] text-ink-faint tabular-nums">
                  {dateOnly(log.created_at)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {log.score !== null && log.type === 'memorization' ? (
                  <Chip tone={failed ? 'rose' : 'green'}>{failed ? 'راسب' : 'ناجح'}</Chip>
                ) : null}
                <Chip tone={log.type === 'big_review' ? 'amber' : 'gray'}>
                  <StarIcon className="size-3 shrink-0" />
                  {log.score ?? '-'}
                </Chip>
                {log.type === 'memorization' ? (
                  <Chip tone="gray">
                    من {log.from_ayah ?? '-'} إلى {log.to_ayah ?? '-'}
                  </Chip>
                ) : null}
              </div>

              {log.review_homework && log.type === 'big_review' ? (
                <p className="mt-2 mb-0 truncate text-[length:var(--text-xs)] text-ink-muted">
                  واجب المراجعة: {log.review_homework}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      {openLog ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenLog(null);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        >
          <div
            className={cx(
              'max-h-[85vh] w-full overflow-y-auto rounded-t-[var(--radius-lg)] bg-surface p-4 shadow-[0_-8px_40px_rgba(0,0,0,.25)]',
              'sm:max-w-[480px] sm:rounded-[var(--radius-lg)]',
            )}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />

            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="log-modal-title"
                  className="m-0 text-[length:var(--text-lg)] font-extrabold text-ink"
                >
                  تفاصيل السجل
                </h3>
                <p className="m-0 text-[length:var(--text-xs)] text-ink-muted tabular-nums">
                  {dateTime(openLog.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenLog(null)}
                aria-label="إغلاق"
                className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-border bg-paper p-1.5 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            {openLog.type === 'memorization' ? (
              <>
                <DetailRow label="السورة" value={openLog.surah} />
                <DetailRow label="من آية" value={openLog.from_ayah} />
                <DetailRow label="إلى آية" value={openLog.to_ayah} />
                <DetailRow
                  label="العلامة"
                  value={
                    openLog.score === null ? null : (
                      <span className={isFailed(openLog) ? 'text-danger' : 'text-accent'}>
                        {openLog.score} {isFailed(openLog) ? '(راسب)' : '(ناجح)'}
                      </span>
                    )
                  }
                />
                <DetailRow label="الواجب المنزلي" value={openLog.homework} />
                <DetailRow label="المراجعة اليومية" value={openLog.daily_review} />
                <DetailRow label="علامة المراجعة" value={openLog.review_score} />
                <DetailRow label="واجب المراجعة" value={openLog.review_homework} />
                <DetailRow label="ملاحظات" value={openLog.notes} />
              </>
            ) : (
              <>
                <DetailRow label="المحفوظ خلال الأسبوع" value={openLog.weekly_memorization} />
                <DetailRow label="العلامة" value={openLog.score} />
                <DetailRow label="واجب المراجعة" value={openLog.review_homework} />
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
