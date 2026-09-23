'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import type { AccountFormState } from '@/actions/accounts';
import { Button, ErrorBox, Field, Input } from '@/components/ui';

type Action = (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;

export type AccountInitial = { id: string; name: string; phone: string };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending} className="mt-2">
      {pending ? 'جارٍ الحفظ…' : label}
    </Button>
  );
}

/** Shared by the admin teacher and parent create/edit screens. */
export function AccountForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: AccountInitial;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(action, undefined);
  const isEdit = Boolean(initial);
  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}
      {isEdit ? <input type="hidden" name="id" value={initial!.id} /> : null}

      <Field label="الاسم" htmlFor="name" error={errors.name} required>
        <Input id="name" name="name" defaultValue={initial?.name ?? ''} maxLength={255} required />
      </Field>

      <Field
        label="رقم الهاتف"
        htmlFor="phone"
        error={errors.phone}
        hint="يُستخدم لتسجيل الدخول"
        required
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          className="text-right"
          defaultValue={initial?.phone ?? ''}
          maxLength={255}
          required
          placeholder="09xxxxxxxx"
        />
      </Field>

      <Field
        label="كلمة المرور"
        htmlFor="password"
        error={errors.password}
        hint={isEdit ? 'اتركها فارغة للإبقاء على كلمة المرور الحالية' : 'ستة أحرف على الأقل'}
        required={!isEdit}
      >
        <Input
          id="password"
          name="password"
          type="text"
          autoComplete="new-password"
          required={!isEdit}
        />
      </Field>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
