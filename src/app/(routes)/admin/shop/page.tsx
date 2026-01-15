import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

import AdminShopClient from './AdminShopClient';

export const dynamic = 'force-dynamic';

export default async function AdminShopPage() {
  const session = await auth();

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch current settings from DB
  const settingsFromDb = await prisma.adminSettings.findMany({
    where: {
      key: {
        startsWith: 'shop_',
      },
    },
  });

  // Convert to object
  const initialSettings: Record<string, string> = {};
  settingsFromDb.forEach((s) => {
    initialSettings[s.key.replace('shop_', '')] = s.value;
  });

  return <AdminShopClient initialSettings={initialSettings} />;
}
