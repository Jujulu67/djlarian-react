import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { User, Mail, ShieldCheck, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import UserActions from '@/components/admin/UserActions';

// Type pour les utilisateurs (simplifié pour l'instant)
type UserData = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
};

// Composant de pagination (similaire à activities)
function UserPagination({
  currentPage,
  totalPages,
  baseUrl,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}) {
  const getPageUrl = (page: number) => {
    const url = new URL(baseUrl, 'http://localhost'); // Base URL temporaire pour la construction de l'URL
    url.searchParams.set('page', page.toString());
    return url.pathname + url.search;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center mt-8 space-x-4">
      {currentPage <= 1 ? (
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-gray-500 cursor-not-allowed">
          <ChevronLeft className="h-5 w-5" />
        </span>
      ) : (
        <Link
          href={getPageUrl(currentPage - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-900/50 text-white hover:bg-purple-800 transition-all"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      <span className="text-sm text-gray-300 font-medium">
        Page {currentPage} sur {totalPages}
      </span>
      {currentPage >= totalPages ? (
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-gray-500 cursor-not-allowed">
          <ChevronRight className="h-5 w-5" />
        </span>
      ) : (
        <Link
          href={getPageUrl(currentPage + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-900/50 text-white hover:bg-purple-800 transition-all"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    limit?: string;
  };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Attendre la résolution de searchParams
  const resolvedSearchParams = await searchParams;

  // Utiliser les valeurs depuis l'objet résolu
  const currentPage = parseInt(resolvedSearchParams?.page || '1', 10);
  const limit = parseInt(resolvedSearchParams?.limit || '10', 10);
  const skip = (currentPage - 1) * limit;

  const totalUsers = await prisma.user.count();
  const users = await prisma.user.findMany({
    take: limit,
    skip: skip,
    orderBy: { email: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  const totalPages = Math.ceil(totalUsers / limit);

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

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Gestion des Utilisateurs</h1>
          <Link
            href="/admin/users/add"
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors shadow-md"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Ajouter un utilisateur
          </Link>
        </div>

        <div className="bg-gray-800/50 rounded-lg shadow-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      {user.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-2" />
                      {user.email || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShieldCheck className="h-5 w-5 text-gray-400 mr-2" />
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'ADMIN'
                            ? 'bg-green-800 text-green-100'
                            : 'bg-blue-800 text-blue-100'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <UserActions userId={user.id} userName={user.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400">Aucun utilisateur trouvé.</div>
        )}

        <UserPagination currentPage={currentPage} totalPages={totalPages} baseUrl="/admin/users" />
      </div>
    </div>
  );
}
