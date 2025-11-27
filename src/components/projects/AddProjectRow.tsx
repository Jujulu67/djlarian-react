'use client';

import { Plus, X, Check } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';

import { PROJECT_STATUSES, ProjectStatus } from './types';

interface AddProjectRowProps {
  onAdd: (data: { name: string; status: ProjectStatus }) => Promise<void>;
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
}

export const AddProjectRow = ({ onAdd, isAdding, setIsAdding }: AddProjectRowProps) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('EN_COURS');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSubmit = async () => {
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onAdd({ name: name.trim(), status });
      setName('');
      setStatus('EN_COURS');
      setIsAdding(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setName('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setStatus('EN_COURS');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 px-4 py-3 text-purple-400 hover:text-purple-300 hover:bg-white/5 transition-all rounded-lg group w-full"
        aria-label="Ajouter un nouveau projet"
      >
        <Plus size={18} className="group-hover:scale-110 transition-transform" aria-hidden="true" />
        <span className="text-sm font-medium">Ajouter un projet</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nom du projet..."
        className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
        disabled={isSaving}
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as ProjectStatus)}
        className="bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        disabled={isSaving}
      >
        {PROJECT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isSaving}
          className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          title="Ajouter (Entrée)"
          aria-label="Valider l'ajout du projet"
        >
          <Check size={18} className="text-white" aria-hidden="true" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          title="Annuler (Échap)"
          aria-label="Annuler l'ajout du projet"
        >
          <X size={18} className="text-gray-300" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
