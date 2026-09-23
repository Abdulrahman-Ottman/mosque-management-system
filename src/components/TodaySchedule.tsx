import { dayName, dayOfWeekIn } from '@/lib/arabic-date';
import { EmptyState, SectionCard } from '@/components/ui';

export type ScheduleItem = { id: number; content: string; sort_order: number };

/**
 * Port of resources/views/partials/today-schedule.blade.php - the read-only
 * "today's programme" card shown on the teacher and parent dashboards.
 */
export function TodaySchedule({ items }: { items: ScheduleItem[] }) {
  const today = dayName(dayOfWeekIn());

  return (
    <SectionCard title={`برنامج اليوم — ${today}`} count={items.length}>
      {items.length === 0 ? (
        <EmptyState>لا يوجد برنامج محدّد لهذا اليوم.</EmptyState>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-paper px-3 py-2.5"
            >
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-accent text-[length:var(--text-xs)] font-extrabold text-white tabular-nums">
                {index + 1}
              </span>
              <span className="pt-0.5 text-[length:var(--text-sm)] font-semibold text-ink">
                {item.content}
              </span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
