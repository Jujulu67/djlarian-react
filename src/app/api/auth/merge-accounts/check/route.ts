import { NextRequest, NextResponse } from 'next/server';

import {
  getMergeToken,
  getAnyMergeToken,
  hasMergeToken,
  peekAnyMergeToken,
} from '@/lib/merge-token-cache';

/**
 * Route pour vérifier s'il y a un token de fusion en attente
 * Utilisée par la page d'erreur pour détecter si on doit rediriger vers la fusion
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer l'email depuis le cookie ou les query params
    let email = request.nextUrl.searchParams.get('email');

    if (!email) {
      // Essayer de récupérer depuis le cookie
      email = request.cookies.get('pending-merge-email')?.value || null;
    }

    console.log('[API] Check merge token - Email recherché:', email);

    let mergeToken: string | null = null;
    let tokenEmail: string | null = null;

    if (email) {
      // Vérifier d'abord si le token existe (sans le supprimer)
      if (await hasMergeToken(email)) {
        // Récupérer le token depuis la base de données avec l'email (supprime après récupération)
        mergeToken = await getMergeToken(email);
        tokenEmail = email;
        console.log('[API] Token trouvé pour email:', email);
      } else {
        console.log('[API] Aucun token trouvé pour email:', email);
      }
    } else {
      // Si on n'a pas l'email, vérifier d'abord s'il y a un token (sans le supprimer)
      console.log("[API] Pas d'email fourni, utilisation de peekAnyMergeToken()");
      const peekedToken = await peekAnyMergeToken();
      if (peekedToken) {
        console.log('[API] Token peek trouvé, récupération avec getAnyMergeToken()');
        // Récupérer le token (supprime après récupération)
        const tokenData = await getAnyMergeToken();
        if (tokenData) {
          mergeToken = tokenData.token;
          tokenEmail = tokenData.email;
          console.log('[API] Token trouvé (sans email) pour:', tokenData.email);
        } else {
          console.log(
            "[API] Erreur: peekAnyMergeToken a trouvé un token mais getAnyMergeToken ne l'a pas trouvé"
          );
        }
      } else {
        console.log('[API] Aucun token disponible dans la base de données');
      }
    }

    if (mergeToken && tokenEmail) {
      // Créer la réponse avec le token
      const response = NextResponse.json({
        hasToken: true,
        token: mergeToken,
        email: tokenEmail,
      });

      // Définir le cookie avec l'email pour les prochaines requêtes (au cas où)
      const isSecure = process.env.NODE_ENV === 'production';
      response.cookies.set('pending-merge-email', tokenEmail, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600, // 1 heure
      });

      console.log('[API] Token retourné avec succès, cookie défini pour:', tokenEmail);
      return response;
    }

    console.log('[API] Aucun token disponible');
    return NextResponse.json({
      hasToken: false,
    });
  } catch (error) {
    console.error('[API] Erreur check merge token:', error);
    return NextResponse.json({ hasToken: false }, { status: 500 });
  }
}
