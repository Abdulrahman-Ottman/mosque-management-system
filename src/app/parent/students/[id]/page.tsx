import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SurahBreakdown } from '@/components/SurahBreakdown';
import {
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  StarIcon,
  XCircleIcon,
} from '@/components/icons';
import {
  Avatar,
  BackLink,
  Card,
  Chip,
  DetailRow,
  EmptyState,
  Page,
  ProgressBar,
  SectionCard,
  StatGrid,
  StatTile,
  cx,
} from '@/components/ui';
import {
  appDateOf,
  dayName,
  labelForDateString,
  today,
  weekDays,
  weekRange,
} from '@/lib/arabic-date';
import {
  STATUS_EXCUSED_ABSENCE,
  STATUS_LATE,
  STATUS_PRESENT,
  STATUS_UNEXCUSED_ABSENCE,
} from '@/lib/attendance';
import { PASS_THRESHOLD, quranProgressFor } from '@/lib/quran-progress';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'متابعة الابن' };

const STATUS_STYLE: Record<
  string,
  { tone: string; Icon: (p: { className?: string }) => React.ReactElement }
> = {
  [STATUS_PRESENT]: { tone: 'bg-accent text-white border-accent', Icon: CheckIcon },
  [STATUS_LATE]: { tone: 'bg-warning text-white border-warning', Icon: ClockIcon },
  [STATUS_EXCUSED_ABSENCE]: {
    tone: 'bg-ink-faint text-white border-ink-faint',
    Icon: FileTextIcon,
  },
  [STATUS_UNEXCUSED_ABSENCE]: { tone: 'bg-danger text-white border-danger', Icon: XCircleIcon },
};

/** Port of resources/views/parent/student.blade.php - read-only child detail. */
export default async function ParentStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole('parent');
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) notFound();

  const supabase = await createClient();

  // Scoped to this parent's own children - the one place the Laravel app already
  // got ownership right.
  const { data: student } = await supabase
    .from('students')
    .select('id, name, grade, points')
    .eq('id', studentId)
    .eq('parent_id', user.id)
    .maybeSingle();

  if (!student) notFound();

  const date = today();
  const { start, end } = weekRange();

  const [{ data: allLogs }, { data: attendance }] = await Promise.all([
    supabase
      .from('progress_logs')
      .select(
        'id, type, created_at, surah, surah_number, from_ayah, to_ayah, score, homework, daily_review, review_score, review_homework, notes, weekly_memorization',
      )
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance_logs')
      .select('status, date, absence_reason')
      .eq('student_id', studentId)
      .gte('date', start)
      .lte('date', end),
  ]);

  const logs = allLogs ?? [];
  const memorization = logs.filter((l) => l.type === 'memorization');
  const reviews = logs.filter((l) => l.type === 'big_review');

  const progress = quranProgressFor(memorization as never);

  // appDateOf converts the stored UTC instant to the mosque's local date. Slicing the
  // ISO string would give the UTC date, which is a day early for anything logged
  // between midnight and 03:00 local.
  const todayLogs = memorization.filter((l) => appDateOf(l.created_at) === date);
  const weekMemorization = memorization.filter((l) => {
    const d = appDateOf(l.created_at);
    return d >= start && d <= end;
  });
  const weekReviews = reviews.filter((l) => {
    const d = appDateOf(l.created_at);
    return d >= start && d <= end;
  });

  const attendanceByDate = new Map((attendance ?? []).map((a) => [a.date, a]));
  const days = weekDays();

  return (
    <Page>
      <BackLink href="/parent/dashboard" />

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={student.name} className="size-12" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[length:var(--text-xl)] font-extrabold text-ink">
              {student.name}
            </h1>
            <p className="m-0 text-[length:var(--text-xs)] text-ink-muted">
              {student.grade || 'بدون صف'}
            </p>
          </div>
          <Chip tone="gold">{student.points} نقطة</Chip>
        </div>
      </Card>

      <SectionCard title="حفظ القرآن الكريم">
        <ProgressBar
          percent={progress.percent}
          label={`${progress.percent}%`}
          sublabel={`${progress.memorized} / ${progress.total} آية`}
        />
        <SurahBreakdown bySurah={progress.bySurah} />
      </SectionCard>

      <SectionCard title="حضور الأسبوع">
        <ul className="m-0 grid list-none grid-cols-7 gap-1.5 p-0">
          {days.map((d) => {
            const log = attendanceByDate.get(d);
            const style = log ? STATUS_STYLE[log.status] : null;
            const dow = new Date(`${d}T00:00:00Z`).getUTCDay();

            return (
              <li key={d} className="text-center">
                <span className="mb-1 block text-[length:var(--text-xs)] text-ink-faint">
                  {dayName(dow).slice(0, 3)}
                </span>
                <span
                  title={log ? `${log.status}${log.absence_reason ? ` — ${log.absence_reason}` : ''}` : 'لم يُسجَّل'}
                  className={cx(
                    'mx-auto flex size-9 items-center justify-center rounded-[var(--radius-sm)] border text-[length:var(--text-sm)] font-bold',
                    style ? style.tone : 'border-border bg-paper text-ink-faint',
                  )}
                >
                  {style ? <style.Icon className="size-5" /> : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <StatGrid>
        <StatTile label="تسجيلات اليوم" value={todayLogs.length} />
        <StatTile label="حفظ الأسبوع" value={weekMemorization.length} />
        <StatTile label="مراجعات الأسبوع" value={weekReviews.length} />
        <StatTile label="النقاط" value={student.points} tone="gold" />
      </StatGrid>

      <SectionCard title="تسجيلات اليوم" count={todayLogs.length}>
        {todayLogs.length === 0 ? (
          <EmptyState>لا يوجد تسجيل حفظ اليوم.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {todayLogs.map((log) => (
              <Card key={log.id} className="bg-paper">
                <DetailRow label="السورة" value={log.surah} />
                <DetailRow label="من آية" value={log.from_ayah} />
                <DetailRow label="إلى آية" value={log.to_ayah} />
                <DetailRow
                  label="العلامة"
                  value={
                    log.score === null ? null : (
                      <span
                        className={
                          log.score < PASS_THRESHOLD ? 'text-danger' : 'text-accent'
                        }
                      >
                        {log.score}
                      </span>
                    )
                  }
                />
                <DetailRow label="الواجب المنزلي" value={log.homework} />
                <DetailRow label="ملاحظات" value={log.notes} />
              </Card>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="حفظ الأسبوع" count={weekMemorization.length}>
        {weekMemorization.length === 0 ? (
          <EmptyState>لا يوجد حفظ مسجّل هذا الأسبوع.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {weekMemorization.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-paper px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[length:var(--text-sm)] font-bold text-ink">
                    {log.surah ?? 'بدون سورة'}
                  </span>
                  <span className="block text-[length:var(--text-xs)] text-ink-muted">
                    من {log.from_ayah ?? '-'} إلى {log.to_ayah ?? '-'} ·{' '}
                    {labelForDateString(appDateOf(log.created_at))}
                  </span>
                </span>
                <Chip
                  tone={
                    log.score === null
                      ? 'gray'
                      : log.score < PASS_THRESHOLD
                        ? 'rose'
                        : 'green'
                  }
                >
                  <StarIcon className="size-3 shrink-0" />
                  {log.score ?? '-'}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="المراجعة الكبرى هذا الأسبوع" count={weekReviews.length}>
        {weekReviews.length === 0 ? (
          <EmptyState>لا توجد مراجعة كبرى هذا الأسبوع.</EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {weekReviews.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-paper px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[length:var(--text-sm)] font-bold text-ink">
                    {log.weekly_memorization ?? 'بدون عنوان'}
                  </span>
                  <span className="block text-[length:var(--text-xs)] text-ink-muted">
                    {labelForDateString(appDateOf(log.created_at))}
                  </span>
                </span>
                <Chip tone="amber">
                  <StarIcon className="size-3 shrink-0" />
                  {log.score ?? '-'}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </Page>
  );
}
