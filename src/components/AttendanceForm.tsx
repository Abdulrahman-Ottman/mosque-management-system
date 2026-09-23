'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { saveAttendance, type AttendanceFormState } from '@/actions/attendance';
import {
  STATUS_EXCUSED_ABSENCE,
  STATUS_LATE,
  STATUS_PRESENT,
  STATUS_UNEXCUSED_ABSENCE,
  type AttendanceStatus,
} from '@/lib/attendance';
import { Avatar, Button, Card, ErrorBox, Input, cx } from '@/components/ui';

export type AttendanceStudent = {
  id: number;
  name: string;
  grade: string | null;
  status: AttendanceStatus | null;
  absenceReason: string | null;
};

/*
 * The four options, with the visual weight the original page gave them.
 * `غياب بدون عذر` and `متأخر` are the two that cost points.
 */
const OPTIONS: Array<{ value: AttendanceStatus; label: string; active: string }> = [
  { value: STATUS_PRESENT, label: 'حاضر', active: 'bg-accent border-accent text-white' },
  { value: STATUS_LATE, label: 'متأخر', active: 'bg-warning border-warning text-white' },
  { value: STATUS_EXCUSED_ABSENCE, label: 'غياب بعذر', active: 'bg-ink-muted border-ink-muted text-white' },
  { value: STATUS_UNEXCUSED_ABSENCE, label: 'غياب بدون عذر', active: 'bg-danger border-danger text-white' },
];

function SaveBar({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-4 mt-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
      <Button type="submit" block disabled={pending || count === 0}>
        {pending ? 'جارٍ الحفظ…' : `حفظ الحضور (${count})`}
      </Button>
    </div>
  );
}

export function AttendanceForm({ students }: { students: AttendanceStudent[] }) {
  const [state, formAction] = useActionState<AttendanceFormState, FormData>(
    saveAttendance,
    undefined,
  );

  // The Blade page juggled DOM ids (p{id}, ae{id}, reason{id}) to do this; here it is
  // just keyed state.
  const [selected, setSelected] = useState<Record<number, AttendanceStatus | null>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.status])),
  );
  const [reasons, setReasons] = useState<Record<number, string>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.absenceReason ?? ''])),
  );

  const chosenCount = Object.values(selected).filter(Boolean).length;

  const setStatus = (id: number, status: AttendanceStatus) => {
    setSelected((prev) => ({ ...prev, [id]: status }));
    // Clear the reason when the status is no longer an excused absence, matching
    // onAttendanceChange() in the original.
    if (status !== STATUS_EXCUSED_ABSENCE) {
      setReasons((prev) => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <form action={formAction}>
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {students.map((student) => {
          const current = selected[student.id] ?? null;
          const isExcused = current === STATUS_EXCUSED_ABSENCE;

          return (
            <Card as="li" key={student.id}>
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={student.name} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[length:var(--text-base)] font-extrabold text-ink">
                    {student.name}
                  </p>
                  {student.grade ? (
                    <p className="m-0 text-[length:var(--text-xs)] text-ink-muted">
                      {student.grade}
                    </p>
                  ) : null}
                </div>
              </div>

              <fieldset className="m-0 border-0 p-0">
                <legend className="sr-only">حالة حضور {student.name}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {OPTIONS.map((option) => {
                    const checked = current === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cx(
                          'flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border px-2 py-2 text-center text-[length:var(--text-xs)] font-bold transition-colors',
                          checked
                            ? option.active
                            : 'border-border bg-paper text-ink-muted hover:border-accent hover:text-accent',
                        )}
                      >
                        <input
                          type="radio"
                          name={`attendance[${student.id}]`}
                          value={option.value}
                          checked={checked}
                          onChange={() => setStatus(student.id, option.value)}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {isExcused ? (
                <div className="mt-3">
                  <label
                    htmlFor={`reason-${student.id}`}
                    className="mb-1.5 block text-[length:var(--text-xs)] font-bold text-ink-muted"
                  >
                    سبب الغياب
                  </label>
                  <Input
                    id={`reason-${student.id}`}
                    name={`absence_reason[${student.id}]`}
                    value={reasons[student.id] ?? ''}
                    onChange={(e) =>
                      setReasons((prev) => ({ ...prev, [student.id]: e.target.value }))
                    }
                    maxLength={255}
                    placeholder="مثال: مريض"
                  />
                </div>
              ) : null}
            </Card>
          );
        })}
      </ul>

      <SaveBar count={chosenCount} />
    </form>
  );
}
