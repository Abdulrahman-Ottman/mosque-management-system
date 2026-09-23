import type { Metadata } from 'next';
import Link from 'next/link';

import { TodaySchedule, type ScheduleItem } from '@/components/TodaySchedule';
import { UsersIcon } from '@/components/icons';
import { Avatar, Card, Chip, EmptyState, Page, PageHeader, ProgressBar } from '@/components/ui';
import { dayOfWeekIn, today, weekRange } from '@/lib/arabic-date';
import {
  STATUS_EXCUSED_ABSENCE,
  STATUS_LATE,
  STATUS_PRESENT,
  STATUS_UNEXCUSED_ABSENCE,
} from '@/lib/attendance';
import { quranProgressFor } from '@/lib/quran-progress';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'أبنائي' };

const TONE: Record<string, 'green' | 'amber' | 'gray' | 'rose'> = {
  [STATUS_PRESENT]: 'green',
  [STATUS_LATE]: 'amber',
  [STATUS_EXCUSED_ABSENCE]: 'gray',
  [STATUS_UNEXCUSED_ABSENCE]: 'rose',
};

/** Port of resources/views/parent/dashboard.blade.php. */
export default async function ParentDashboard() {
  const user = await requireRole('parent');
  const supabase = await createClient();

  const date = today();
  const { start, end } = weekRange();

  // RLS restricts students to this parent's own children.
  const { data: children } = await supabase
    .from('students')
    .select('id, name, grade, points')
    .eq('parent_id', user.id)
    .order('name');

  const ids = (children ?? []).map((c) => c.id);

  const [{ data: logs }, { data: attendance }, { data: schedule }] = await Promise.all([
    ids.length
      ? supabase
          .from('progress_logs')
          .select('student_id, surah, surah_number, from_ayah, to_ayah, score, type')
          .eq('type', 'memorization')
          .in('student_id', ids)
      : Promise.resolve({ data: [] as never[] }),
    ids.length
      ? supabase
          .from('attendance_logs')
          .select('student_id, status, date')
          .in('student_id', ids)
          .gte('date', start)
          .lte('date', end)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from('schedule_items')
      .select('id, content, sort_order')
      .eq('day_of_week', dayOfWeekIn())
      .order('sort_order'),
  ]);

  const logsByStudent = new Map<number, typeof logs>();
  for (const log of logs ?? []) {
    const list = logsByStudent.get(log.student_id) ?? [];
    list.push(log);
    logsByStudent.set(log.student_id, list);
  }

  return (
    <Page>
      <PageHeader title={`أهلاً، ${user.name}`} subtitle={`${(children ?? []).length} من الأبناء`} />

      <TodaySchedule items={(schedule ?? []) as ScheduleItem[]} />

      {(children ?? []).length === 0 ? (
        <EmptyState icon={<UsersIcon />}>لا يوجد أبناء مرتبطون بحسابك بعد.</EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {(children ?? []).map((child) => {
            const progress = quranProgressFor((logsByStudent.get(child.id) ?? []) as never);
            const weekLogs = (attendance ?? []).filter((a) => a.student_id === child.id);
            const todayStatus = weekLogs.find((a) => a.date === date)?.status ?? null;

            const counts = new Map<string, number>();
            for (const a of weekLogs) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);

            return (
              <li key={child.id}>
                <Link href={`/parent/students/${child.id}`} className="block no-underline">
                  <Card className="transition-colors hover:border-accent">
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar name={child.name} />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-[length:var(--text-base)] font-extrabold text-ink">
                          {child.name}
                        </p>
                        <p className="m-0 truncate text-[length:var(--text-xs)] text-ink-muted">
                          {child.grade || 'بدون صف'}
                        </p>
                      </div>
                      <Chip tone="gold">{child.points} نقطة</Chip>
                    </div>

                    <ProgressBar
                      percent={progress.percent}
                      label="نسبة الحفظ"
                      sublabel={`${progress.memorized} / ${progress.total} آية · ${progress.percent}%`}
                    />

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {todayStatus ? (
                        <Chip tone={TONE[todayStatus] ?? 'gray'}>اليوم: {todayStatus}</Chip>
                      ) : (
                        <Chip tone="gray">اليوم: لم يُسجَّل</Chip>
                      )}
                      {[...counts.entries()].map(([status, n]) => (
                        <Chip key={status} tone={TONE[status] ?? 'gray'}>
                          {status}: {n}
                        </Chip>
                      ))}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
