'use client';

import { Plus, X, Check } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';

import { PROJECT_STATUSES, ProjectStatus } from './types';
import { GlassSelect } from './GlassSelect';

// Format text in Title Case (first letter of each word in uppercase, rest in lowercase)
const formatTitleCase = (text: string): string => {
  if (!text || text.trim() === '') return text;
  return text
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

interface AddProjectRowProps {
  onAdd: (data: { name: string; status: ProjectStatus }) => Promise<void>;
  isAdding: boolean;
  setIsAdding: (value: boolean) => void;
  defaultStatus?: ProjectStatus | 'ALL';
}

export const AddProjectRow = ({
  onAdd,
  isAdding,
  setIsAdding,
  defaultStatus = 'ALL',
}: AddProjectRowProps) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(
    defaultStatus === 'ALL' || !defaultStatus ? 'EN_COURS' : defaultStatus
  );
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Synchronize status with external defaultStatus changes
  useEffect(() => {
    setStatus(defaultStatus === 'ALL' || !defaultStatus ? 'EN_COURS' : defaultStatus);
  }, [defaultStatus]);

  const handleSubmit = async () => {
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const formattedName = formatTitleCase(name.trim());
      await onAdd({ name: formattedName, status });
      setName('');
      setStatus(defaultStatus === 'ALL' || !defaultStatus ? 'EN_COURS' : defaultStatus);
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
    setStatus(defaultStatus === 'ALL' || !defaultStatus ? 'EN_COURS' : defaultStatus);
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center justify-start gap-2 px-4 py-3 border-2 border-dashed border-gray-700/50 hover:border-purple-500/50 hover:bg-purple-500/5 text-gray-400 hover:text-purple-400 transition-all rounded-lg group"
        aria-label="Ajouter un nouveau projet"
      >
        <Plus size={18} className="group-hover:scale-110 transition-transform" aria-hidden="true" />
        <span className="text-sm font-medium">Ajouter un projet</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
      <div className="flex flex-1 gap-3 w-full sm:w-auto items-center">
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

        <GlassSelect
          value={status}
          options={PROJECT_STATUSES.map((s) => ({
            value: s.value,
            label: s.label,
            color: s.color,
          }))}
          onChange={(newValue) => setStatus(newValue as ProjectStatus)}
          isCompact={false}
          disabled={isSaving}
          currentColor={PROJECT_STATUSES.find((s) => s.value === status)?.color || 'blue'}
        />
      </div>

      <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
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
