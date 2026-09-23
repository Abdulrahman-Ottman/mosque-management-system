'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { transferStudents, type AccountFormState } from '@/actions/accounts';
import { BookIcon } from '@/components/icons';
import { Button, Card, EmptyState, ErrorBox, Field, cx } from '@/components/ui';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';

export type TransferStudent = { id: number; name: string; grade: string | null };
export type OtherTeacher = { id: string; name: string; phone: string };

function SubmitButton({ count, disabled }: { count: number; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending || disabled}>
      {pending ? 'جارٍ النقل…' : count > 0 ? `نقل ${count} طالب` : 'اختر طلابًا للنقل'}
    </Button>
  );
}

/**
 * Port of admin/teachers/show.blade.php's transfer form.
 *
 * The original blocked submission with an alert() when nothing was checked; here the
 * button is simply disabled, which is clearer and needs no interruption.
 */
export function TransferStudentsForm({
  fromTeacherId,
  students,
  otherTeachers,
}: {
  fromTeacherId: string;
  students: TransferStudent[];
  otherTeachers: OtherTeacher[];
}) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    transferStudents,
    undefined,
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [toTeacher, setToTeacher] = useState('');

  const allChecked = students.length > 0 && selected.size === students.length;

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(students.map((s) => s.id)));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (students.length === 0) {
    return <EmptyState icon={<BookIcon />}>لا يوجد طلاب لدى هذا الأستاذ.</EmptyState>;
  }

  if (otherTeachers.length === 0) {
    return <EmptyState>لا يوجد أستاذ آخر لنقل الطلاب إليه.</EmptyState>;
  }

  const teacherOptions: ComboboxOption[] = otherTeachers.map((t) => ({
    value: t.id,
    label: t.name,
    hint: t.phone,
  }));

  return (
    <form action={formAction}>
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <input type="hidden" name="from_teacher_id" value={fromTeacherId} />

      <label className="mb-3 flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-paper px-3 py-2.5">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          className="size-4 accent-[var(--color-accent)]"
        />
        <span className="text-[length:var(--text-sm)] font-bold text-ink">
          تحديد الكل ({students.length})
        </span>
      </label>

      <ul className="m-0 mb-4 flex max-h-80 list-none flex-col gap-2 overflow-y-auto p-0">
        {students.map((student) => {
          const checked = selected.has(student.id);
          return (
            <li key={student.id}>
              <label
                className={cx(
                  'flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 transition-colors',
                  checked ? 'border-accent bg-accent-soft' : 'border-border bg-surface',
                )}
              >
                <input
                  type="checkbox"
                  name="student_ids"
                  value={student.id}
                  checked={checked}
                  onChange={() => toggle(student.id)}
                  className="size-4 accent-[var(--color-accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[length:var(--text-sm)] font-bold text-ink">
                    {student.name}
                  </span>
                  {student.grade ? (
                    <span className="block text-[length:var(--text-xs)] text-ink-muted">
                      {student.grade}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <Card className="bg-paper">
        <Field label="نقل إلى الأستاذ" required>
          <Combobox
            name="to_teacher_id"
            options={teacherOptions}
            value={toTeacher}
            onChange={setToTeacher}
            placeholder="اختر الأستاذ"
            searchPlaceholder="ابحث بالاسم أو الهاتف…"
            required
          />
        </Field>

        <SubmitButton count={selected.size} disabled={selected.size === 0 || !toTeacher} />
      </Card>
    </form>
  );
}
