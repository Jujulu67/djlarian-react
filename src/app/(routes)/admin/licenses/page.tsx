import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { LicenseTable } from '@/components/admin/LicenseTable';
import { Button } from '@/components/ui/Button';
import { Plus, Download } from 'lucide-react';
import { CreateLicenseButton } from '@/components/admin/CreateLicenseButton';
import Link from 'next/link';

export const revalidate = 0; // Données toujours fraîches

export default async function AdminLicensesPage() {
  const session = await auth();

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  let licenses: any[] = [];
  let error = null;

  try {
    // @ts-ignore - Prisma client might be generated but DB not migrated yet
    licenses = await prisma.license.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        activations: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (e) {
    console.error('Failed to fetch licenses:', e);
    error =
      'Impossible de charger les licences. La base de données est peut-être en cours de migration.';
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-black via-[#0c0117] to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-audiowide text-white mb-2">
              <span className="text-gradient">Gestion des Licences</span>
            </h1>
            <p className="text-gray-400">
              Gérez les accès au plugin LarianCrusher, suivez les activations et créez de nouvelles
              clés.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
            <CreateLicenseButton />
            <Link href="/admin">
              <Button variant="ghost" className="text-gray-400">
                Retour
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/40 border border-purple-500/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400 text-sm mb-1">Total Licences</div>
            <div className="text-2xl font-bold text-white">{licenses.length}</div>
          </div>
          <div className="bg-black/40 border border-purple-500/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400 text-sm mb-1">Activations</div>
            <div className="text-2xl font-bold text-blue-400">
              {licenses.reduce((acc: number, l: any) => acc + l.activations.length, 0)}
            </div>
          </div>
          <div className="bg-black/40 border border-purple-500/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400 text-sm mb-1">Actives</div>
            <div className="text-2xl font-bold text-green-400">
              {licenses.filter((l: any) => !l.revoked).length}
            </div>
          </div>
          <div className="bg-black/40 border border-purple-500/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400 text-sm mb-1">Révoquées</div>
            <div className="text-2xl font-bold text-red-400">
              {licenses.filter((l: any) => l.revoked).length}
            </div>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-8 text-center text-red-200">
            <h3 className="text-xl font-semibold mb-2">Erreur de chargement</h3>
            <p>{error}</p>
          </div>
        ) : (
          <LicenseTable licenses={licenses} />
        )}
      </div>
    </div>
  );
}
