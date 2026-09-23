'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { createStudent, updateStudent, type FormState } from '@/actions/students';
import { Button, ErrorBox, Field, Input } from '@/components/ui';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';

export type ParentOption = { id: string; name: string; phone: string };

export type StudentInitial = {
  id: number;
  name: string;
  parent_id: string | null;
  grade: string | null;
  address: string | null;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending} className="mt-2">
      {pending ? 'جارٍ الحفظ…' : label}
    </Button>
  );
}

/** Shared by create-student and edite-student, which were near-identical Blade files. */
export function StudentForm({
  parents,
  initial,
}: {
  parents: ParentOption[];
  initial?: StudentInitial;
}) {
  const isEdit = Boolean(initial);
  const [state, formAction] = useActionState<FormState, FormData>(
    isEdit ? updateStudent : createStudent,
    undefined,
  );

  const [parentId, setParentId] = useState(initial?.parent_id ?? '');

  const parentOptions: ComboboxOption[] = parents.map((p) => ({
    value: p.id,
    label: p.name,
    hint: p.phone,
  }));

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}
      {isEdit ? <input type="hidden" name="id" value={initial!.id} /> : null}

      <Field label="اسم الطالب" htmlFor="name" error={errors.name} required>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ''}
          maxLength={255}
          required
          placeholder="الاسم الكامل"
        />
      </Field>

      <Field
        label="ولي الأمر"
        error={errors.parent_id}
        hint="ابحث بالاسم أو رقم الهاتف"
        required
      >
        <Combobox
          name="parent_id"
          options={parentOptions}
          value={parentId}
          onChange={setParentId}
          placeholder="اختر ولي الأمر"
          searchPlaceholder="ابحث عن ولي الأمر…"
          required
        />
      </Field>

      <Field label="الصف" htmlFor="grade" error={errors.grade}>
        <Input
          id="grade"
          name="grade"
          defaultValue={initial?.grade ?? ''}
          maxLength={255}
          placeholder="مثال: الصف السادس"
        />
      </Field>

      <Field label="العنوان" htmlFor="address" error={errors.address}>
        <Input
          id="address"
          name="address"
          defaultValue={initial?.address ?? ''}
          maxLength={255}
          placeholder="مثال: حي الزهراء"
        />
      </Field>

      <SubmitButton label={isEdit ? 'حفظ التعديلات' : 'إضافة الطالب'} />
    </form>
  );
}
