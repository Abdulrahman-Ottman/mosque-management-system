'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui';

/**
 * Replaces the Blade pages' `onsubmit="return confirm('...')"` on delete forms.
 * Also disables itself while the action is in flight, which the original did not do.
 */
export function ConfirmSubmit({
  message,
  children,
  variant = 'danger',
  size = 'sm',
}: {
  message: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'info' | 'ghost';
  size?: 'sm' | 'md';
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
