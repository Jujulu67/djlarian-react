'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Copy,
  Monitor,
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { FaApple, FaWindows } from 'react-icons/fa';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserLicenseCardProps {
  license: any;
  userEmail?: string | null;
}

export function UserLicenseCard({ license, userEmail }: UserLicenseCardProps) {
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(license.licenseKey);
    toast.success('Clé de licence copiée !');
  };

  const handleCopyEmail = () => {
    if (userEmail) {
      navigator.clipboard.writeText(userEmail);
      toast.success('Email copié !');
    }
  };

  const handleDeactivate = async (machineId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cette machine ?')) return;

    setIsDeactivating(machineId);
    try {
      const res = await fetch('/api/license/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: license.licenseKey,
          machine_id: machineId,
        }),
      });

      if (res.ok) {
        toast.success('Machine désactivée avec succès');
        // Refresh page to show updates
        window.location.reload();
      } else {
        toast.error('Erreur lors de la désactivation');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setIsDeactivating(null);
    }
  };

  return (
    <div className="glass-modern rounded-xl overflow-hidden border border-white/10 relative group">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 transition-all group-hover:bg-purple-500/15"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 transition-all group-hover:bg-blue-500/15"></div>

      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-12 h-12 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-xl font-bold text-white">L</span>
            </div>
            <div>
              <h3 className="text-xl font-audiowide text-white">LarianCrusher VST</h3>
              <p className="text-gray-400 text-sm">Licence {license.licenseType}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {license.revoked ? (
              <Badge variant="destructive" className="bg-red-500/20 text-red-200 border-red-500/50">
                Révoquée
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="bg-green-500/20 text-green-200 border-green-500/50 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" /> Active
              </Badge>
            )}
          </div>
        </div>

        {/* Email Associé */}
        {userEmail && (
          <div className="bg-black/40 rounded-lg p-4 border border-white/5 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                Email Associé
              </div>
              <div className="text-lg md:text-xl font-mono text-purple-200 tracking-wider break-all">
                {userEmail}
              </div>
            </div>
            <Button
              onClick={handleCopyEmail}
              variant="secondary"
              className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
          </div>
        )}

        {/* License Key */}
        <div className="bg-black/40 rounded-lg p-4 border border-white/5 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
              Clé de Licence
            </div>
            <code className="text-lg md:text-xl font-mono text-purple-200 tracking-wider break-all">
              {license.licenseKey}
            </code>
          </div>
          <Button
            onClick={handleCopyKey}
            variant="secondary"
            className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier
          </Button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Monitor className="w-4 h-4" />
              <span className="text-sm">Activations</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {license.activations.length}{' '}
              <span className="text-gray-500 text-lg font-normal">/ {license.maxActivations}</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Date d'achat</span>
            </div>
            <div className="text-white font-medium">
              {format(new Date(license.createdAt), 'dd MMMM yyyy', { locale: fr })}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="flex items-center gap-2 text-gray-400 mb-3">
              <Download className="w-4 h-4" />
              <span className="text-sm">Téléchargements</span>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 text-white h-9"
                onClick={() =>
                  window.open(`/api/license/download?id=${license.id}&os=mac`, '_blank')
                }
              >
                <FaApple className="w-4 h-4 mr-2 text-gray-300" />
                <span className="text-xs">Mac (Universal)</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 text-white h-9"
                onClick={() =>
                  window.open(`/api/license/download?id=${license.id}&os=windows`, '_blank')
                }
              >
                <FaWindows className="w-4 h-4 mr-2 text-blue-400" />
                <span className="text-xs">Windows (x64)</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Activations List */}
        <div>
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-purple-400" />
            Appareils Activés
          </h4>

          {license.activations.length === 0 ? (
            <div className="text-gray-500 italic text-sm border border-dashed border-gray-800 rounded-lg p-4 text-center">
              Aucun appareil activé pour le moment. Installez le plugin et entrez votre clé.
            </div>
          ) : (
            <div className="space-y-3">
              {license.activations.map((activation: any) => (
                <div
                  key={activation.id}
                  className="bg-black/20 rounded-lg p-3 flex items-center justify-between border border-white/5 hover:border-purple-500/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate flex items-center gap-2">
                      {activation.osInfo || 'Appareil inconnu'}
                      <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                        v{activation.pluginVersion}
                      </span>
                    </div>
                    <div
                      className="text-xs text-gray-500 font-mono mt-0.5 truncate"
                      title={activation.machineId}
                    >
                      ID: {activation.machineId.substring(0, 16)}...
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 hidden sm:block">
                      Dernière vue:{' '}
                      {formatDistanceToNow(new Date(activation.lastValidated), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                    <Button
                      onClick={() => handleDeactivate(activation.machineId)}
                      disabled={isDeactivating === activation.machineId}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-400 hover:bg-red-900/10 h-8 w-8 p-0"
                      title="Désactiver cet appareil"
                    >
                      {isDeactivating === activation.machineId ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
