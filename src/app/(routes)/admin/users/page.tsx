import { Prisma } from '@prisma/client';
import { ChevronLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

import { UserFiltersServer } from './components/UserFiltersServer';
import { UserPagination } from './components/UserPagination';
import { UserTable } from './components/UserTable';

// Type pour les utilisateurs (mis à jour)
type UserData = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string | null; // Accepter null pour le rôle
  isVip?: boolean;
  createdAt?: Date | null;
  hashedPassword?: string | null; // Pour vérifier si l'utilisateur a un mot de passe
  Account: Array<{
    id: string;
    provider: string;
    providerAccountId: string;
    type: string; // Pour vérifier si c'est OAuth
  }>;
};

// Définir un type pour les paramètres
type PageProps = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    isVip?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Suivre l'approche recommandée par Next.js pour résoudre searchParams
  const resolvedParams = searchParams ? await searchParams : {};

  // Extraire les valeurs de manière sûre à partir des params résolus
  const page = resolvedParams.page || '1';
  const limit = resolvedParams.limit || '10';
  const search = resolvedParams.search || '';
  const role = resolvedParams.role || '';
  const isVip = resolvedParams.isVip || '';

  // Pagination
  const currentPage = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (currentPage - 1) * limitNum;

  // Construire la clause WHERE dynamiquement
  const whereClause: Prisma.UserWhereInput = {};
  const filters: Prisma.UserWhereInput[] = [];

  if (search) {
    // SQLite ne supporte pas 'mode: insensitive', utiliser toLowerCase() côté client
    // ou une recherche case-insensitive via Prisma selon le provider
    const searchLower = search.toLowerCase();
    filters.push({
      OR: [{ email: { contains: searchLower } }, { name: { contains: searchLower } }],
    });
  }

  if (role) {
    filters.push({ role });
  }

  if (isVip === 'true') {
    filters.push({ isVip: true } as Prisma.UserWhereInput);
  } else if (isVip === 'false') {
    filters.push({ isVip: false } as Prisma.UserWhereInput);
  }

  if (filters.length > 0) {
    whereClause.AND = filters;
  }

  const totalUsers = await prisma.user.count({ where: whereClause });
  const users = await prisma.user.findMany({
    where: whereClause,
    take: limitNum,
    skip: skip,
    orderBy: { email: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVip: true,
      createdAt: true,
      hashedPassword: true, // Inclure pour vérifier si l'utilisateur a un mot de passe
      Account: {
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          type: true, // Inclure le type pour vérifier si c'est OAuth
        },
      },
    },
  });

  const totalPages = Math.ceil(totalUsers / limitNum);

  const currentParams = new URLSearchParams();
  if (search) currentParams.set('search', search);
  if (role) currentParams.set('role', role);
  if (isVip) currentParams.set('isVip', isVip);

  return (
    <div className="min-h-screen text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center text-white hover:text-gray-300 mb-6"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Retour au tableau de bord
        </Link>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Gestion des Utilisateurs</h1>
          <Link
            href="/admin/users/add"
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors shadow-md"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Ajouter
          </Link>
        </div>

        <UserFiltersServer searchValue={search} roleValue={role} statusValue={isVip} />

        <UserTable users={users} />

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Aucun utilisateur trouvé pour ces critères.
          </div>
        )}

        <UserPagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseUrl="/admin/users"
          currentParams={currentParams}
        />
      </div>
    </div>
  );
}
