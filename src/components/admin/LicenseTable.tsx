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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LicenseDetailsModal } from './LicenseDetailsModal';

// Types simplifiés pour l'affichage (éviter d'importer tout Prisma si possible)
interface LicenseWithRelations {
  id: string;
  licenseKey: string;
  licenseType: string;
  activations: any[];
  maxActivations: number;
  revoked: boolean;
  expirationDate: Date | null;
  createdAt: Date;
  user: {
    email: string | null;
    name: string | null;
  };
}

interface LicenseTableProps {
  licenses: LicenseWithRelations[];
}

export function LicenseTable({ licenses }: LicenseTableProps) {
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithRelations | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleViewDetails = (license: LicenseWithRelations) => {
    setSelectedLicense(license);
    setIsDetailsOpen(true);
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
    <>
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
            {licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  Aucune licence trouvée.
                </TableCell>
              </TableRow>
            ) : (
              licenses.map((license) => (
                <TableRow key={license.id} className="border-purple-500/10 hover:bg-purple-500/5">
                  <TableCell className="font-mono text-gray-300 select-all">
                    {maskLicenseKey(license.licenseKey)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{license.user.email}</span>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                        >
                          <span className="sr-only">Menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-black/90 border-purple-500/30 text-gray-200"
                      >
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleViewDetails(license)}
                          className="hover:bg-purple-500/20 cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Détails
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-red-900/20 cursor-pointer">
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Révoquer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    </>
  );
}
