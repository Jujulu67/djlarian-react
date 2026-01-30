'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Copy, Monitor, Calendar, Download, CheckCircle, Trash2, Sparkles } from 'lucide-react';
import { FaApple, FaWindows } from 'react-icons/fa';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export interface LicenseActivation {
  id: string;
  osInfo?: string | null;
  pluginVersion?: string | null;
  machineId: string;
  lastValidated: Date;
}

export interface UserLicense {
  id: string;
  licenseKey: string;
  licenseType: string;
  activations: LicenseActivation[];
  maxActivations: number;
  revoked: boolean;
  createdAt: Date;
}

interface UserLicenseCardProps {
  license: UserLicense;
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
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="glass-modern rounded-2xl overflow-hidden border border-white/10 relative group shadow-2xl"
    >
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] -z-10 transition-all duration-500 group-hover:bg-purple-600/20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] -z-10 transition-all duration-500 group-hover:bg-blue-600/20"></div>

      {/* Glossy overlay effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%]"></div>

      <div className="p-6 md:p-10 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30 transform group-hover:rotate-6 transition-transform duration-300">
              <span className="text-3xl font-audiowide text-white italic">L</span>
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-audiowide text-white tracking-tight">
                LarianCrusher <span className="text-purple-400">VST</span>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 text-sm font-medium">Type:</span>
                <Badge
                  variant="outline"
                  className="text-purple-400 border-purple-500/30 bg-purple-500/5 px-2 py-0"
                >
                  {license.licenseType.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {license.revoked ? (
              <Badge
                variant="destructive"
                className="bg-red-500 text-white font-bold px-4 py-1.5 rounded-full shadow-lg shadow-red-500/20"
              >
                RÉVOQUÉE
              </Badge>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <Badge
                  variant="default"
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-2 px-4 py-1.5 rounded-full font-bold"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20"></div>
                  ACTIVE
                </Badge>
              </motion.div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Email Card */}
          {userEmail && (
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 group/row hover:bg-white/10 transition-colors">
              <div className="text-xs text-gray-500 mb-2 uppercase tracking-[0.2em] font-bold">
                Email Associé
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-lg font-mono text-white tracking-tight truncate">
                  {userEmail}
                </div>
                <Button
                  onClick={handleCopyEmail}
                  variant="ghost"
                  size="sm"
                  className="shrink-0 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* License Key Card */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 group/row hover:bg-white/10 transition-colors">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-[0.2em] font-bold">
              Clé de Licence
            </div>
            <div className="flex items-center justify-between gap-4">
              <code className="text-lg font-mono text-purple-300 tracking-[0.1em] truncate">
                {license.licenseKey}
              </code>
              <Button
                onClick={handleCopyKey}
                variant="ghost"
                size="sm"
                className="shrink-0 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-black/40 rounded-2xl p-6 border border-white/5 hover:border-purple-500/30 transition-all group/stat">
            <div className="flex items-center gap-3 text-gray-400 mb-4">
              <Monitor className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-semibold uppercase tracking-wider">Activations</span>
            </div>
            <div className="text-3xl font-audiowide text-white">
              {license.activations.length}{' '}
              <span className="text-gray-600 text-xl font-normal">/ {license.maxActivations}</span>
            </div>
            <div className="mt-4 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(license.activations.length / license.maxActivations) * 100}%`,
                }}
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              />
            </div>
          </div>

          <div className="bg-black/40 rounded-2xl p-6 border border-white/5 hover:border-blue-500/30 transition-all group/stat">
            <div className="flex items-center gap-3 text-gray-400 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold uppercase tracking-wider">Date d'achat</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {format(new Date(license.createdAt), 'dd MMMM yyyy', { locale: fr })}
            </div>
            <div className="text-gray-500 text-sm uppercase">Fidélité garantie</div>
          </div>

          <div className="lg:col-span-1">
            <div className="flex flex-col gap-3 h-full">
              <Button
                variant="outline"
                className="flex-1 justify-start px-6 bg-transparent border-white/10 hover:bg-white/5 text-white rounded-xl font-bold text-base h-14"
                onClick={() =>
                  window.open(`/api/license/download?id=${license.id}&os=mac`, '_blank')
                }
              >
                <FaApple className="w-5 h-5 mr-3" />
                Installer Mac
              </Button>
              <Button
                variant="outline"
                className="flex-1 justify-start px-6 bg-transparent border-white/10 hover:bg-white/5 text-white rounded-xl font-bold text-base h-14"
                onClick={() =>
                  window.open(`/api/license/download?id=${license.id}&os=windows`, '_blank')
                }
              >
                <FaWindows className="w-5 h-5 mr-3 text-blue-400" />
                Installer Windows
              </Button>
            </div>
          </div>
        </div>

        {/* Activations List */}
        <div className="mt-8">
          <h4 className="text-white font-audiowide text-sm mb-6 flex items-center gap-3 uppercase tracking-widest">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-purple-500"></div>
            Appareils Autorisés
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-purple-500"></div>
          </h4>

          <AnimatePresence>
            {license.activations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-500 italic text-sm border border-dashed border-white/10 rounded-2xl p-8 text-center bg-white/[0.02]"
              >
                Aucun appareil actif. Utilisez votre clé dans le plugin pour commencer.
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {license.activations.map((activation, index) => (
                  <motion.div
                    key={activation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5 hover:border-purple-500/20 hover:bg-white/10 transition-all group/item overflow-hidden relative"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-white font-bold truncate flex items-center gap-3">
                        {activation.osInfo?.includes('Mac') ? (
                          <FaApple className="w-4 h-4 text-gray-400" />
                        ) : (
                          <FaWindows className="w-4 h-4 text-blue-400" />
                        )}
                        {activation.osInfo || 'Appareil Electronique'}
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-purple-300 font-mono">
                          v{activation.pluginVersion}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">
                        Vu{' '}
                        {formatDistanceToNow(new Date(activation.lastValidated), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleDeactivate(activation.machineId)}
                      disabled={isDeactivating === activation.machineId}
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl h-10 w-10 p-0 transition-colors"
                      title="Désactiver"
                    >
                      {isDeactivating === activation.machineId ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
