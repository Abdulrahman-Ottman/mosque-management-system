// Port of app/Support/ArabicDate.php, plus the Saturday->Friday week used app-wide.
//
// Timezone: the mosque is in Al-Tal, Syria, so the app's day boundary is Damascus
// local time (UTC+3 year-round - Syria abolished DST in 2022), not UTC as the Laravel
// app used. That distinction is not cosmetic: because Damascus is AHEAD of UTC, local
// times between 00:00 and 02:59 fall on the PREVIOUS UTC date. A log written at 00:30
// after a late class would otherwise be filed under yesterday.
//
// Everything stored in Postgres is `timestamptz`, i.e. a real instant in UTC. So any
// comparison between a stored timestamp and "today" has to convert first - use
// appDateOf() rather than slicing an ISO string, which silently gives the UTC date.

export const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ ?? 'Asia/Damascus';

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

/**
 * The local calendar date of a stored timestamp, as 'YYYY-MM-DD'.
 *
 * Use this instead of `iso.slice(0, 10)`, which yields the UTC date and is wrong for
 * anything logged between midnight and 03:00 local.
 */
export function appDateOf(isoTimestamp: string): string {
  return toDateString(new Date(isoTimestamp));
}

/** A stored timestamp as a local 'YYYY-MM-DD HH:mm' label. */
export function appDateTimeLabel(isoTimestamp: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(isoTimestamp));

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${String(Number(get('hour')) % 24).padStart(2, '0')}:${get('minute')}`;
}

/**
 * The UTC instant at which a local calendar day begins, for range queries.
 *
 * `gte('created_at', `${day}T00:00:00Z`)` is off by the UTC offset; this returns the
 * true boundary so a week query does not include or drop three hours at each end.
 */
export function appDayStartUtc(dateString: string): string {
  return localMidnightUtc(dateString);
}

/** The UTC instant immediately after a local calendar day ends. */
export function appDayEndUtc(dateString: string): string {
  return localMidnightUtc(addDays(dateString, 1));
}

/**
 * Find the UTC instant of 00:00 local on a given date.
 *
 * Done by probing: guess UTC midnight, measure how far the zone is from UTC at that
 * moment, then correct. Two passes settle it even across a DST change, which matters
 * if APP_TZ is ever pointed at a zone that still observes one.
 */
function localMidnightUtc(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  let utc = Date.UTC(y, m - 1, d, 0, 0, 0);

  for (let pass = 0; pass < 2; pass++) {
    const offsetMinutes = zoneOffsetMinutes(new Date(utc));
    const candidate = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMinutes * 60_000;
    if (candidate === utc) break;
    utc = candidate;
  }

  return new Date(utc).toISOString();
}

/** How many minutes APP_TZ is ahead of UTC at a given instant. */
function zoneOffsetMinutes(at: Date): number {
  // 'en-CA' + the sv-style parts give a stable, parseable local wall-clock reading.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // `hour` can come back as 24 for midnight in some runtimes.
  const hour = get('hour') % 24;

  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

function zonedParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = toDateString(date).split('-').map(Number);
  return { year, month, day };
}
