'use client';

import { ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

import { PROJECT_STATUSES, ProjectStatus, LABEL_OPTIONS, CellType } from './types';
import { GlassSelect } from './GlassSelect';
import { logger } from '@/lib/logger';

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

type CellValue = string | number | null;

interface EditableCellProps {
  value: CellValue;
  field: string;
  type: CellType;
  onSave: (field: string, value: CellValue) => Promise<void>;
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
    valueMap[lowerVal] || (LABEL_OPTIONS.some((l) => l.value === normalized) ? normalized : null)
  );
};

const TITLE_CASE_FIELDS = new Set(['name', 'style', 'collab', 'labelFinal']);

function parseIntOrNull(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Valeur à enregistrer selon le type de cellule ; une saisie vide vaut null. */
function convertCellValue(
  type: EditableCellProps['type'],
  field: string,
  value: string
): string | number | null {
  if (!value) return null;
  if (type === 'number') return parseIntOrNull(value);
  if (type === 'progress') {
    const progress = parseIntOrNull(value);
    return progress === null ? null : Math.max(0, Math.min(100, progress));
  }
  if (type === 'select' && field === 'label') return normalizeLabelValue(value);
  if (type === 'text' && TITLE_CASE_FIELDS.has(field)) return formatTitleCase(value);
  return value;
}

type EditableCellDisplayProps = Pick<
  EditableCellProps,
  | 'value'
  | 'field'
  | 'type'
  | 'placeholder'
  | 'onSave'
  | 'disabled'
  | 'isCompact'
  | 'className'
  | 'allowWrap'
> & {
  isSaving: boolean;
  onStartEditing: () => void;
};

/** Mode lecture : la présentation dépend du type de la cellule. */
function renderLinkCell(props: EditableCellDisplayProps, value: string | number) {
  const { className, onStartEditing } = props;
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => onStartEditing()}
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

function renderStatusCell(props: EditableCellDisplayProps) {
  const { value, field, onSave, isCompact, className, isSaving } = props;
  const statusConfig = PROJECT_STATUSES.find((s) => s.value === value);
  if (!statusConfig) return null;

  return (
    <GlassSelect
      value={value?.toString() || ''}
      options={PROJECT_STATUSES.map((status) => ({
        value: status.value,
        label: status.label,
        color: status.color,
      }))}
      onChange={(newValue) => {
        void onSave(field, newValue as ProjectStatus);
      }}
      isCompact={isCompact}
      className={className}
      disabled={isSaving}
      currentColor={statusConfig.color}
    />
  );
}

function renderLabelCell(props: EditableCellDisplayProps) {
  const { value, field, onSave, isCompact, className, isSaving } = props;
  const normalizedValue = normalizeLabelValue(value?.toString() || null);
  const labelConfig = normalizedValue
    ? LABEL_OPTIONS.find((l) => l.value === normalizedValue)
    : null;

  const labelOptions = [
    { value: '', label: '-', color: undefined },
    ...LABEL_OPTIONS.map((label) => ({
      value: label.value,
      label: label.label,
      color: label.color,
    })),
  ];

  return (
    <GlassSelect
      value={normalizedValue || ''}
      options={labelOptions}
      onChange={(newValue) => {
        void onSave(field, newValue || null);
      }}
      placeholder="-"
      isCompact={isCompact}
      className={className}
      disabled={isSaving}
      currentColor={labelConfig?.color || 'blue'}
    />
  );
}

function renderDateCell(props: EditableCellDisplayProps, value: string | number) {
  const { isCompact, className, onStartEditing } = props;
  const date = new Date(value.toString());
  const formatted = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  return (
    <button
      onClick={() => onStartEditing()}
      className={`text-left ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} rounded hover:bg-white/5 transition-all cursor-pointer ${className}`}
    >
      {formatted}
    </button>
  );
}

function renderNumberCell(props: EditableCellDisplayProps, value: string | number) {
  const { isCompact, className, onStartEditing } = props;
  const formatted = Number(value).toLocaleString('fr-FR');
  return (
    <button
      onClick={() => onStartEditing()}
      className={`text-left ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} rounded hover:bg-white/5 transition-all cursor-pointer tabular-nums ${className}`}
    >
      {formatted}
    </button>
  );
}

function renderProgressCell(props: EditableCellDisplayProps, value: string | number) {
  const { disabled, isCompact, className, onStartEditing } = props;
  const formatted = `${Number(value)}%`;
  return (
    <button
      onClick={() => !disabled && onStartEditing()}
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

function renderDefaultCell(props: EditableCellDisplayProps) {
  const { value, placeholder, isCompact, className, allowWrap, onStartEditing } = props;
  return (
    <button
      onClick={() => onStartEditing()}
      className={`text-left w-full ${isCompact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-sm'} rounded hover:bg-white/5 transition-all cursor-pointer ${
        allowWrap ? 'leading-tight whitespace-normal' : 'truncate'
      } ${!value ? 'text-gray-500' : 'text-gray-300'} ${className}`}
      style={allowWrap ? { overflowWrap: 'normal', lineHeight: '1.3' } : {}}
    >
      {value?.toString() || placeholder}
    </button>
  );
}

function EditableCellDisplay(props: EditableCellDisplayProps) {
  const { value, field, type } = props;
  if (type === 'link' && value) return renderLinkCell(props, value);
  if (type === 'select' && field === 'status') return renderStatusCell(props);
  if (type === 'select' && field === 'label') return renderLabelCell(props);
  if (type === 'date' && value) return renderDateCell(props, value);
  if (type === 'number' && value !== null && value !== undefined) {
    return renderNumberCell(props, value);
  }
  if (type === 'progress' && value !== null && value !== undefined) {
    return renderProgressCell(props, value);
  }
  return renderDefaultCell(props);
}

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
      const finalValue = convertCellValue(type, field, trimmedValue);
      await onSave(field, finalValue);
      setIsEditing(false);
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde:', error);
      // Restaurer la valeur originale en cas d'erreur
      setEditValue(originalValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
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
    return (
      <EditableCellDisplay
        value={value}
        field={field}
        type={type}
        placeholder={placeholder}
        onSave={onSave}
        disabled={disabled}
        isCompact={isCompact}
        className={className}
        allowWrap={allowWrap}
        isSaving={isSaving}
        onStartEditing={() => setIsEditing(true)}
      />
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
            void handleSave();
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
