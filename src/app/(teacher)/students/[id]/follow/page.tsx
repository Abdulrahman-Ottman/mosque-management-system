import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BigReviewForm } from '@/components/follow/BigReviewForm';
import { FollowTabs } from '@/components/follow/FollowTabs';
import { LogList, type ProgressLogRow } from '@/components/follow/LogList';
import { MemorizationForm } from '@/components/follow/MemorizationForm';
import { PointsPanel } from '@/components/follow/PointsPanel';
import {
  Avatar,
  BackLink,
  Card,
  Chip,
  Page,
  ProgressBar,
  SectionCard,
} from '@/components/ui';
import { quranProgressFor } from '@/lib/quran-progress';
import { SURAHS } from '@/lib/quran-surahs';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'متابعة الطالب' };

/** Port of resources/views/follow.blade.php (729 lines), split into tab panels. */
export default async function FollowPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('teacher');
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) notFound();

  const supabase = await createClient();

  // RLS restricts this to the teacher's own students, so another teacher's id
  // returns nothing and 404s - closing the hole in StudentController::follow.
  const { data: student } = await supabase
    .from('students')
    .select('id, name, phone_number, grade, points')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) notFound();

  const { data: logs } = await supabase
    .from('progress_logs')
    .select(
      'id, type, created_at, surah, surah_number, from_ayah, to_ayah, score, homework, daily_review, review_score, review_homework, notes, weekly_memorization',
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  const all = (logs ?? []) as unknown as (ProgressLogRow & { surah_number: number | null })[];
  const memorization = all.filter((l) => l.type === 'memorization');
  const reviews = all.filter((l) => l.type === 'big_review');

  const progress = quranProgressFor(
    memorization.map((l) => ({
      surah: l.surah,
      surah_number: l.surah_number,
      from_ayah: l.from_ayah,
      to_ayah: l.to_ayah,
      score: l.score,
      type: l.type,
    })),
  );

  return (
    <Page>
      <BackLink href="/dashboard" />

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={student.name} className="size-12" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[length:var(--text-xl)] font-extrabold text-ink">
              {student.name}
            </h1>
            <p className="m-0 truncate text-[length:var(--text-xs)] text-ink-muted">
              {student.grade || 'بدون صف'} ·{' '}
              <span className="ltr-nums inline-block">
                {student.phone_number || 'لا يوجد رقم'}
              </span>
            </p>
          </div>
          <Chip tone="gold">{student.points} نقطة</Chip>
        </div>

        <div className="mt-4">
          <ProgressBar
            percent={progress.percent}
            label="نسبة حفظ القرآن"
            sublabel={`${progress.memorized} / ${progress.total} آية · ${progress.percent}%`}
          />
        </div>
      </Card>

      <FollowTabs
        newTab={
          <>
            <SectionCard title="الحفظ الجديد">
              <MemorizationForm studentId={student.id} surahs={SURAHS} />
            </SectionCard>
            <SectionCard title="سجل الحفظ الجديد" count={memorization.length}>
              <LogList logs={memorization} />
            </SectionCard>
          </>
        }
        reviewTab={
          <>
            <SectionCard title="المراجعة الكبرى">
              <BigReviewForm studentId={student.id} />
            </SectionCard>
            <SectionCard title="سجل المراجعة الكبرى" count={reviews.length}>
              <LogList logs={reviews} />
            </SectionCard>
          </>
        }
        pointsTab={<PointsPanel studentId={student.id} points={student.points} />}
      />
    </Page>
  );
}
