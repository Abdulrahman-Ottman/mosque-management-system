'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { login, type AuthFormState } from '@/actions/auth';
import { Button, ErrorBox, Field, Input } from '@/components/ui';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending}>
      {pending ? 'جارٍ الدخول…' : 'دخول'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(login, undefined);

  return (
    <form action={formAction} noValidate>
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <Field label="رقم الهاتف" htmlFor="phone" required>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          dir="ltr"
          className="text-right"
          placeholder="09xxxxxxxx"
          required
        />
      </Field>

      <Field label="كلمة المرور" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <div className="mt-5">
        <SubmitButton />
      </div>
    </form>
  );
}
