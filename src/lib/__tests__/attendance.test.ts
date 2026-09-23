import { describe, expect, it } from 'vitest';
import {
  penaltyFor, isAttendanceStatus,
  STATUS_PRESENT, STATUS_EXCUSED_ABSENCE, STATUS_UNEXCUSED_ABSENCE, STATUS_LATE,
} from '../attendance';

describe('penaltyFor', () => {
  it('matches the Laravel penalty table', () => {
    expect(penaltyFor(STATUS_PRESENT)).toBe(0);
    expect(penaltyFor(STATUS_EXCUSED_ABSENCE)).toBe(0);
    expect(penaltyFor(STATUS_UNEXCUSED_ABSENCE)).toBe(10);
    expect(penaltyFor(STATUS_LATE)).toBe(5);
    expect(penaltyFor(null)).toBe(0);
    expect(penaltyFor('غائب')).toBe(0); // legacy value, removed from the enum
  });
});

describe('status strings', () => {
  it('byte-matches the values stored by the Laravel app', () => {
    expect(STATUS_PRESENT).toBe('حاضر');
    expect(STATUS_EXCUSED_ABSENCE).toBe('غياب بعذر');
    expect(STATUS_UNEXCUSED_ABSENCE).toBe('غياب بدون عذر');
    expect(STATUS_LATE).toBe('متأخر');
  });

  it('rejects the removed legacy value', () => {
    expect(isAttendanceStatus('غائب')).toBe(false);
    expect(isAttendanceStatus(STATUS_PRESENT)).toBe(true);
  });
});

describe('points penalty diff (DashboardController::storeAttendance)', () => {
  // points = max(0, points + oldPenalty - newPenalty), applied only when they differ.
  const apply = (points: number, oldStatus: string | null, newStatus: string) => {
    const oldPenalty = penaltyFor(oldStatus);
    const newPenalty = penaltyFor(newStatus);
    if (oldPenalty === newPenalty) return points;
    return Math.max(0, points + oldPenalty - newPenalty);
  };

  it('charges an unexcused absence once', () => {
    expect(apply(50, null, STATUS_UNEXCUSED_ABSENCE)).toBe(40);
  });

  it('is idempotent when the same day is re-submitted unchanged', () => {
    const after = apply(50, null, STATUS_UNEXCUSED_ABSENCE);
    expect(apply(after, STATUS_UNEXCUSED_ABSENCE, STATUS_UNEXCUSED_ABSENCE)).toBe(40);
  });

  it('refunds when a correction changes absent to present', () => {
    expect(apply(40, STATUS_UNEXCUSED_ABSENCE, STATUS_PRESENT)).toBe(50);
  });

  it('preserves the lossy clamp quirk (documented, deliberate)', () => {
    // A student on 3 points marked unexcused-absent floors at 0, not -7...
    const floored = apply(3, null, STATUS_UNEXCUSED_ABSENCE);
    expect(floored).toBe(0);
    // ...and flipping back to present refunds the full 10, ending ABOVE where they started.
    expect(apply(floored, STATUS_UNEXCUSED_ABSENCE, STATUS_PRESENT)).toBe(10);
  });
});
