import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { updateActivity } from '@/actions/activities';
import { ActivityForm, type ActivityInitial } from '@/components/ActivityForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'تعديل النشاط' };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin');
  const { id } = await params;
  const activityId = Number(id);
  if (!Number.isInteger(activityId)) notFound();

  const supabase = await createClient();
  const { data: activity } = await supabase
    .from('activities')
    .select('id, title, description, date, students_count')
    .eq('id', activityId)
    .maybeSingle();

  if (!activity) notFound();

  return (
    <Page>
      <BackLink href="/admin/activities" />
      <PageHeader title="تعديل النشاط" subtitle={activity.title} />
      <SectionCard title="بيانات النشاط">
        <ActivityForm
          action={updateActivity}
          initial={activity as ActivityInitial}
          submitLabel="حفظ التعديلات"
        />
      </SectionCard>
    </Page>
  );
}
