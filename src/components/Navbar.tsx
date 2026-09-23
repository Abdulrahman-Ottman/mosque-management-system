import Image from 'next/image';
import Link from 'next/link';

import { logout } from '@/actions/auth';
import { UserIcon } from '@/components/icons';
import { InstallNavButton } from '@/components/InstallNavButton';
import type { CurrentUser } from '@/lib/roles';
import { homePathForRole } from '@/lib/roles';

/**
 * Port of resources/views/partials/navbar.blade.php.
 *
 * The original ignored the `title` it was passed and hard-coded the institute name,
 * so that is what it renders here too.
 */
export function Navbar({ user }: { user: CurrentUser }) {
  return (
    <nav className="flex items-center justify-between gap-3 border-b-2 border-gold bg-accent-strong px-5 py-3 text-white">
      <Link
        href={homePathForRole(user.role)}
        className="flex min-w-0 items-center gap-2.5 text-[length:var(--text-lg)] font-extrabold text-gold no-underline"
      >
        <Image
          src="/images/logo-icon.png"
          alt=""
          width={38}
          height={38}
          className="block h-[38px] w-auto"
        />
        <span className="truncate">اقْرَأْ وَارْتَقِ</span>
      </Link>

      <div className="flex shrink-0 items-center gap-2 text-[length:var(--text-sm)] font-semibold text-white/90">
        <span className="hidden items-center gap-1.5 sm:flex">
          <UserIcon className="size-4 shrink-0 text-gold" />
          <span className="max-w-[12rem] truncate">{user.name}</span>
        </span>

        <InstallNavButton />

        <form action={logout}>
          <button
            type="submit"
            className="cursor-pointer rounded-[var(--radius-sm)] border border-white/20 bg-white/10 px-3 py-1.5 text-[length:var(--text-xs)] font-bold text-white transition-colors hover:bg-danger hover:border-danger"
          >
            خروج
          </button>
        </form>
      </div>
    </nav>
  );
}
