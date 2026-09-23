// Port of app/Support/ArabicDate.php, plus the Saturday->Friday week used app-wide.
//
// Timezone: the Laravel app runs on UTC ('timezone' => 'UTC' in config/app.php), so
// Carbon::today() is the UTC date. We pin that explicitly rather than inheriting the
// host's zone by luck - change APP_TZ in one place if the mosque's local day should win.

export const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ ?? 'UTC';

/** أسماء أيام الأسبوع بالعربية، 0 = الأحد ... 6 = السبت (نفس ترقيم Carbon و schedule_items.day_of_week). */
export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

/** اسم يوم الأسبوع بالعربية حسب رقمه (0 = الأحد ... 6 = السبت). */
export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? '';
}

/** تنسيق تاريخ بشكل عربي، مثال: "السبت، 5 سبتمبر". */
export function arabicDateLabel(date: Date): string {
  const { year, month, day } = zonedParts(date);
  const dow = dayOfWeekIn(date);
  void year;
  return `${dayName(dow)}، ${day} ${MONTH_NAMES[month - 1]}`;
}

/** The calendar date in APP_TZ as 'YYYY-MM-DD' - this is the app's notion of "today". */
export function toDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function today(): string {
  return toDateString(new Date());
}

/** Day of week in APP_TZ, 0 = Sunday ... 6 = Saturday. */
export function dayOfWeekIn(date: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: APP_TZ, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

/**
 * الأسبوع من السبت إلى الجمعة، كما في startOfWeek(SATURDAY)/endOfWeek(FRIDAY).
 * Note: do NOT use date_trunc('week') in SQL for this - Postgres weeks are ISO,
 * i.e. Monday-based, which would silently shift every weekly statistic.
 */
export function weekRange(date: Date = new Date()): { start: string; end: string } {
  const dow = dayOfWeekIn(date); // 0=Sun..6=Sat
  const daysSinceSaturday = (dow + 1) % 7; // Sat->0, Sun->1, ... Fri->6

  const start = addDays(toDateString(date), -daysSinceSaturday);
  const end = addDays(start, 6);

  return { start, end };
}

/** Add days to a 'YYYY-MM-DD' string, returning the same format. Calendar-safe (UTC noon anchor). */
export function addDays(dateString: string, days: number): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

/** The 7 dates of the Saturday->Friday week containing `date`. */
export function weekDays(date: Date = new Date()): string[] {
  const { start } = weekRange(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Format a 'YYYY-MM-DD' string with the Arabic label, without timezone round-tripping. */
export function labelForDateString(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${dayName(dow)}، ${d} ${MONTH_NAMES[m - 1]}`;
}

function zonedParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = toDateString(date).split('-').map(Number);
  return { year, month, day };
}
