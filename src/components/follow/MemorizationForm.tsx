'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { saveMemorization, type ProgressFormState } from '@/actions/progress';
import { Button, ErrorBox, Field, Flash, Input, Textarea } from '@/components/ui';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import type { Surah } from '@/lib/quran-surahs';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" block disabled={pending} className="mt-3">
      {pending ? 'جارٍ الحفظ…' : 'حفظ الحفظ الجديد'}
    </Button>
  );
}

/**
 * Port of the memorization form and its three chained Tom Select instances.
 *
 * Picking a surah rebuilds the "from ayah" list as 1..N, and picking a start ayah
 * rebuilds "to ayah" starting from it - so an out-of-range combination cannot be
 * submitted in the first place. The Blade version also had to rehydrate all three
 * from old() after a failed validation round-trip; React state removes that entirely.
 */
export function MemorizationForm({
  studentId,
  surahs,
}: {
  studentId: number;
  surahs: readonly Surah[];
}) {
  const [state, formAction] = useActionState<ProgressFormState, FormData>(
    saveMemorization,
    undefined,
  );

  const [surahNumber, setSurahNumber] = useState('');
  const [fromAyah, setFromAyah] = useState('');
  const [toAyah, setToAyah] = useState('');

  const selectedSurah = surahs.find((s) => String(s.number) === surahNumber) ?? null;

  const surahOptions: ComboboxOption[] = useMemo(
    () =>
      surahs.map((s) => ({
        value: String(s.number),
        label: `${s.number}. ${s.name}`,
        hint: `${s.ayahs} آية`,
      })),
    [surahs],
  );

  const fromOptions: ComboboxOption[] = useMemo(() => {
    if (!selectedSurah) return [];
    return Array.from({ length: selectedSurah.ayahs }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    }));
  }, [selectedSurah]);

  const toOptions: ComboboxOption[] = useMemo(() => {
    if (!selectedSurah) return [];
    const start = Number(fromAyah) || 1;
    return Array.from({ length: selectedSurah.ayahs - start + 1 }, (_, i) => ({
      value: String(start + i),
      label: String(start + i),
    }));
  }, [selectedSurah, fromAyah]);

  const onSurahChange = (value: string) => {
    setSurahNumber(value);
    setFromAyah('');
    setToAyah('');
  };

  const onFromChange = (value: string) => {
    setFromAyah(value);
    // Keep "to" valid: if it now precedes "from", clear it.
    if (toAyah && Number(toAyah) < Number(value)) setToAyah('');
  };

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {state?.ok ? <Flash>{state.message}</Flash> : null}
      {state?.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <input type="hidden" name="student_id" value={studentId} />
      {/* The action validates that this name matches the number. */}
      <input type="hidden" name="surah" value={selectedSurah?.name ?? ''} />

      <Field label="السورة" error={errors.surah} required>
        <Combobox
          name="surah_number"
          options={surahOptions}
          value={surahNumber}
          onChange={onSurahChange}
          placeholder="اختر السورة"
          searchPlaceholder="ابحث عن السورة…"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="من آية" error={errors.from_ayah} required>
          <Combobox
            name="from_ayah"
            options={fromOptions}
            value={fromAyah}
            onChange={onFromChange}
            placeholder={selectedSurah ? 'اختر' : 'اختر السورة أولاً'}
            searchPlaceholder="رقم الآية…"
            disabled={!selectedSurah}
            required
          />
        </Field>

        <Field label="إلى آية" error={errors.to_ayah} required>
          <Combobox
            name="to_ayah"
            options={toOptions}
            value={toAyah}
            onChange={setToAyah}
            placeholder={selectedSurah ? 'اختر' : 'اختر السورة أولاً'}
            searchPlaceholder="رقم الآية…"
            disabled={!selectedSurah || !fromAyah}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="العلامة" error={errors.score}>
          <Input type="number" name="score" min={0} max={100} placeholder="9" />
        </Field>
        <Field label="علامة المراجعة" error={errors.review_score}>
          <Input type="number" name="review_score" min={0} max={100} placeholder="9" />
        </Field>
      </div>

      <Field label="الواجب المنزلي" error={errors.homework}>
        <Input name="homework" maxLength={255} placeholder="مثال: مراجعة الآيات 1-5 من سورة النبأ" />
      </Field>

      <Field label="المراجعة اليومية" error={errors.daily_review}>
        <Input name="daily_review" maxLength={255} placeholder="مثال: النبأ 4 - 10" />
      </Field>

      <Field label="واجب المراجعة" error={errors.review_homework}>
        <Input name="review_homework" maxLength={255} />
      </Field>

      <Field label="ملاحظات" error={errors.notes}>
        <Textarea name="notes" placeholder="أي ملاحظات مهمة…" />
      </Field>

      <SubmitButton />
    </form>
  );
}
