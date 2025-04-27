'use client';

import React from 'react';
import GestionImages from '../GestionImages'; // Importe depuis le dossier parent

export default function ImagesTab() {
  return (
    <div className="p-6 relative z-10">
      <h2 className="text-2xl font-audiowide text-white mb-6 pb-2 border-b border-purple-500/20">
        Gestion des images uploadées
      </h2>
      <GestionImages showBackLink={false} showHeader={false} />
    </div>
  );
}
