import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Panel Administrateur
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Carte Événements */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Événements</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Gérez les événements à venir et passés
            </p>
            <Link
              href="/admin/events"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors inline-block"
            >
              Gérer les événements
            </Link>
          </div>

          {/* Carte Galerie */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Galerie</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Gérez les photos et médias</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
              Gérer la galerie
            </button>
          </div>

          {/* Carte Musique */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Musique</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Gérez les morceaux et playlists</p>
            <Link
              href="/admin/music"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors inline-block"
            >
              Gérer la musique
            </Link>
          </div>

          {/* Carte Utilisateurs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Utilisateurs
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Gérez les comptes utilisateurs</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
              Gérer les utilisateurs
            </button>
          </div>

          {/* Carte Statistiques */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Statistiques
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Consultez les statistiques du site
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
              Voir les statistiques
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
