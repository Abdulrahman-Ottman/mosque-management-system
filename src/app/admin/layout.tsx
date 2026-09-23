import { AdminTabs } from '@/components/AdminTabs';
import { Navbar } from '@/components/Navbar';
import { requireRole } from '@/lib/roles';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin');

  return (
    <>
      <Navbar user={user} />
      <AdminTabs />
      {children}
    </>
  );
}
