'use client';

import { ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

import { PROJECT_STATUSES, ProjectStatus, CellType } from './types';

interface EditableCellProps {
  value: string | number | null;
  field: string;
  type: CellType;
  onSave: (field: string, value: string | number | null) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export const EditableCell = ({
  value,
  field,
  type,
  onSave,
  placeholder = '-',
  className = '',
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value?.toString() ?? '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement && type !== 'date') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = async () => {
    if (isSaving) return;

    const trimmedValue = editValue.trim();
    const originalValue = value?.toString() ?? '';

    // Ne sauvegarder que si la valeur a changé
    if (trimmedValue === originalValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      let finalValue: string | number | null = trimmedValue || null;

      if (type === 'number' && trimmedValue) {
        const num = parseInt(trimmedValue, 10);
        finalValue = isNaN(num) ? null : num;
      }

      await onSave(field, finalValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      // Restaurer la valeur originale en cas d'erreur
      setEditValue(originalValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value?.toString() ?? '');
      setIsEditing(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditValue(e.target.value);
  };

  // Affichage en mode lecture
  if (!isEditing) {
    // Cas spécial pour les liens
    if (type === 'link' && value) {
      return (
        <div className={`flex items-center gap-1 ${className}`}>
          <button
            onClick={() => setIsEditing(true)}
            className="text-left text-purple-400 hover:text-purple-300 truncate max-w-[120px] transition-colors"
            title={value.toString()}
          >
            Lien
          </button>
          <a
            href={value.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Ouvrir le lien externe dans un nouvel onglet: ${value.toString()}`}
          >
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      );
    }

    // Cas spécial pour le statut
    if (type === 'select' && field === 'status') {
      const statusConfig = PROJECT_STATUSES.find((s) => s.value === value);
      return (
        <button
          onClick={() => setIsEditing(true)}
          className={`text-left px-2 py-1 rounded hover:bg-white/5 transition-all cursor-pointer ${className}`}
        >
          {statusConfig?.label || placeholder}
        </button>
      );
    }

    // Cas spécial pour les dates
    if (type === 'date' && value) {
      const date = new Date(value.toString());
      const formatted = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      return (
        <button
          onClick={() => setIsEditing(true)}
          className={`text-left px-2 py-1 rounded hover:bg-white/5 transition-all cursor-pointer ${className}`}
        >
          {formatted}
        </button>
      );
    }

    // Cas spécial pour les nombres
    if (type === 'number' && value !== null && value !== undefined) {
      const formatted = Number(value).toLocaleString('fr-FR');
      return (
        <button
          onClick={() => setIsEditing(true)}
          className={`text-left px-2 py-1 rounded hover:bg-white/5 transition-all cursor-pointer tabular-nums ${className}`}
        >
          {formatted}
        </button>
      );
    }

    // Affichage par défaut
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={`text-left px-2 py-1 rounded hover:bg-white/5 transition-all cursor-pointer ${
          !value ? 'text-gray-500' : ''
        } ${className}`}
      >
        {value?.toString() || placeholder}
      </button>
    );
  }

  // Mode édition - Select pour le statut
  if (type === 'select' && field === 'status') {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          // Auto-save on select change
          setTimeout(() => {
            onSave(field, e.target.value as ProjectStatus).then(() => setIsEditing(false));
          }, 0);
        }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-gray-800/80 border border-purple-500/50 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${className}`}
        disabled={isSaving}
      >
        {PROJECT_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
    );
  }

  // Mode édition - Input date
  if (type === 'date') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={editValue ? editValue.split('T')[0] : ''}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`bg-gray-800/80 border border-purple-500/50 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-[130px] ${className}`}
        disabled={isSaving}
      />
    );
  }

  // Mode édition - Input number
  if (type === 'number') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        value={editValue}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="0"
        min="0"
        className={`bg-gray-800/80 border border-purple-500/50 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-[80px] tabular-nums ${className}`}
        disabled={isSaving}
      />
    );
  }

  // Mode édition - Input texte par défaut
  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'link' ? 'url' : 'text'}
      value={editValue}
      onChange={handleChange}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`bg-gray-800/80 border border-purple-500/50 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[100px] ${className}`}
      disabled={isSaving}
    />
  );
};
