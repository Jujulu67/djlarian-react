'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  MoreHorizontal,
  Eye,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  Search,
  Filter,
  Box,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { LicenseDetailsModal } from './LicenseDetailsModal';

interface LicenseActivation {
  id: string;
  osInfo?: string | null;
  pluginVersion?: string | null;
  machineId: string;
  lastValidated: Date;
  activatedAt: Date;
}

interface LicenseWithRelations {
  id: string;
  licenseKey: string;
  licenseType: string;
  activations: LicenseActivation[];
  maxActivations: number;
  revoked: boolean;
  expirationDate: Date | null;
  createdAt: Date;
  userId: string;
  user: {
    email: string | null;
    name: string | null;
  };
}

interface LicenseTableProps {
  licenses: LicenseWithRelations[];
}

export function LicenseTable({ licenses }: LicenseTableProps) {
  const router = useRouter();
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithRelations | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterPlugin, setFilterPlugin] = useState('ALL');

  // Filter logic
  const filteredLicenses = licenses.filter((license) => {
    // Text search
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      license.licenseKey.toLowerCase().includes(query) ||
      (license.user.email && license.user.email.toLowerCase().includes(query)) ||
      (license.user.name && license.user.name.toLowerCase().includes(query));

    // Type filter
    const matchesType = filterType === 'ALL' || license.licenseType === filterType;

    // Plugin filter (Placeholder for now, assumes all are LarianCrusher)
    const matchesPlugin = filterPlugin === 'ALL' || filterPlugin === 'LARIAN_CRUSHER';

    return matchesSearch && matchesType && matchesPlugin;
  });

  const handleViewDetails = (license: LicenseWithRelations) => {
    setSelectedLicense(license);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (licenseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette licence ?')) return;

    setIsDeleting(licenseId);
    try {
      const res = await fetch('/api/license/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success('Licence supprimée');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(`Erreur: ${message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  const getStatusBadge = (license: LicenseWithRelations) => {
    if (license.revoked) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-900/50 text-red-200 hover:bg-red-900/70 border-red-800"
        >
          Révoquée
        </Badge>
      );
    }
    if (license.expirationDate && new Date(license.expirationDate) < new Date()) {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-900/50 text-yellow-200 hover:bg-yellow-900/70 border-yellow-800"
        >
          Expirée
        </Badge>
      );
    }
    return (
      <Badge
        variant="default"
        className="bg-green-900/50 text-green-200 hover:bg-green-900/70 border-green-800"
      >
        Active
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'EDU':
        return (
          <Badge variant="outline" className="border-teal-500 text-teal-400">
            EDU
          </Badge>
        );
      case 'NFR':
        return (
          <Badge variant="outline" className="border-emerald-500 text-emerald-400">
            NFR
          </Badge>
        );
      case 'BETA':
        return (
          <Badge variant="outline" className="border-purple-500 text-purple-400">
            BETA
          </Badge>
        );
      case 'LIFETIME':
        return (
          <Badge variant="outline" className="border-gold-500 text-yellow-400">
            LIFETIME
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-400">
            STANDARD
          </Badge>
        );
    }
  };

  const maskLicenseKey = (key: string) => {
    // LARIAN-XXXX-XXXX-XXXX -> LARIAN-****-****-XXXX
    const parts = key.split('-');
    if (parts.length !== 4) return key;
    return `${parts[0]}-****-****-${parts[3]}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-black/40 p-4 rounded-lg border border-purple-500/20 backdrop-blur-sm">
        <div className="relative w-full xl:flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher (email, clé, nom)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/60 border-purple-500/20 text-white placeholder:text-gray-600 focus:border-purple-500 w-full"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          {/* Plugin Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Box className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-400 whitespace-nowrap">Plugin :</span>
            <Select value={filterPlugin} onValueChange={setFilterPlugin}>
              <SelectTrigger className="w-full md:w-48 bg-black/60 border-purple-500/20 text-white">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-purple-500/20 text-gray-200">
                <SelectItem value="ALL">Tous les plugins</SelectItem>
                <SelectItem value="LARIAN_CRUSHER">LarianCrusher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-400 whitespace-nowrap">Type :</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-40 bg-black/60 border-purple-500/20 text-white">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-purple-500/20 text-gray-200">
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="STANDARD">STANDARD</SelectItem>
                <SelectItem value="LIFETIME">LIFETIME</SelectItem>
                <SelectItem value="EDU">EDU</SelectItem>
                <SelectItem value="NFR">NFR</SelectItem>
                <SelectItem value="BETA">BETA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-purple-500/20 bg-black/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-purple-900/20">
            <TableRow className="border-purple-500/20 hover:bg-purple-900/30">
              <TableHead className="text-gray-300">Licence Key</TableHead>
              <TableHead className="text-gray-300">Utilisateur</TableHead>
              <TableHead className="text-gray-300">Type</TableHead>
              <TableHead className="text-gray-300">Activations</TableHead>
              <TableHead className="text-gray-300">Statut</TableHead>
              <TableHead className="text-gray-300">Créée</TableHead>
              <TableHead className="text-right text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLicenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  {licenses.length === 0
                    ? 'Aucune licence trouvée.'
                    : 'Aucun résultat pour cette recherche.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLicenses.map((license) => (
                <TableRow key={license.id} className="border-purple-500/10 hover:bg-purple-500/5">
                  <TableCell className="font-mono text-gray-300">
                    <div
                      className="group flex items-center space-x-2 cursor-pointer hover:text-white transition-colors"
                      onClick={() => copyToClipboard(license.licenseKey, 'Clé de licence')}
                      title="Cliquez pour copier"
                    >
                      <span>{maskLicenseKey(license.licenseKey)}</span>
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div
                      className="flex flex-col group cursor-pointer"
                      onClick={() =>
                        license.user.email &&
                        copyToClipboard(license.user.email, 'Email utilisateur')
                      }
                    >
                      <div className="flex items-center space-x-1">
                        <span className="font-medium text-white group-hover:text-purple-300 transition-colors">
                          {license.user.email}
                        </span>
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                      </div>
                      <span className="text-xs text-gray-500">{license.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(license.licenseType)}</TableCell>
                  <TableCell className="text-gray-300">
                    <span
                      className={`${license.activations.length >= license.maxActivations ? 'text-yellow-500' : 'text-green-400'}`}
                    >
                      {license.activations.length}
                    </span>
                    <span className="text-gray-600"> / {license.maxActivations}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(license)}</TableCell>
                  <TableCell className="text-gray-400 text-sm">
                    {formatDistanceToNow(new Date(license.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        onClick={() => handleViewDetails(license)}
                        title="Détails"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-900/20"
                        onClick={() => handleDelete(license.id)}
                        disabled={isDeleting === license.id}
                        title="Supprimer"
                      >
                        {isDeleting === license.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLicense && (
        <LicenseDetailsModal
          license={selectedLicense}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </div>
  );
}
