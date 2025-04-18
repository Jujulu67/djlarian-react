import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { defaultConfigs } from '@/app/api/admin/config/reset/route';

// Endpoint pour récupérer les configurations par défaut
export async function GET() {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Transformer les valeurs pour qu'elles soient au bon format (booléens, nombres, etc.)
    const processedConfig: Record<string, Record<string, any>> = {};

    // Traiter chaque section
    Object.keys(defaultConfigs).forEach((section) => {
      processedConfig[section] = {};

      // Pour chaque clé dans la section
      const sectionData = defaultConfigs[section as keyof typeof defaultConfigs];
      Object.keys(sectionData).forEach((key) => {
        const value = sectionData[key as keyof typeof sectionData];

        if (value === 'true' || value === 'false') {
          processedConfig[section][key] = value === 'true';
        } else if (!isNaN(Number(value)) && value !== '') {
          processedConfig[section][key] = Number(value);
        } else {
          processedConfig[section][key] = value;
        }
      });
    });

    return NextResponse.json(processedConfig, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations par défaut:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des configurations par défaut' },
      { status: 500 }
    );
  }
}
