import { describe, expect, it } from 'vitest';
import { quranProgressFor, type MemorizationLogInput } from '../quran-progress';
import { SURAHS, TOTAL_AYAHS } from '../quran-surahs';

const log = (o: Partial<MemorizationLogInput>): MemorizationLogInput => ({
  surah: null, surah_number: null, from_ayah: null, to_ayah: null,
  score: null, type: 'memorization', ...o,
});

describe('surah dataset', () => {
  it('has all 114 surahs totalling 6236 ayahs', () => {
    expect(SURAHS).toHaveLength(114);
    expect(TOTAL_AYAHS).toBe(6236);
  });
});

describe('quranProgressFor', () => {
  it('merges ADJACENT ranges, not just overlapping ones', () => {
    // 1-5 and 6-10 are adjacent -> one range of 10, not 5+5 counted separately.
    const r = quranProgressFor([
      log({ surah_number: 2, from_ayah: 1, to_ayah: 5 }),
      log({ surah_number: 2, from_ayah: 6, to_ayah: 10 }),
    ]);
    expect(r.memorized).toBe(10);
    expect(r.bySurah[0].memorized).toBe(10);
  });

  it('does not double-count re-logged overlapping ranges', () => {
    const r = quranProgressFor([
      log({ surah_number: 2, from_ayah: 1, to_ayah: 10 }),
      log({ surah_number: 2, from_ayah: 5, to_ayah: 8 }),
    ]);
    expect(r.memorized).toBe(10);
  });

  it('keeps disjoint ranges separate', () => {
    const r = quranProgressFor([
      log({ surah_number: 2, from_ayah: 1, to_ayah: 5 }),
      log({ surah_number: 2, from_ayah: 20, to_ayah: 24 }),
    ]);
    expect(r.memorized).toBe(10);
  });

  it('excludes a failed log (score below the pass threshold of 6)', () => {
    const r = quranProgressFor([log({ surah_number: 1, from_ayah: 1, to_ayah: 7, score: 5 })]);
    expect(r.memorized).toBe(0);
  });

  it('includes a log with a null score', () => {
    const r = quranProgressFor([log({ surah_number: 1, from_ayah: 1, to_ayah: 7, score: null })]);
    expect(r.memorized).toBe(7);
  });

  it('includes a log exactly at the pass threshold', () => {
    const r = quranProgressFor([log({ surah_number: 1, from_ayah: 1, to_ayah: 7, score: 6 })]);
    expect(r.memorized).toBe(7);
  });

  it('clamps a range that runs past the end of the surah', () => {
    // Al-Fatiha has 7 ayahs; 1-999 must count as 7, not 999.
    const r = quranProgressFor([log({ surah_number: 1, from_ayah: 1, to_ayah: 999 })]);
    expect(r.memorized).toBe(7);
  });

  it('falls back to resolving the surah by name when surah_number is null', () => {
    const r = quranProgressFor([log({ surah: 'الفاتحة', from_ayah: 1, to_ayah: 7 })]);
    expect(r.memorized).toBe(7);
    expect(r.bySurah[0].number).toBe(1);
  });

  it('ignores logs with an unknown surah or missing ayah bounds', () => {
    const r = quranProgressFor([
      log({ surah: 'ليست سورة', from_ayah: 1, to_ayah: 5 }),
      log({ surah_number: 1, from_ayah: null, to_ayah: 7 }),
      log({ surah_number: 1, from_ayah: 1, to_ayah: null }),
    ]);
    expect(r.memorized).toBe(0);
  });

  it('ignores big_review logs', () => {
    const r = quranProgressFor([
      log({ surah_number: 1, from_ayah: 1, to_ayah: 7, type: 'big_review' }),
    ]);
    expect(r.memorized).toBe(0);
  });

  it('preserves the PHP quirk: an out-of-range `from` is clamped, counting 1 ayah', () => {
    // Faithful to min($range['from'], $maxAyah) in QuranProgress.php.
    const r = quranProgressFor([log({ surah_number: 1, from_ayah: 99, to_ayah: 99 })]);
    expect(r.memorized).toBe(1);
  });

  it('reports 100% for the whole Quran and sorts bySurah by number', () => {
    const r = quranProgressFor(
      SURAHS.map((s) => log({ surah_number: s.number, from_ayah: 1, to_ayah: s.ayahs })),
    );
    expect(r.memorized).toBe(6236);
    expect(r.percent).toBe(100);
    expect(r.bySurah.map((s) => s.number)).toEqual(SURAHS.map((s) => s.number));
  });

  it('rounds percent to one decimal', () => {
    const r = quranProgressFor([log({ surah_number: 1, from_ayah: 1, to_ayah: 7 })]);
    expect(r.percent).toBe(0.1); // 7/6236 = 0.1122%
    expect(r.total).toBe(6236);
  });
});
