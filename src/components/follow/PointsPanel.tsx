'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { addPoints, subtractPoints, type FormState } from '@/actions/students';
import { CloseIcon } from '@/components/icons';
import { Button, ErrorBox, Input, SectionCard } from '@/components/ui';

function Submit({ label, variant }: { label: string; variant: 'primary' | 'danger' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? '…' : label}
    </Button>
  );
}

/** Port of the النقاط tab, including the deduction modal. */
export function PointsPanel({ studentId, points }: { studentId: number; points: number }) {
  const [addState, addAction] = useActionState<FormState, FormData>(addPoints, undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  // Calling the action directly (rather than through useActionState + an effect)
  // lets the modal close on success without a cascading re-render.
  async function handleSubtract(formData: FormData) {
    const result = await subtractPoints(undefined, formData);
    if (result?.error) {
      setSubError(result.error);
      return;
    }
    setSubError(null);
    setModalOpen(false);
  }

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  return (
    <SectionCard title="النقاط">
      <div className="mb-4 rounded-[var(--radius-lg)] border border-gold/40 bg-gold-soft px-4 py-6 text-center">
        <div className="text-[44px] leading-none font-extrabold text-gold-strong tabular-nums">
          {points}
        </div>
        <div className="mt-1 text-[length:var(--text-sm)] font-bold text-ink-muted">
          إجمالي النقاط
        </div>
      </div>

      {addState?.error ? <ErrorBox>{addState.error}</ErrorBox> : null}

      <form action={addAction} className="mb-3 flex items-stretch gap-2">
        <input type="hidden" name="id" value={studentId} />
        <Input
          type="number"
          name="points"
          min={1}
          required
          placeholder="أضف نقاط…"
          className="flex-1"
        />
        <Submit label="إضافة" variant="primary" />
      </form>

      <Button
        variant="danger"
        block
        onClick={() => {
          setSubError(null);
          setModalOpen(true);
        }}
      >
        خصم نقاط
      </Button>

      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subtract-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
        >
          <div className="w-full rounded-t-[var(--radius-lg)] bg-surface p-4 shadow-[0_-8px_40px_rgba(0,0,0,.25)] sm:max-w-[400px] sm:rounded-[var(--radius-lg)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />

            <div className="mb-3 flex items-center justify-between gap-3">
              <h3
                id="subtract-title"
                className="m-0 text-[length:var(--text-lg)] font-extrabold text-ink"
              >
                خصم نقاط
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="إغلاق"
                className="flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-border bg-paper p-1.5 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            {subError ? <ErrorBox>{subError}</ErrorBox> : null}

            <form action={handleSubtract} className="flex items-stretch gap-2">
              <input type="hidden" name="id" value={studentId} />
              <Input
                type="number"
                name="points"
                min={1}
                required
                autoFocus
                placeholder="عدد النقاط…"
                className="flex-1"
              />
              <Submit label="خصم" variant="danger" />
            </form>

            <p className="mt-3 mb-0 text-[length:var(--text-xs)] text-ink-faint">
              لن تقل النقاط عن صفر.
            </p>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
