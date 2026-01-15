import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { UserLicenseCard } from '@/components/licenses/UserLicenseCard';
import { KeyRound, ShoppingBag, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const revalidate = 0; // Données toujours fraîches

export default async function LicensesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/licenses');
  }

  let userLicenses: any[] = [];
  let error = null;

  try {
    // @ts-ignore - Prisma client might be generated but DB not migrated yet
    userLicenses = await prisma.license.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        activations: {
          orderBy: { activatedAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (e) {
    // Si la table n'existe pas encore (migration pending)
    console.error('Failed to fetch user licenses:', e);
    // On ne montre rien ou un message vide
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-4xl font-audiowide text-white mb-2 flex items-center justify-center md:justify-start gap-3">
                <KeyRound className="w-8 h-8 text-purple-400" />
                <span className="text-gradient">Mes Licences</span>
              </h1>
              <p className="text-gray-400">
                Gérez vos licences logicielles et vos appareils activés.
              </p>
            </div>

            <Link href="/products" className="hidden md:block">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-full px-6">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Boutique
              </Button>
            </Link>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {userLicenses.length > 0 ? (
              userLicenses.map((license: any) => (
                <UserLicenseCard
                  key={license.id}
                  license={license}
                  userEmail={session.user.email}
                />
              ))
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
                <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <KeyRound className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Aucune licence trouvée</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-8">
                  Vous n'avez pas encore acheté de licence pour nos plugins audio. Visitez la
                  boutique pour découvrir nos produits.
                </p>
                <Link href="/#plugins">
                  <Button
                    size="lg"
                    className="bg-white text-black hover:bg-gray-200 rounded-full px-8"
                  >
                    Voir les plugins
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
