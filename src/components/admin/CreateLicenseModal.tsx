'use client';

import { useState, useEffect } from 'react';
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
import { toast } from 'react-hot-toast';

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
  const [createIfMissing, setCreateIfMissing] = useState(false);

  // User search state
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null }[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<
    { id: string; email: string; name: string | null }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch users on mount
  useEffect(() => {
    if (isOpen) {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.data && Array.isArray(data.data)) {
            // Filter out users who don't have an email
            const validUsers = data.data.filter((u: any) => u.email) as any[];
            setUsers(validUsers);
          }
        })
        .catch((err) => console.error('Failed to fetch users:', err));
    }
  }, [isOpen]);

  // Filter users based on email input
  useEffect(() => {
    if (email) {
      const lower = email.toLowerCase();
      const matches = users
        .filter(
          (u) =>
            u.email.toLowerCase().includes(lower) ||
            (u.name && u.name.toLowerCase().includes(lower))
        )
        .slice(0, 5); // Limit to 5 suggestions
      setFilteredUsers(matches);
    } else {
      setFilteredUsers([]);
    }
  }, [email, users]);

  // Check if current email matches an existing user perfectly
  const isExistingUser = users.some((u) => u.email.toLowerCase() === email.toLowerCase());

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
          createIfMissing: createIfMissing && !isExistingUser,
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
      toast.success(`Licence créée avec succès: ${data.licenseKey}`);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
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
          <p className="text-gray-400 text-sm">Créez une nouvelle licence pour un utilisateur.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="email" className="text-gray-300">
              Utilisateur (Recherche par email)
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay hiding to allow click
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                required
                className="bg-black/40 border-purple-500/20 text-white placeholder:text-gray-600 focus:border-purple-500"
                autoComplete="off"
              />
              {showSuggestions && filteredUsers.length > 0 && (
                <div className="absolute z-[100] w-full mt-1 bg-gray-950 border border-purple-500/30 rounded-md shadow-2xl">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="px-4 py-2 hover:bg-purple-900/30 cursor-pointer text-sm border-b border-purple-500/10 last:border-0"
                      onClick={() => {
                        setEmail(user.email);
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="text-white font-medium">{user.email}</div>
                      {user.name && <div className="text-gray-400 text-xs">{user.name}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isExistingUser && email && email.includes('@') && (
              <div className="flex items-center space-x-2 mt-2 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded">
                <input
                  type="checkbox"
                  id="createIfMissing"
                  checked={createIfMissing}
                  onChange={(e) => setCreateIfMissing(e.target.checked)}
                  className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                />
                <label htmlFor="createIfMissing" className="text-xs text-yellow-200 cursor-pointer">
                  Créer cet utilisateur automatiquement s'il n'existe pas ?
                </label>
              </div>
            )}

            {isExistingUser && (
              <div className="text-xs text-green-400 mt-1 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                Utilisateur existant
              </div>
            )}
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
