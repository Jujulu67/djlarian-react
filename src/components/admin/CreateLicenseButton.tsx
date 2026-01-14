'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { CreateLicenseModal } from './CreateLicenseModal';

export function CreateLicenseButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0"
      >
        <Plus className="mr-2 h-4 w-4" />
        Générer Licence
      </Button>
      <CreateLicenseModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
