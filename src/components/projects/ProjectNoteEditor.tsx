'use client';

import { Eye, Edit, Hash, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import type React from 'react';

interface ProjectNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  projectName?: string;
}

// Fonction helper pour parser le markdown inline (gras, italique, liens)
const parseMarkdownInline = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Pattern pour les liens [texte](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  const linkMatches: Array<{ start: number; end: number; text: string; url: string }> = [];

  while ((linkMatch = linkPattern.exec(text)) !== null) {
    linkMatches.push({
      start: linkMatch.index,
      end: linkMatch.index + linkMatch[0].length,
      text: linkMatch[1],
      url: linkMatch[2],
    });
  }

  // Pattern pour le gras **texte**
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let boldMatch;
  const boldMatches: Array<{ start: number; end: number; text: string }> = [];

  while ((boldMatch = boldPattern.exec(text)) !== null) {
    boldMatches.push({
      start: boldMatch.index,
      end: boldMatch.index + boldMatch[0].length,
      text: boldMatch[1],
    });
  }

  // Pattern pour l'italique *texte*
  const italicPattern = /(?<!\*)\*([^*]+)\*(?!\*)/g;
  let italicMatch;
  const italicMatches: Array<{ start: number; end: number; text: string }> = [];

  while ((italicMatch = italicPattern.exec(text)) !== null) {
    italicMatches.push({
      start: italicMatch.index,
      end: italicMatch.index + italicMatch[0].length,
      text: italicMatch[1],
    });
  }

  // Combiner tous les matches et les trier
  const allMatches = [
    ...linkMatches.map((m) => ({ ...m, type: 'link' as const })),
    ...boldMatches.map((m) => ({ ...m, type: 'bold' as const })),
    ...italicMatches.map((m) => ({ ...m, type: 'italic' as const })),
  ].sort((a, b) => a.start - b.start);

  let lastIndex = 0;

  allMatches.forEach((match) => {
    // Ajouter le texte avant le match
    if (match.start > lastIndex) {
      parts.push(text.substring(lastIndex, match.start));
    }

    // Ajouter le contenu formaté
    if (match.type === 'link') {
      parts.push(
        <a
          key={key++}
          href={match.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline"
        >
          {match.text}
        </a>
      );
    } else if (match.type === 'bold') {
      parts.push(
        <strong key={key++} className="text-white font-semibold">
          {match.text}
        </strong>
      );
    } else if (match.type === 'italic') {
      parts.push(
        <em key={key++} className="text-gray-300">
          {match.text}
        </em>
      );
    }

    lastIndex = match.end;
  });

  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
};

export const ProjectNoteEditor = ({
  value,
  onChange,
  onSave,
  onCancel,
  projectName,
}: ProjectNoteEditorProps) => {
  // Par défaut, on ouvre en mode "aperçu" si la note existe déjà, sinon en mode "éditer"
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(
    value && value.trim() ? 'preview' : 'edit'
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = before + (selectedText || placeholder) + after;
    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      const newStart = start + before.length;
      const newEnd = newStart + (selectedText || placeholder).length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newValue = value.substring(0, start) + text + value.substring(start);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleBold = () => {
    insertText('**', '**', 'texte en gras');
  };

  const handleItalic = () => {
    insertText('*', '*', 'texte en italique');
  };

  const handleHeading = () => {
    insertAtCursor('### Titre\n\n');
  };

  const handleList = () => {
    insertAtCursor('- Item de liste\n');
  };

  const handleLink = () => {
    insertAtCursor('[Texte du lien](https://exemple.com)\n');
  };

  const handleTemplate = (template: string) => {
    const separator = value && !value.endsWith('\n\n') ? '\n\n' : '';
    onChange(value + separator + template);
  };

  const handleVersionTemplate = () => {
    const today = new Date().toLocaleDateString('fr-FR');
    handleTemplate(`## Version ${today}\n\n### Changements\n- \n- \n- \n\n### Notes\n`);
  };

  const handlePhaseTemplate = () => {
    const today = new Date().toLocaleDateString('fr-FR');
    handleTemplate(
      `## Phase: [Nom de la phase]\n**Date:** ${today}\n\n### Objectifs\n- \n- \n\n### Progression\n- [ ] \n- [ ] \n\n### Notes\n`
    );
  };

  const handleEvolutionTemplate = () => {
    const today = new Date().toLocaleDateString('fr-FR');
    handleTemplate(`## ${today}\n\n### Évolution\n\n### Prochaines étapes\n- \n- \n`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      onCancel();
      return;
    }
    // Ctrl/Cmd + Enter pour sauvegarder
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSave();
      return;
    }
    // Ctrl+B pour gras
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      handleBold();
      return;
    }
    // Ctrl+I pour italique
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      handleItalic();
      return;
    }
  };

  const renderPreview = () => {
    if (!value) {
      return <p className="text-gray-500 italic">Aucun contenu à prévisualiser</p>;
    }

    const lines = value.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let currentTaskList: React.ReactNode[] = [];
    let inList = false;
    let inTaskList = false;

    lines.forEach((line, index) => {
      // Titres
      if (line.startsWith('### ')) {
        if (inList || inTaskList) {
          if (inList) {
            elements.push(
              <ul key={`list-${index}`} className="list-disc ml-6 my-2">
                {currentList}
              </ul>
            );
            currentList = [];
            inList = false;
          }
          if (inTaskList) {
            elements.push(
              <ul key={`tasklist-${index}`} className="ml-6 my-2 space-y-1">
                {currentTaskList}
              </ul>
            );
            currentTaskList = [];
            inTaskList = false;
          }
        }
        elements.push(
          <h3 key={index} className="text-white font-semibold text-base mt-4 mb-2">
            {parseMarkdownInline(line.replace('### ', ''))}
          </h3>
        );
        return;
      }
      if (line.startsWith('## ')) {
        if (inList || inTaskList) {
          if (inList) {
            elements.push(
              <ul key={`list-${index}`} className="list-disc ml-6 my-2">
                {currentList}
              </ul>
            );
            currentList = [];
            inList = false;
          }
          if (inTaskList) {
            elements.push(
              <ul key={`tasklist-${index}`} className="ml-6 my-2 space-y-1">
                {currentTaskList}
              </ul>
            );
            currentTaskList = [];
            inTaskList = false;
          }
        }
        elements.push(
          <h2 key={index} className="text-white font-bold text-lg mt-6 mb-3">
            {parseMarkdownInline(line.replace('## ', ''))}
          </h2>
        );
        return;
      }
      if (line.startsWith('# ')) {
        if (inList || inTaskList) {
          if (inList) {
            elements.push(
              <ul key={`list-${index}`} className="list-disc ml-6 my-2">
                {currentList}
              </ul>
            );
            currentList = [];
            inList = false;
          }
          if (inTaskList) {
            elements.push(
              <ul key={`tasklist-${index}`} className="ml-6 my-2 space-y-1">
                {currentTaskList}
              </ul>
            );
            currentTaskList = [];
            inTaskList = false;
          }
        }
        elements.push(
          <h1 key={index} className="text-white font-bold text-xl mt-8 mb-4">
            {parseMarkdownInline(line.replace('# ', ''))}
          </h1>
        );
        return;
      }

      // Listes de tâches
      if (line.match(/^- \[([ x])\] /i)) {
        if (inList) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc ml-6 my-2">
              {currentList}
            </ul>
          );
          currentList = [];
          inList = false;
        }
        const match = line.match(/^- \[([ x])\] (.+)/i);
        if (match) {
          const checked = match[1].toLowerCase() === 'x';
          const content = match[2];
          currentTaskList.push(
            <li key={index} className="flex items-start">
              <input type="checkbox" checked={checked} disabled className="mr-2 mt-1" />
              <span className={checked ? 'line-through text-gray-400' : ''}>
                {parseMarkdownInline(content)}
              </span>
            </li>
          );
          inTaskList = true;
        }
        return;
      }

      // Listes à puces
      if (line.startsWith('- ')) {
        if (inTaskList) {
          elements.push(
            <ul key={`tasklist-${index}`} className="ml-6 my-2 space-y-1">
              {currentTaskList}
            </ul>
          );
          currentTaskList = [];
          inTaskList = false;
        }
        const content = line.replace('- ', '');
        currentList.push(<li key={index}>{parseMarkdownInline(content)}</li>);
        inList = true;
        return;
      }

      // Ligne vide - fermer les listes
      if (line.trim() === '') {
        if (inList) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc ml-6 my-2">
              {currentList}
            </ul>
          );
          currentList = [];
          inList = false;
        }
        if (inTaskList) {
          elements.push(
            <ul key={`tasklist-${index}`} className="ml-6 my-2 space-y-1">
              {currentTaskList}
            </ul>
          );
          currentTaskList = [];
          inTaskList = false;
        }
        elements.push(<br key={index} />);
        return;
      }

      // Fermer les listes avant un paragraphe
      if (inList) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc ml-6 my-2">
            {currentList}
          </ul>
        );
        currentList = [];
        inList = false;
      }
      if (inTaskList) {
        elements.push(
          <ul key={`tasklist-${index}`} className="ml-6 my-2 space-y-1">
            {currentTaskList}
          </ul>
        );
        currentTaskList = [];
        inTaskList = false;
      }

      // Paragraphe normal
      elements.push(
        <p key={index} className="mb-2 text-sm">
          {parseMarkdownInline(line)}
        </p>
      );
    });

    // Fermer les listes restantes
    if (inList) {
      elements.push(
        <ul key="list-end" className="list-disc ml-6 my-2">
          {currentList}
        </ul>
      );
    }
    if (inTaskList) {
      elements.push(
        <ul key="tasklist-end" className="ml-6 my-2 space-y-1">
          {currentTaskList}
        </ul>
      );
    }

    return <div className="text-gray-200 text-sm">{elements}</div>;
  };

  return (
    <div className="bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a] border border-purple-500/30 rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[95vh] min-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Note du projet{projectName ? `: ${projectName}` : ''}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode === 'edit'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Edit size={16} />
            Éditer
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
              viewMode === 'preview'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Eye size={16} />
            Aperçu
          </button>
        </div>
      </div>

      {/* Barre d'outils markdown */}
      {viewMode === 'edit' && (
        <div className="mb-3 flex flex-wrap gap-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
            <button
              onClick={handleBold}
              className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
              title="Gras (Ctrl+B)"
            >
              <Bold size={16} className="text-gray-300" />
            </button>
            <button
              onClick={handleItalic}
              className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
              title="Italique (Ctrl+I)"
            >
              <Italic size={16} className="text-gray-300" />
            </button>
            <button
              onClick={handleHeading}
              className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
              title="Titre"
            >
              <Hash size={16} className="text-gray-300" />
            </button>
            <button
              onClick={handleList}
              className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
              title="Liste"
            >
              <List size={16} className="text-gray-300" />
            </button>
            <button
              onClick={handleLink}
              className="p-1.5 hover:bg-gray-700/50 rounded transition-colors"
              title="Lien"
            >
              <LinkIcon size={16} className="text-gray-300" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Templates:</span>
            <button
              onClick={handleVersionTemplate}
              className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded transition-colors"
              title="Template version"
            >
              Version
            </button>
            <button
              onClick={handlePhaseTemplate}
              className="px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded transition-colors"
              title="Template phase"
            >
              Phase
            </button>
            <button
              onClick={handleEvolutionTemplate}
              className="px-2 py-1 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded transition-colors"
              title="Template évolution"
            >
              Évolution
            </button>
          </div>
        </div>
      )}

      {/* Zone d'édition ou prévisualisation */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-[60vh]">
        {viewMode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ajoutez des informations pertinentes sur ce projet... Utilisez Markdown pour formater votre texte."
            className="w-full flex-1 min-h-[60vh] px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm resize-none"
            autoFocus
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="flex-1 min-h-[60vh] overflow-y-auto px-4 py-3 bg-gray-800/30 border border-gray-700 rounded-lg">
            {renderPreview()}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
};
