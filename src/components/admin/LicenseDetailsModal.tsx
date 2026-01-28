'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldAlert, Trash2, Calendar, Monitor, Cpu, RotateCw, Loader2, Copy } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface LicenseActivation {
  id: string;
  osInfo?: string;
  pluginVersion?: string;
  machineId: string;
  lastValidated: Date;
  activatedAt: Date;
}

interface LicenseWithRelations {
  id: string;
  licenseKey: string;
  licenseType: string;
  user: {
    name: string | null;
    email: string | null;
  };
  revoked: boolean;
  expirationDate: Date | null;
  createdAt: Date;
  activations: LicenseActivation[];
  maxActivations: number;
  userId: string;
}

interface LicenseDetailsModalProps {
  license: LicenseWithRelations;
  isOpen: boolean;
  onClose: () => void;
}

export function LicenseDetailsModal({ license, isOpen, onClose }: LicenseDetailsModalProps) {
  const router = useRouter();
  const [isRevoking, setIsRevoking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRevokeLicense = async () => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette licence ? Cette action est immédiate.'))
      return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/license/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId: license.id }),
      });

      if (!res.ok) throw new Error(await res.text());

      router.refresh(); // Refresh server data
      onClose(); // Close modal since data is stale
      toast.success('Licence révoquée avec succès.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(`Erreur: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateLicense = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réactiver cette licence ?')) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/license/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId: license.id }),
      });

      if (!res.ok) throw new Error(await res.text());

      router.refresh(); // Refresh server data
      onClose(); // Close modal since data is stale
      toast.success('Licence réactivée avec succès.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(`Erreur: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateMachine = async (activationId: string) => {
    if (!confirm('Désactiver cette machine ?')) return;

    try {
      const res = await fetch('/api/license/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: license.licenseKey,
          machine_id: license.activations.find((a) => a.id === activationId)?.machineId,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      router.refresh();
      onClose();
      alert('Machine désactivée.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      alert(`Erreur: ${message}`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-4xl"
      bgClass="glass-modern backdrop-blur-xl border border-purple-500/20"
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-audiowide text-white mb-2">Détails de la licence</h2>
            <div
              className="flex items-center space-x-2 text-gray-400 font-mono bg-black/30 px-3 py-1 rounded cursor-pointer hover:text-white transition-colors group"
              onClick={() => copyToClipboard(license.licenseKey, 'Clé de licence')}
              title="Cliquer pour copier"
            >
              <span>{license.licenseKey}</span>
              <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div>
              {license.revoked ? (
                <Badge variant="destructive" className="bg-red-900/50 text-red-200 border-red-800">
                  RÉVOQUÉE
                </Badge>
              ) : license.expirationDate && new Date(license.expirationDate) < new Date() ? (
                <Badge
                  variant="secondary"
                  className="bg-yellow-900/50 text-yellow-200 border-yellow-800"
                >
                  EXPIRÉE
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="bg-green-900/50 text-green-200 border-green-800"
                >
                  ACTIVE
                </Badge>
              )}
            </div>
            <span className="text-sm text-gray-500">
              Type: <strong className="text-gray-300">{license.licenseType}</strong>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-900/10 p-4 rounded-lg border border-purple-500/10">
          <div>
            <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-2">
              Propriétaire
            </h3>
            <p className="text-white">{license.user.name || 'Sans nom'}</p>
            <p
              className="text-gray-400 text-sm cursor-pointer hover:text-white flex items-center gap-2 group"
              onClick={() => license.user.email && copyToClipboard(license.user.email, 'Email')}
            >
              {license.user.email}
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-gray-500 text-xs mt-1">ID: {license.userId}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-2">
              Validité
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Créée le:</span>
                <span className="text-gray-200">
                  {format(new Date(license.createdAt), 'dd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expire le:</span>
                <span className="text-gray-200">
                  {license.expirationDate
                    ? format(new Date(license.expirationDate), 'dd MMM yyyy', { locale: fr })
                    : 'Jamais (Perpétuelle)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Activations */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-audiowide text-white flex items-center">
              <Monitor className="mr-2 h-5 w-5 text-blue-400" />
              Activations ({license.activations.length}/{license.maxActivations})
            </h3>
          </div>

          <div className="rounded-md border border-purple-500/20 bg-black/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-purple-900/20">
                <TableRow className="border-purple-500/20">
                  <TableHead className="text-gray-300">Machine</TableHead>
                  <TableHead className="text-gray-300">OS / Version</TableHead>
                  <TableHead className="text-gray-300">Date Activation</TableHead>
                  <TableHead className="text-gray-300">Dernière Valid.</TableHead>
                  <TableHead className="text-right text-gray-300">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {license.activations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                      Aucune machine activée
                    </TableCell>
                  </TableRow>
                ) : (
                  license.activations.map((activation) => (
                    <TableRow
                      key={activation.id}
                      className="border-purple-500/10 hover:bg-purple-500/5"
                    >
                      <TableCell className="font-mono text-xs text-gray-400">
                        <div className="flex items-center">
                          <Cpu className="h-3 w-3 mr-2" />
                          <span title={activation.machineId}>
                            {activation.machineId.substring(0, 16)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-300">
                        <div>{activation.osInfo || 'Inconnu'}</div>
                        <div className="text-xs text-gray-500">
                          v{activation.pluginVersion || '?'}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {format(new Date(activation.activatedAt), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDistanceToNow(new Date(activation.lastValidated), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => handleDeactivateMachine(activation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Actions Zone */}
        <div
          className={`border rounded-lg p-4 mt-8 ${license.revoked ? 'border-green-900/30 bg-green-950/10' : 'border-red-900/30 bg-red-950/10'}`}
        >
          <h3
            className={`${license.revoked ? 'text-green-400' : 'text-red-400'} font-semibold flex items-center mb-4`}
          >
            {license.revoked ? (
              <RotateCw className="mr-2 h-5 w-5" />
            ) : (
              <ShieldAlert className="mr-2 h-5 w-5" />
            )}
            {license.revoked ? 'Réactivation' : 'Zone de Danger'}
          </h3>

          <div className="flex flex-col gap-4">
            <p className="text-gray-400 text-sm">
              {license.revoked
                ? "Cette licence est actuellement révoquée. Vous pouvez la réactiver pour permettre à l'utilisateur de s'en servir à nouveau."
                : 'Révoquer cette licence empêchera toute future validation. Cette action est immédiate.'}
            </p>

            {license.revoked ? (
              <Button
                className="bg-green-900/50 hover:bg-green-900 border border-green-800 text-green-100 w-full"
                onClick={handleReactivateLicense}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Réactivation...
                  </>
                ) : (
                  'Réactiver la Licence'
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="bg-red-900/50 hover:bg-red-900 border border-red-800 w-full"
                onClick={handleRevokeLicense}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Révocation...
                  </>
                ) : (
                  'Révoquer la Licence'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
