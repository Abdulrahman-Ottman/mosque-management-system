'use client';

import { useState } from 'react';

import { ChevronDownIcon } from '@/components/icons';
import { Button, ProgressBar } from '@/components/ui';
import type { SurahProgress } from '@/lib/quran-progress';

/** Port of toggleSurahBreakdown() in parent/student.blade.php. */
export function SurahBreakdown({ bySurah }: { bySurah: SurahProgress[] }) {
  const [open, setOpen] = useState(false);

  if (bySurah.length === 0) return null;

  return (
    <div className="mt-4">
      <Button variant="secondary" size="sm" block onClick={() => setOpen((o) => !o)}>
        {open ? 'إخفاء التفاصيل' : `عرض التفاصيل (${bySurah.length} سورة)`}
        <ChevronDownIcon
          className={`size-4 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </Button>

      {open ? (
        <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
          {bySurah.map((s) => (
            <li key={s.number}>
              <ProgressBar
                percent={(s.memorized / s.ayahs) * 100}
                label={`${s.number}. ${s.name}`}
                sublabel={`${s.memorized} / ${s.ayahs}`}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
