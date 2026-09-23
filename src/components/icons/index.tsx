/**
 * Inline SVG icon set.
 *
 * These replace the emoji the first pass used. Emoji are rendered by the operating
 * system's own font, so they differ on every device, can flash or appear as empty
 * boxes while that font resolves, and never match the interface colour. Inline SVG
 * ships with the markup: nothing to download, nothing to fall back to, and every icon
 * inherits `currentColor` so it is always exactly the right colour.
 *
 * House style: 24x24 box, no fills, 1.9px rounded strokes — matched to Cairo's weight
 * so icons sit level with the text beside them.
 */
import type { SVGProps } from 'react';

type IconProps = { className?: string } & Omit<SVGProps<SVGSVGElement>, 'className'>;

function Icon({ children, className, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

/* --------------------------------- people --------------------------------- */

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20c.9-3.4 3.8-5.4 7.2-5.4s6.3 2 7.2 5.4" />
  </Icon>
);

export const UserPlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9.5" cy="8" r="3.6" />
    <path d="M2.8 20c.8-3.4 3.4-5.4 6.7-5.4 1 0 2 .2 2.8.5" />
    <path d="M17.5 14.2v6M20.5 17.2h-6" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8.2" r="3.2" />
    <path d="M3 19.5c.8-3 3.1-4.8 6-4.8s5.2 1.8 6 4.8" />
    <path d="M16.2 5.4a3.2 3.2 0 0 1 0 5.7" />
    <path d="M17.6 14.9c2 .5 3.5 2.1 4.1 4.6" />
  </Icon>
);

export const TeacherIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3.6" width="18" height="12" rx="1.8" />
    <path d="M12 15.6v4.8" />
    <path d="M8.4 20.4h7.2" />
    <path d="M7.6 11.4l2.6-3 2.4 2.2 3.8-4" />
  </Icon>
);

/* ------------------------------- study / logs ------------------------------ */

export const BookOpenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 6.6C10.6 5.3 8.7 4.6 6.4 4.6H3.4v13.2h3c2.3 0 4.2.7 5.6 2 1.4-1.3 3.3-2 5.6-2h3V4.6h-3c-2.3 0-4.2.7-5.6 2Z" />
    <path d="M12 6.6v13.2" />
  </Icon>
);

export const BookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.4A1.6 1.6 0 0 1 6.6 2.8H19v14.6H6.6A1.6 1.6 0 0 0 5 19v-14.6Z" />
    <path d="M5 19a1.6 1.6 0 0 0 1.6 1.6H19v-3.2" />
  </Icon>
);

export const RotateIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.4 12a8.4 8.4 0 1 1-2.5-6" />
    <path d="M20.4 3.6V9h-5.4" />
  </Icon>
);

export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8L12 3.6Z" />
  </Icon>
);

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.6 20.4h16.8" />
    <path d="M6.8 20.4v-6.6M12 20.4V6.2M17.2 20.4v-9.4" />
  </Icon>
);

export const TargetIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1.2" />
  </Icon>
);

/* --------------------------------- time ----------------------------------- */

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.4" y="5" width="17.2" height="15.4" rx="2" />
    <path d="M3.4 9.8h17.2" />
    <path d="M8.2 3.4v3.2M15.8 3.4v3.2" />
  </Icon>
);

export const CalendarCheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.4" y="5" width="17.2" height="15.4" rx="2" />
    <path d="M3.4 9.8h17.2" />
    <path d="M8.2 3.4v3.2M15.8 3.4v3.2" />
    <path d="m9 14.8 2.1 2.1 4-4" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.2V12l3 1.8" />
  </Icon>
);

export const ClipboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.4" y="4.6" width="13.2" height="15.8" rx="2" />
    <path d="M9.2 4.6V3.4a.8.8 0 0 1 .8-.8h4a.8.8 0 0 1 .8.8v1.2" />
    <path d="M9 11.4h6M9 15h4" />
  </Icon>
);

export const FileTextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.4 2.8H7a1.8 1.8 0 0 0-1.8 1.8v14.8A1.8 1.8 0 0 0 7 21.2h10a1.8 1.8 0 0 0 1.8-1.8V8.2Z" />
    <path d="M13.4 2.8v5.4h5.4" />
    <path d="M8.8 13h6.4M8.8 16.6h4.4" />
  </Icon>
);

/* -------------------------------- status ---------------------------------- */

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="m8.4 12.2 2.4 2.4 4.8-4.8" />
  </Icon>
);

export const XCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="m9.4 9.4 5.2 5.2M14.6 9.4l-5.2 5.2" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.8 4.4 4.4L19 7.6" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" />
  </Icon>
);

/* ------------------------------ navigation -------------------------------- */

/** In RTL this reads as "back". */
export const ArrowBackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.6 12h14.8" />
    <path d="m11 4.6-6.4 7.4 6.4 7.4" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6.4 9.4 5.6 5.6 5.6-5.6" />
  </Icon>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6.4 14.6 5.6-5.6 5.6 5.6" />
  </Icon>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19.4V5" />
    <path d="m5.8 11.2 6.2-6.2 6.2 6.2" />
  </Icon>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4.6V19" />
    <path d="m5.8 12.8 6.2 6.2 6.2-6.2" />
  </Icon>
);

export { InstallIcon } from './InstallIcon';
