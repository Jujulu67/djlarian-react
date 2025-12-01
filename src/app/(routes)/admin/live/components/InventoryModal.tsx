'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { InventoryContent } from './InventoryContent';

interface InventoryModalProps {
  userId: string;
  userName?: string;
  trigger?: React.ReactNode;
}

export function InventoryModal({ userId, userName, trigger }: InventoryModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer inline-block">
        {trigger || <Button variant="outline">Inventory</Button>}
      </div>

      {isOpen && (
        <Modal onClose={() => setIsOpen(false)} maxWidth="max-w-5xl">
          <InventoryContent userId={userId} userName={userName} />
        </Modal>
      )}
    </>
  );
}
