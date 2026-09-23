import { describe, expect, it } from 'vitest';
import { dayName, weekRange, weekDays, addDays, labelForDateString, DAY_NAMES } from '../arabic-date';

describe('dayName', () => {
  it('uses Carbon numbering: 0 = Sunday ... 6 = Saturday', () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(dayName(0)).toBe('الأحد');
    expect(dayName(6)).toBe('السبت');
    expect(dayName(99)).toBe('');
  });
});

describe('labelForDateString', () => {
  it('formats as "اليوم، يوم شهر"', () => {
    // 2026-09-05 was a Saturday.
    expect(labelForDateString('2026-09-05')).toBe('السبت، 5 سبتمبر');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries correctly', () => {
    expect(addDays('2026-09-05', 1)).toBe('2026-09-06');
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('weekRange (Saturday -> Friday)', () => {
  const on = (d: string) => weekRange(new Date(`${d}T12:00:00Z`));

  it('starts the week on Saturday', () => {
    // 2026-09-05 is a Saturday: it is its own week start.
    expect(on('2026-09-05')).toEqual({ start: '2026-09-05', end: '2026-09-11' });
  });

  it('puts Sunday in the week that began the previous day', () => {
    expect(on('2026-09-06')).toEqual({ start: '2026-09-05', end: '2026-09-11' });
  });

  it('puts Friday at the END of its week', () => {
    expect(on('2026-09-11')).toEqual({ start: '2026-09-05', end: '2026-09-11' });
  });

  it('rolls over to a new week on the next Saturday', () => {
    expect(on('2026-09-12')).toEqual({ start: '2026-09-12', end: '2026-09-18' });
  });

  it('spans exactly 7 days starting Saturday', () => {
    const days = weekDays(new Date('2026-09-09T12:00:00Z'));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-09-05');
    expect(days[6]).toBe('2026-09-11');
  });
});

describe('timezone-aware timestamp handling (Asia/Damascus, UTC+3)', () => {
  it('uses Asia/Damascus as the default app timezone', async () => {
    const { APP_TZ } = await import('../arabic-date');
    expect(APP_TZ).toBe('Asia/Damascus');
  });

  it('appDateOf returns the LOCAL date, not the UTC date', async () => {
    const { appDateOf } = await import('../arabic-date');

    // 22:30 in Al-Tal is 19:30 UTC - same calendar day either way.
    expect(appDateOf('2026-09-23T19:30:00+00:00')).toBe('2026-09-23');

    // 00:30 in Al-Tal is 21:30 UTC on the PREVIOUS day. This is the case that a
    // plain `iso.slice(0, 10)` gets wrong: it would answer 2026-09-23.
    expect(appDateOf('2026-09-23T21:30:00+00:00')).toBe('2026-09-24');

    // 02:59 local is still the previous UTC day.
    expect(appDateOf('2026-09-23T23:59:00+00:00')).toBe('2026-09-24');

    // 03:00 local is where the two agree again.
    expect(appDateOf('2026-09-24T00:00:00+00:00')).toBe('2026-09-24');
  });

  it('appDayStartUtc returns 21:00Z the previous day, not 00:00Z', async () => {
    const { appDayStartUtc, appDayEndUtc } = await import('../arabic-date');

    // Midnight in Al-Tal on 2026-09-23 is 21:00 UTC on 2026-09-22.
    expect(appDayStartUtc('2026-09-23')).toBe('2026-09-22T21:00:00.000Z');
    expect(appDayEndUtc('2026-09-23')).toBe('2026-09-23T21:00:00.000Z');
  });

  it('a day boundary round-trips: every instant in the range maps to that date', async () => {
    const { appDayStartUtc, appDayEndUtc, appDateOf } = await import('../arabic-date');

    const start = appDayStartUtc('2026-09-23');
    const end = appDayEndUtc('2026-09-23');

    expect(appDateOf(start)).toBe('2026-09-23');
    // One millisecond before the end is still the same local day...
    expect(appDateOf(new Date(Date.parse(end) - 1).toISOString())).toBe('2026-09-23');
    // ...and the end instant itself is already the next one.
    expect(appDateOf(end)).toBe('2026-09-24');
  });

  it('a late-night class is filed under the day it actually happened', async () => {
    const { appDateOf, appDayStartUtc, appDayEndUtc } = await import('../arabic-date');

    // A teacher logs memorization at 00:30 local, just after a late class.
    const loggedAt = '2026-09-23T21:30:00.000Z';
    expect(appDateOf(loggedAt)).toBe('2026-09-24');

    // It must fall inside the 24th's range, and outside the 23rd's.
    const within = (d: string) =>
      loggedAt >= appDayStartUtc(d) && loggedAt < appDayEndUtc(d);
    expect(within('2026-09-24')).toBe(true);
    expect(within('2026-09-23')).toBe(false);
  });
});
