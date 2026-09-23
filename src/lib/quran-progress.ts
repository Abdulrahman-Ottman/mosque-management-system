// Port of app/Support/QuranProgress.php. Behaviour here is deliberately faithful to the
// Laravel original, including the quirks noted inline - see the plan's parity notes.

import { SURAH_BY_NUMBER, SURAH_NUMBER_BY_NAME, TOTAL_AYAHS } from './quran-surahs';

/** علامة أقل من هذا الحد تُعتبر رسوبًا (ProgressLog::PASS_THRESHOLD). */
export const PASS_THRESHOLD = 6;

export type MemorizationLogInput = {
  surah: string | null;
  surah_number: number | null;
  from_ayah: number | null;
  to_ayah: number | null;
  score: number | null;
  type: string;
};

export type SurahProgress = {
  number: number;
  name: string;
  ayahs: number;
  memorized: number;
};

export type QuranProgressResult = {
  memorized: number;
  total: number;
  percent: number;
  bySurah: SurahProgress[];
};

/**
 * علامة أقل من الحد الأدنى: يبقى السجل ظاهرًا لكن لا يُحتسب في نسبة الحفظ.
 * Mirrors ProgressLog::isFailed().
 */
export function isFailed(log: Pick<MemorizationLogInput, 'type' | 'score'>): boolean {
  return log.type === 'memorization' && log.score !== null && log.score < PASS_THRESHOLD;
}

/**
 * How many distinct ayahs a student has memorized, merging overlapping and re-logged
 * ranges per surah so re-teaching the same ayahs isn't double-counted.
 */
export function quranProgressFor(logs: readonly MemorizationLogInput[]): QuranProgressResult {
  const rangesBySurah = new Map<number, { from: number; to: number }[]>();

  for (const log of logs) {
    if (log.type !== 'memorization') continue;
    if (log.from_ayah === null || log.to_ayah === null) continue;
    if (isFailed(log)) continue;

    // surah_number was added in a later migration, so older rows carry only the name.
    const surahNumber = log.surah_number ?? (log.surah ? SURAH_NUMBER_BY_NAME.get(log.surah) : undefined);
    if (!surahNumber || !SURAH_BY_NUMBER.has(surahNumber)) continue;

    const list = rangesBySurah.get(surahNumber) ?? [];
    list.push({ from: Math.max(1, log.from_ayah), to: log.to_ayah });
    rangesBySurah.set(surahNumber, list);
  }

  let memorized = 0;
  const bySurah: SurahProgress[] = [];

  for (const [surahNumber, ranges] of rangesBySurah) {
    const surah = SURAH_BY_NUMBER.get(surahNumber)!;
    const maxAyah = surah.ayahs;

    const sorted = [...ranges].sort((a, b) => a.from - b.from);
    const merged: { from: number; to: number }[] = [];

    for (const range of sorted) {
      // NOTE: faithful to PHP - an out-of-range `from` is CLAMPED down to the last ayah
      // rather than discarded, so a bogus log silently counts as 1 memorized ayah.
      const from = Math.min(range.from, maxAyah);
      const to = Math.min(Math.max(range.to, range.from), maxAyah);

      const last = merged[merged.length - 1];
      // `from > last.to + 1` starts a new range, so ADJACENT ranges merge:
      // 1-5 and 6-10 become 1-10, not two ranges.
      if (!last || from > last.to + 1) {
        merged.push({ from, to });
      } else {
        last.to = Math.max(last.to, to);
      }
    }

    const covered = merged.reduce((sum, r) => sum + (r.to - r.from + 1), 0);

    memorized += covered;
    bySurah.push({ number: surah.number, name: surah.name, ayahs: maxAyah, memorized: covered });
  }

  bySurah.sort((a, b) => a.number - b.number);

  return {
    memorized,
    total: TOTAL_AYAHS,
    percent: TOTAL_AYAHS > 0 ? roundHalfAwayFromZero((memorized / TOTAL_AYAHS) * 100, 1) : 0,
    bySurah,
  };
}

/**
 * PHP's round() is half-away-from-zero; JS Math.round is half-up and toFixed is
 * float-broken. Match PHP so percentages agree with the Laravel app exactly.
 */
function roundHalfAwayFromZero(value: number, precision: number): number {
  const factor = 10 ** precision;
  const scaled = value * factor;
  // Nudge past binary-float representation error before rounding (e.g. 1.005 * 100).
  const corrected = Number(scaled.toPrecision(15));
  return (corrected < 0 ? -Math.round(-corrected) : Math.round(corrected)) / factor;
}
