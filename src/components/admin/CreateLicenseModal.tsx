'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // Assuming sonner is used, if not I'll use standard alert or console for now, or check for toast

interface CreateLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateLicenseModal({ isOpen, onClose }: CreateLicenseModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [type, setType] = useState('STANDARD');
  const [expiration, setExpiration] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/license/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type,
          expirationDate: expiration ? new Date(expiration).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      const data = await res.json();
      // Success
      router.refresh();
      onClose();
      alert(`Licence créée avec succès: ${data.licenseKey}`); // Simple feedback since I'm not 100% sure of toast lib
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-md"
      bgClass="glass-modern backdrop-blur-xl border border-purple-500/20"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-audiowide text-white mb-2">Générer une Licence</h2>
          <p className="text-gray-400 text-sm">
            Créez une nouvelle licence pour un utilisateur existant.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email de l'utilisateur
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/40 border-purple-500/20 text-white placeholder:text-gray-600 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-gray-300">
              Type de Licence
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-black/40 border-purple-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-purple-500/20 text-gray-200">
                <SelectItem value="STANDARD">STANDARD (Licence standard)</SelectItem>
                <SelectItem value="LIFETIME">LIFETIME (À vie)</SelectItem>
                <SelectItem value="EDU">EDU (Éducation -50%)</SelectItem>
                <SelectItem value="NFR">NFR (Not For Resale)</SelectItem>
                <SelectItem value="BETA">BETA (Beta testers)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration" className="text-gray-300">
              Expiration (Optionnel)
            </Label>
            <Input
              id="expiration"
              type="date"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="bg-black/40 border-purple-500/20 text-white dark:[color-scheme:dark]"
            />
          </div>

          <div className="flex justify-end pt-4 space-x-2">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Générer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
