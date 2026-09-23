import type { Metadata } from 'next';

import {
  BreakdownRow,
  Card,
  EmptyState,
  Page,
  PageHeader,
  ProgressBar,
  RankList,
  RankRow,
  SectionCard,
  StatGrid,
  StatTile,
} from '@/components/ui';
import { today, weekRange } from '@/lib/arabic-date';
import {
  STATUS_EXCUSED_ABSENCE,
  STATUS_LATE,
  STATUS_PRESENT,
  STATUS_UNEXCUSED_ABSENCE,
} from '@/lib/attendance';
import { PASS_THRESHOLD, quranProgressFor } from '@/lib/quran-progress';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'الإحصائيات' };

const STATUS_ROWS = [
  { label: STATUS_PRESENT, color: 'var(--color-accent)' },
  { label: STATUS_LATE, color: 'var(--color-warning)' },
  { label: STATUS_EXCUSED_ABSENCE, color: 'var(--color-ink-faint)' },
  { label: STATUS_UNEXCUSED_ABSENCE, color: 'var(--color-danger)' },
];

function tally(rows: { status: string }[] | null): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows ?? []) out.set(r.status, (out.get(r.status) ?? 0) + 1);
  return out;
}

/** Port of resources/views/admin/dashboard.blade.php. */
export default async function AdminDashboard() {
  await requireRole('admin');
  const supabase = await createClient();

  const date = today();
  const { start, end } = weekRange();

  const [
    { data: users },
    { data: students },
    { data: todayRows },
    { data: weekRows },
    { data: weekLogs },
    { data: allLogs },
  ] = await Promise.all([
    supabase.from('users').select('id, name, role'),
    supabase.from('students').select('id, name, points, user_id, parent_id'),
    supabase.from('attendance_logs').select('status').eq('date', date),
    supabase.from('attendance_logs').select('status').gte('date', start).lte('date', end),
    supabase
      .from('progress_logs')
      .select('score, type')
      .eq('type', 'memorization')
      .gte('created_at', `${start}T00:00:00Z`)
      .lte('created_at', `${end}T23:59:59Z`),
    // One query for every memorization log, grouped in TS below. The Laravel version
    // ran QuranProgress::forStudent() once per student - an N+1 that would be far
    // worse over the network than it was against a local MySQL.
    supabase
      .from('progress_logs')
      .select('student_id, surah, surah_number, from_ayah, to_ayah, score, type')
      .eq('type', 'memorization'),
  ]);

  const teachers = (users ?? []).filter((u) => u.role === 'teacher');
  const parents = (users ?? []).filter((u) => u.role === 'parent');
  const allStudents = students ?? [];

  const todayCounts = tally(todayRows);
  const weekCounts = tally(weekRows);
  const todayTotal = [...todayCounts.values()].reduce((a, b) => a + b, 0);
  const weekTotal = [...weekCounts.values()].reduce((a, b) => a + b, 0);

  const weekLogged = (weekLogs ?? []).length;
  const weekFailed = (weekLogs ?? []).filter(
    (l) => l.score !== null && l.score < PASS_THRESHOLD,
  ).length;
  const weekPassed = (weekLogs ?? []).filter(
    (l) => l.score !== null && l.score >= PASS_THRESHOLD,
  ).length;

  // Group logs by student, then run the same pure function used everywhere else.
  const logsByStudent = new Map<number, typeof allLogs>();
  for (const log of allLogs ?? []) {
    const list = logsByStudent.get(log.student_id) ?? [];
    list.push(log);
    logsByStudent.set(log.student_id, list);
  }

  const completion = allStudents.map((s) => {
    const p = quranProgressFor((logsByStudent.get(s.id) ?? []) as never);
    return { student: s, percent: p.percent, memorized: p.memorized };
  });

  const avgCompletion =
    completion.length === 0
      ? 0
      : Math.round((completion.reduce((a, c) => a + c.percent, 0) / completion.length) * 10) / 10;

  const topByCompletion = [...completion].sort((a, b) => b.percent - a.percent).slice(0, 5);
  const topByPoints = [...allStudents].sort((a, b) => b.points - a.points).slice(0, 5);

  const loads = teachers
    .map((t) => ({ ...t, count: allStudents.filter((s) => s.user_id === t.id).length }))
    .sort((a, b) => b.count - a.count);
  const maxLoad = Math.max(1, ...loads.map((l) => l.count));

  const withParent = allStudents.filter((s) => s.parent_id !== null).length;

  return (
    <Page wide>
      <PageHeader title="الإحصائيات" subtitle="نظرة عامة على المعهد" />

      <StatGrid>
        <StatTile label="الأساتذة" value={teachers.length} />
        <StatTile label="أولياء الأمور" value={parents.length} />
        <StatTile label="الطلاب" value={allStudents.length} />
        <StatTile
          label="متوسط الحفظ"
          value={`${avgCompletion}%`}
          tone="gold"
          hint={
            <span className="ltr-nums inline-block">
              {withParent} / {allStudents.length} مرتبط بولي أمر
            </span>
          }
        />
      </StatGrid>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="حضور اليوم" count={todayTotal}>
          {todayTotal === 0 ? (
            <EmptyState>لم يُسجَّل حضور اليوم بعد.</EmptyState>
          ) : (
            STATUS_ROWS.map((row) => (
              <BreakdownRow
                key={row.label}
                label={row.label}
                count={todayCounts.get(row.label) ?? 0}
                total={todayTotal}
                color={row.color}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="حضور الأسبوع" count={weekTotal}>
          {weekTotal === 0 ? (
            <EmptyState>لا يوجد حضور مسجّل هذا الأسبوع.</EmptyState>
          ) : (
            STATUS_ROWS.map((row) => (
              <BreakdownRow
                key={row.label}
                label={row.label}
                count={weekCounts.get(row.label) ?? 0}
                total={weekTotal}
                color={row.color}
              />
            ))
          )}
        </SectionCard>
      </div>

      <SectionCard title="الحفظ خلال الأسبوع">
        <StatGrid>
          <StatTile label="تسجيلات" value={weekLogged} />
          <StatTile label="ناجح" value={weekPassed} />
          <StatTile label="راسب" value={weekFailed} />
          <StatTile
            label="نسبة النجاح"
            value={weekLogged > 0 ? `${Math.round((weekPassed / weekLogged) * 100)}%` : '—'}
          />
        </StatGrid>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="الأعلى حفظًا">
          {topByCompletion.length === 0 ? (
            <EmptyState>لا توجد بيانات بعد.</EmptyState>
          ) : (
            <RankList>
              {topByCompletion.map((row, i) => (
                <RankRow
                  key={row.student.id}
                  index={i}
                  name={row.student.name}
                  sub={`${row.memorized} آية`}
                  value={`${row.percent}%`}
                />
              ))}
            </RankList>
          )}
        </SectionCard>

        <SectionCard title="الأعلى نقاطًا">
          {topByPoints.length === 0 ? (
            <EmptyState>لا توجد بيانات بعد.</EmptyState>
          ) : (
            <RankList>
              {topByPoints.map((s, i) => (
                <RankRow key={s.id} index={i} name={s.name} value={`${s.points}`} />
              ))}
            </RankList>
          )}
        </SectionCard>
      </div>

      <SectionCard title="توزيع الطلاب على الأساتذة" count={teachers.length}>
        {loads.length === 0 ? (
          <EmptyState>لا يوجد أساتذة بعد.</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {loads.map((t) => (
              <Card key={t.id} className="p-3">
                <ProgressBar
                  percent={(t.count / maxLoad) * 100}
                  label={t.name}
                  sublabel={`${t.count} طالب`}
                />
              </Card>
            ))}
          </div>
        )}
      </SectionCard>
    </Page>
  );
}
