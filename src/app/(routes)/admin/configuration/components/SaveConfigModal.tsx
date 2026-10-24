'use client';

import { RefreshCcw } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/textarea';
import { logger } from '@/lib/logger';

// Modal de sauvegarde de configuration
interface SaveConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  changesSummary: string;
}

export const SaveConfigModal = ({
  isOpen,
  onClose,
  onSave,
  changesSummary,
}: SaveConfigModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Générer un nom par défaut basé sur la date actuelle
      const date = new Date();
      setName(`Config ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez fournir un nom pour cette sauvegarde.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(name, description);
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.');
      logger.error(
        'Erreur lors de la sauvegarde:',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      maxWidth="max-w-2xl"
      showLoader={false}
      bgClass="glass bg-opacity-90"
      borderClass="border-purple-500/30"
      onClose={onClose}
    >
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-white mb-4">Sauvegarder la configuration</h2>
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-purple-300 mb-2">Résumé des modifications</h3>
          <div
            className="bg-black/60 p-4 rounded-md text-sm text-gray-300 max-h-[350px] overflow-y-auto font-mono border border-gray-800 whitespace-pre"
            dangerouslySetInnerHTML={{ __html: changesSummary }}
          />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="snapshotName" className="text-gray-200 font-medium">
                Nom de la sauvegarde
              </Label>
              <Input
                id="snapshotName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50 text-white mt-1"
                placeholder="ex: Mise à jour section stream"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="snapshotDescription" className="text-gray-200 font-medium">
                Description (optionnelle)
              </Label>
              <Textarea
                id="snapshotDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50 text-white mt-1"
                placeholder="Décrivez brièvement les modifications apportées..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};
