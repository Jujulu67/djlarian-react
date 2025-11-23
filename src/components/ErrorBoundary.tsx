'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Composant qui attrape les erreurs React et empêche qu'elles fassent planter l'application
 * Spécialement conçu pour gérer les erreurs d'hydratation et les erreurs liées aux ports de message
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    // Met à jour l'état pour que le prochain rendu affiche l'UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // On peut enregistrer l'erreur dans un service de reporting
    logger.error('ErrorBoundary a capturé une erreur:', error);

    // Ignorer certaines erreurs spécifiques
    if (
      error.message.includes('message port closed') ||
      error.message.includes("Cannot read properties of undefined (reading 'call')") ||
      // Ignorer les erreurs d'hydratation courantes
      error.message.includes('Hydration') ||
      error.message.includes('Text content did not match')
    ) {
      // Réinitialiser l'état pour permettre à l'application de continuer
      this.setState({ hasError: false });
      return;
    }

    // Envoyer l'erreur à Sentry si configuré
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback UI
      return (
        this.props.fallback || (
          <div className="p-4 bg-gray-900 text-white">
            <h2 className="text-xl mb-2">Une erreur s&apos;est produite</h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
            >
              Réessayer
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
