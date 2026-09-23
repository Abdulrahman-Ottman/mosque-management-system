'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { addScheduleItem, type ScheduleFormState } from '@/actions/schedule';
import { Button, ErrorBox, Input } from '@/components/ui';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? '…' : 'إضافة'}
    </Button>
  );
}

export function AddScheduleItemForm({ day }: { day: number }) {
  const [state, formAction] = useActionState<ScheduleFormState, FormData>(
    addScheduleItem,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box after a successful add, so several items can be typed in a row.
  useEffect(() => {
    if (state === undefined) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}
      <input type="hidden" name="day" value={day} />
      <div className="flex items-stretch gap-2">
        <Input
          name="content"
          maxLength={500}
          required
          placeholder="مثال: تسميع الحفظ الجديد"
          className="flex-1"
        />
        <SubmitButton />
      </div>
    </form>
  );
}
