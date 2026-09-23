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
