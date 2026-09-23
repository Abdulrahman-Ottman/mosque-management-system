import { Navbar } from '@/components/Navbar';
import { requireRole } from '@/lib/roles';

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('parent');

  return (
    <>
      <Navbar user={user} />
      {children}
    </>
  );
}
