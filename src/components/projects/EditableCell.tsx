'use client';

import { ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

import { PROJECT_STATUSES, ProjectStatus, LABEL_OPTIONS, LabelStatus, CellType } from './types';

/**
 * Formate un texte en Title Case (première lettre de chaque mot en majuscule, reste en minuscule)
 * Exemples: "caca prout" -> "Caca Prout", "DONT GO" -> "Dont Go"
 */
function formatTitleCase(text: string): string {
  if (!text || text.trim() === '') return text;

  return text
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      // Première lettre en majuscule, reste en minuscule
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

interface EditableCellProps {
  value: string | number | null;
  field: string;
  type: CellType;
  onSave: (field: string, value: string | number | null) => Promise<void>;
  placeholder?: string;
  className?: string;
  allowWrap?: boolean;
  isCompact?: boolean;
  disabled?: boolean;
}

// Fonction pour normaliser les valeurs de label (anciennes vers nouvelles)
const normalizeLabelValue = (val: string | null | undefined): string | null => {
  if (!val) return null;
  const normalized = val.trim();

  // Mapping des anciennes valeurs (avec accents, espaces, etc.) vers les nouvelles
  const valueMap: Record<string, string> = {
    accepté: 'ACCEPTE',
    accepte: 'ACCEPTE',
    ACCEPTÉ: 'ACCEPTE',
    ACCEPTE: 'ACCEPTE',
    'en cours': 'EN_COURS',
    'En cours': 'EN_COURS',
    'EN COURS': 'EN_COURS',
    EN_COURS: 'EN_COURS',
    refusé: 'REFUSE',
    refuse: 'REFUSE',
    REFUSÉ: 'REFUSE',
    REFUSE: 'REFUSE',
  };

  // Chercher une correspondance (insensible à la casse)
  const lowerVal = normalized.toLowerCase();
  return (
    valueMap[lowerVal] || (LABEL_OPTIONS.find((l) => l.value === normalized) ? normalized : null)
  );
};

export const EditableCell = ({
  value,
  field,
  type,
  onSave,
  placeholder = '-',
  className = '',
  allowWrap = false,
  isCompact = false,
  disabled = false,
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value?.toString() ?? '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement && type !== 'date') {
        inputRef.current.select();
      } else if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
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
      } else if (type === 'progress' && trimmedValue) {
        const num = parseInt(trimmedValue, 10);
        if (isNaN(num)) {
          finalValue = null;
        } else {
          // Valider que le progress est entre 0 et 100
          finalValue = Math.max(0, Math.min(100, num));
        }
      } else if (type === 'select' && field === 'label' && trimmedValue) {
        // Normaliser les valeurs de label lors de la sauvegarde
        finalValue = normalizeLabelValue(trimmedValue);
      } else if (type === 'text' && trimmedValue) {
        // Appliquer le formatage Title Case pour les champs texte (sauf externalLink et label qui est un select)
        const fieldsToFormat = ['name', 'style', 'collab', 'labelFinal'];
        if (fieldsToFormat.includes(field)) {
          finalValue = formatTitleCase(trimmedValue);
        } else {
          finalValue = trimmedValue;
        }
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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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

    // Cas spécial pour le statut - afficher le badge cliquable qui ouvre directement le select
    if (type === 'select' && field === 'status') {
      const statusConfig = PROJECT_STATUSES.find((s) => s.value === value);
      if (!statusConfig) return null;

      const colorMap: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        red: 'bg-red-500/20 text-red-300 border-red-500/30',
        orange: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      };

      return (
        <select
          value={value?.toString() || ''}
          onChange={(e) => {
            // Auto-save on select change
            onSave(field, e.target.value as ProjectStatus);
          }}
          className={`inline-flex items-center font-medium rounded-full border ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:opacity-80 transition-opacity ${colorMap[statusConfig.color] || colorMap.blue} ${className}`}
          style={{
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${isCompact ? '10' : '12'}' height='${isCompact ? '10' : '12'}' viewBox='0 0 ${isCompact ? '10' : '12'} ${isCompact ? '10' : '12'}'%3E%3Cpath fill='%23a855f7' d='M${isCompact ? '5' : '6'} ${isCompact ? '7.5' : '9'}L1 ${isCompact ? '3.5' : '4'}h${isCompact ? '8' : '10'}z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `right ${isCompact ? '0.15rem' : '0.5rem'} center`,
            paddingRight: isCompact ? '1rem' : '1.75rem',
            maxWidth: '100%',
          }}
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

    // Cas spécial pour le label - afficher le badge cliquable qui ouvre directement le select
    if (type === 'select' && field === 'label') {
      const normalizedValue = normalizeLabelValue(value?.toString() || null);
      const labelConfig = normalizedValue
        ? LABEL_OPTIONS.find((l) => l.value === normalizedValue)
        : null;

      const colorMap: Record<string, string> = {
        blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        red: 'bg-red-500/20 text-red-300 border-red-500/30',
      };

      return (
        <select
          value={normalizedValue || ''}
          onChange={(e) => {
            // Auto-save on select change
            onSave(field, e.target.value || null);
          }}
          className={`inline-flex items-center font-medium rounded-full border ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:opacity-80 transition-opacity ${labelConfig ? colorMap[labelConfig.color] : 'bg-gray-500/20 text-gray-300 border-gray-500/30'} ${className}`}
          style={{
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${isCompact ? '10' : '12'}' height='${isCompact ? '10' : '12'}' viewBox='0 0 ${isCompact ? '10' : '12'} ${isCompact ? '10' : '12'}'%3E%3Cpath fill='%23a855f7' d='M${isCompact ? '5' : '6'} ${isCompact ? '7.5' : '9'}L1 ${isCompact ? '3.5' : '4'}h${isCompact ? '8' : '10'}z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `right ${isCompact ? '0.15rem' : '0.5rem'} center`,
            paddingRight: isCompact ? '1rem' : '1.75rem',
            maxWidth: '100%',
          }}
          disabled={isSaving}
        >
          <option value="">-</option>
          {LABEL_OPTIONS.map((label) => (
            <option key={label.value} value={label.value}>
              {label.label}
            </option>
          ))}
        </select>
      );
    }

    // Cas spécial pour les dates
    if (type === 'date' && value) {
      const date = new Date(value.toString());
      const formatted = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
      return (
        <button
          onClick={() => setIsEditing(true)}
          className={`text-left ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} rounded hover:bg-white/5 transition-all cursor-pointer ${className}`}
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
          className={`text-left ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} rounded hover:bg-white/5 transition-all cursor-pointer tabular-nums ${className}`}
        >
          {formatted}
        </button>
      );
    }

    // Cas spécial pour le progress (pourcentage)
    if (type === 'progress' && value !== null && value !== undefined) {
      const formatted = `${Number(value)}%`;
      return (
        <button
          onClick={() => !disabled && setIsEditing(true)}
          disabled={disabled}
          className={`text-left ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} rounded transition-all tabular-nums ${
            disabled
              ? 'text-gray-500 cursor-not-allowed'
              : 'hover:bg-white/5 cursor-pointer text-gray-300'
          } ${className}`}
        >
          {formatted}
        </button>
      );
    }

    // Affichage par défaut
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={`text-left w-full ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} rounded hover:bg-white/5 transition-all cursor-pointer ${
          allowWrap ? 'leading-tight whitespace-normal' : 'truncate'
        } ${!value ? 'text-gray-500' : 'text-gray-300'} ${className}`}
        style={allowWrap ? { overflowWrap: 'normal', lineHeight: '1.3' } : {}}
      >
        {value?.toString() || placeholder}
      </button>
    );
  }

  const inputClasses = `bg-gray-800/80 border border-purple-500/50 rounded ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full`;
  const inputDateClasses = `bg-gray-800/80 border border-purple-500/50 rounded ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50`;

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
        className={`${inputDateClasses} ${className}`}
        style={{ colorScheme: 'dark' }}
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
        className={`${inputClasses} tabular-nums ${className}`}
        disabled={isSaving}
      />
    );
  }

  // Mode édition - Input progress (pourcentage 0-100)
  if (type === 'progress') {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          value={editValue}
          onChange={handleChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="0"
          min="0"
          max="100"
          className={`${inputClasses} tabular-nums ${className}`}
          disabled={isSaving || disabled}
        />
        <span className="text-gray-400 text-sm">%</span>
      </div>
    );
  }

  // Mode édition - Input texte par défaut
  if (allowWrap && type === 'text') {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={editValue}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          } else if (e.key === 'Escape') {
            setEditValue(value?.toString() ?? '');
            setIsEditing(false);
          }
        }}
        placeholder={placeholder}
        className={`${inputClasses} resize-none ${className}`}
        disabled={isSaving}
        rows={2}
        style={{ minHeight: '32px', lineHeight: '1.2' }}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'link' ? 'url' : 'text'}
      value={editValue}
      onChange={handleChange}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`${inputClasses} ${className}`}
      disabled={isSaving}
    />
  );
};
