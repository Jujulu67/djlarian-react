import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { serializeProjects } from '@/lib/utils/serializeProject';

import { AdminProjectsClient } from './AdminProjectsClient';

export const metadata = {
  title: 'Admin - Projets | LARIAN',
  description: 'Vue administrateur de tous les projets',
};

export default async function AdminProjectsPage() {
  const session = await auth();

  // Vérifier que c'est un admin
  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Récupérer tous les projets
  const projects = await prisma.project.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Récupérer les utilisateurs qui ont des projets
  const usersWithProjects = await prisma.user.findMany({
    where: {
      Project: {
        some: {},
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Sérialiser les projets pour le client
  const serializedProjects = serializeProjects(projects);

  return (
    <div className="min-h-screen text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center text-white hover:text-gray-300 mb-6"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Retour au tableau de bord
        </Link>

        <AdminProjectsClient initialProjects={serializedProjects} users={usersWithProjects} />
      </div>
    </div>
  );
}
