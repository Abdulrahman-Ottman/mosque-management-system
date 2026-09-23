'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import type { ActivityFormState } from '@/actions/activities';
import { Button, ErrorBox, Field, Input, Textarea } from '@/components/ui';

type Action = (s: ActivityFormState, fd: FormData) => Promise<ActivityFormState>;

export type ActivityInitial = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  students_count: number;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending} className="mt-2">
      {pending ? 'جارٍ الحفظ…' : label}
    </Button>
  );
}

/** Shared by the activity create and edit screens. */
export function ActivityForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: ActivityInitial;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActivityFormState, FormData>(action, undefined);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <Field label="عنوان النشاط" htmlFor="title" error={errors.title} required>
        <Input
          id="title"
          name="title"
          defaultValue={initial?.title ?? ''}
          maxLength={255}
          required
          placeholder="مثال: رحلة إلى المسجد الكبير"
        />
      </Field>

      <Field label="الوصف" htmlFor="description" error={errors.description}>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description ?? ''}
          maxLength={2000}
          placeholder="تفاصيل النشاط…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="التاريخ" htmlFor="date" error={errors.date} required>
          <Input id="date" name="date" type="date" defaultValue={initial?.date ?? ''} required />
        </Field>
        <Field
          label="عدد المشاركين"
          htmlFor="students_count"
          error={errors.students_count}
          required
        >
          <Input
            id="students_count"
            name="students_count"
            type="number"
            min={0}
            defaultValue={initial?.students_count ?? 0}
            required
          />
        </Field>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
