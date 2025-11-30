import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { serializeProjects } from '@/lib/utils/serializeProject';

import { StatisticsClient } from './StatisticsClient';

export const metadata = {
  title: 'Statistiques Projets | LARIAN',
  description: 'Statistiques détaillées de vos projets musicaux',
};

export default async function StatisticsPage() {
  const session = await auth();

  // Rediriger si non connecté
  if (!session?.user?.id) {
    redirect('/');
  }

  // Récupérer les projets de l'utilisateur
  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  // Sérialiser les projets pour le client
  const serializedProjects = serializeProjects(projects);

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        <StatisticsClient initialProjects={serializedProjects} />
      </div>
    </div>
  );
}
