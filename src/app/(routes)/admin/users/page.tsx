import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { ChevronLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { UserTable } from './components/UserTable';
import { UserPagination } from './components/UserPagination';
import { UserFiltersServer } from './components/UserFiltersServer';

// Type pour les utilisateurs
type UserData = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  isVip?: boolean;
};

// Définir un type pour les paramètres
type PageProps = {
  searchParams?: {
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    isVip?: string;
  };
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Suivre l'approche recommandée par Next.js pour résoudre searchParams
  const resolvedParams = await Promise.resolve(searchParams || {});

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
    filters.push({
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (role) {
    filters.push({ role });
  }

  if (isVip === 'true') {
    filters.push({ isVip: true } as any);
  } else if (isVip === 'false') {
    filters.push({ isVip: false } as any);
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
    } as any,
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
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6"
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
