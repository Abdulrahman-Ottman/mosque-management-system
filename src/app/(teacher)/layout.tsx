import { Navbar } from '@/components/Navbar';
import { requireRole } from '@/lib/roles';

/**
 * Teacher area.
 *
 * requireRole() here is the real gate - proxy.ts only redirects, and Next
 * middleware has been bypassable in the past. RLS backs this up in the database.
 */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('teacher');

  return (
    <>
      <Navbar user={user} />
      {children}
    </>
  );
}
