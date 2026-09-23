'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

import { deleteScheduleItem, moveScheduleItem, updateScheduleItem } from '@/actions/schedule';
import { ArrowDownIcon, ArrowUpIcon } from '@/components/icons';
import { Button, Input, cx } from '@/components/ui';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';

export type ScheduleRow = { id: number; content: string; sort_order: number };

function IconSubmit({
  label,
  icon,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      disabled={disabled || pending}
      className={cx(
        'flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-border bg-surface p-1.5 text-ink-muted transition-colors',
        'hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-35',
      )}
    >
      {icon}
    </button>
  );
}

/** Port of the inline edit / reorder row in admin/schedule/show.blade.php. */
export function ScheduleItemRow({
  item,
  day,
  index,
  isFirst,
  isLast,
}: {
  item: ScheduleRow;
  day: number;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-accent text-[length:var(--text-xs)] font-extrabold text-white tabular-nums">
        {index + 1}
      </span>

      {editing ? (
        <form
          action={async (formData: FormData) => {
            await updateScheduleItem(formData);
            setEditing(false);
          }}
          className="flex flex-1 items-center gap-2"
        >
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="day" value={day} />
          <Input
            name="content"
            defaultValue={item.content}
            maxLength={500}
            required
            autoFocus
            className="flex-1"
          />
          <Button type="submit" size="sm">
            حفظ
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)}>
            إلغاء
          </Button>
        </form>
      ) : (
        <>
          <span className="flex-1 pt-0.5 text-[length:var(--text-sm)] font-semibold text-ink">
            {item.content}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            {/* Reordering is real form submits, as in the original - no drag and drop. */}
            <form action={moveScheduleItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="day" value={day} />
              <input type="hidden" name="direction" value="up" />
              <IconSubmit
                label="تحريك لأعلى"
                icon={<ArrowUpIcon className="size-4" />}
                disabled={isFirst}
              />
            </form>

            <form action={moveScheduleItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="day" value={day} />
              <input type="hidden" name="direction" value="down" />
              <IconSubmit
                label="تحريك لأسفل"
                icon={<ArrowDownIcon className="size-4" />}
                disabled={isLast}
              />
            </form>

            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
              تعديل
            </Button>

            <form action={deleteScheduleItem}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="day" value={day} />
              <ConfirmSubmit message="هل أنت متأكد من حذف هذا القسم؟">حذف</ConfirmSubmit>
            </form>
          </div>
        </>
      )}
    </li>
  );
}
