'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { saveBigReview, type ProgressFormState } from '@/actions/progress';
import { Button, ErrorBox, Field, Flash, Input } from '@/components/ui';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="info" block disabled={pending} className="mt-3">
      {pending ? 'جارٍ الحفظ…' : 'حفظ المراجعة الكبرى'}
    </Button>
  );
}

/** Port of the المراجعة الكبرى form. Note the score scale here is 0-10, not 0-100. */
export function BigReviewForm({ studentId }: { studentId: number }) {
  const [state, formAction] = useActionState<ProgressFormState, FormData>(
    saveBigReview,
    undefined,
  );
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {state?.ok ? <Flash>{state.message}</Flash> : null}
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <input type="hidden" name="student_id" value={studentId} />

      <Field label="المحفوظ خلال الأسبوع" error={errors.weekly_memorization} required>
        <Input
          name="weekly_memorization"
          maxLength={255}
          required
          placeholder="مثال: سورة النبأ و العاديات…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="العلامة" error={errors.score} hint="من 0 إلى 10">
          <Input type="number" name="score" min={0} max={10} placeholder="8" />
        </Field>
        <Field label="واجب المراجعة" error={errors.review_homework}>
          <Input name="review_homework" maxLength={255} placeholder="مثال: مراجعة العاديات 2 - 8" />
        </Field>
      </div>

      <SubmitButton />
    </form>
  );
}
