import { useState } from 'react';
import { BookmarkIcon, XCircle, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';

interface CreateSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSnapshot: (name: string, description: string) => Promise<void>;
}

export default function CreateSnapshotModal({
  isOpen,
  onClose,
  onCreateSnapshot,
}: CreateSnapshotModalProps) {
  const [name, setName] = useState(`Sauvegarde du ${new Date().toLocaleDateString()}`);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Le nom de la sauvegarde est requis');
      return;
    }

    setLoading(true);
    try {
      await onCreateSnapshot(name, description);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du snapshot:', error);
      setError('Une erreur est survenue lors de la création de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-[#12121a] to-[#0c0117] rounded-xl border border-purple-500/20 w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-purple-500/20 flex justify-between items-center">
          <h3 className="text-xl font-audiowide text-white flex items-center">
            <BookmarkIcon className="mr-2 h-5 w-5 text-purple-400" />
            Créer une sauvegarde
          </h3>
          <Button variant="outline" size="sm" className="border-purple-500/20" onClick={onClose}>
            <XCircle className="h-4 w-4 mr-1" />
            Fermer
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="snapshot-name" className="block text-sm font-medium text-gray-200">
                Nom de la sauvegarde
              </label>
              <Input
                id="snapshot-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                placeholder="Ex: Configuration avant mise à jour"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="snapshot-description"
                className="block text-sm font-medium text-gray-200"
              >
                Description (optionnelle)
              </label>
              <Textarea
                id="snapshot-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-purple-500/10 border-purple-500/20 focus:border-purple-500/50"
                placeholder="Décrivez pourquoi vous créez cette sauvegarde..."
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-sm text-red-400 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="pt-4 flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                className="border-gray-500/20"
                onClick={onClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sauvegarde en cours...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="mr-2 h-4 w-4" />
                    Créer la sauvegarde
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
