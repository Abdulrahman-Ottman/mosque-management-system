// Port of app/Models/AttendanceLog.php status constants + penaltyFor().
// These Arabic strings are stored verbatim in the database and must byte-match the
// CHECK constraint on attendance_logs.status. Do not normalise or trim them.

export const STATUS_PRESENT = 'حاضر';
export const STATUS_EXCUSED_ABSENCE = 'غياب بعذر';
export const STATUS_UNEXCUSED_ABSENCE = 'غياب بدون عذر';
export const STATUS_LATE = 'متأخر';

export const ATTENDANCE_STATUSES = [
  STATUS_PRESENT,
  STATUS_EXCUSED_ABSENCE,
  STATUS_UNEXCUSED_ABSENCE,
  STATUS_LATE,
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return typeof value === 'string' && (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

/** عدد النقاط التي تُخصم بسبب هذه الحالة. Kept in sync with the SQL penalty_for(). */
export function penaltyFor(status: string | null | undefined): number {
  switch (status) {
    case STATUS_UNEXCUSED_ABSENCE:
      return 10;
    case STATUS_LATE:
      return 5;
    default:
      return 0;
  }
}
