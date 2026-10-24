'use client';

import { Upload } from 'lucide-react';
import type { Dispatch, SetStateAction, RefObject, DragEvent, ChangeEvent } from 'react';

import { Checkbox } from '@/components/ui/Checkbox';

import { calculateColumnWidths } from '../importProjectsUtils';

interface PasteStepProps {
  columnWidths: number[];
  dateFormat: 'fr' | 'en';
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleClose: () => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleParse: () => Promise<void>;
  hasHeaders: boolean;
  isDragging: boolean;
  isSpotifyCsv: boolean;
  pastedText: string;
  setColumnWidths: React.Dispatch<React.SetStateAction<number[]>>;
  setDateFormat: React.Dispatch<React.SetStateAction<'fr' | 'en'>>;
  setHasHeaders: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSpotifyCsv: React.Dispatch<React.SetStateAction<boolean>>;
  setPastedText: React.Dispatch<React.SetStateAction<string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function PasteStep({
  columnWidths,
  dateFormat,
  fileInputRef,
  handleClose,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileSelect,
  handleParse,
  hasHeaders,
  isDragging,
  isSpotifyCsv,
  pastedText,
  setColumnWidths,
  setDateFormat,
  setHasHeaders,
  setIsSpotifyCsv,
  setPastedText,
  textareaRef,
}: PasteStepProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Collez les données depuis Excel ou importez un fichier CSV
        </label>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-2">
          <p className="text-xs text-purple-300 font-medium mb-1">
            💡 Astuce : Inclure les en-têtes facilite le mapping automatique
          </p>
          <p className="text-xs text-gray-400">
            Si vous incluez la première ligne avec les en-têtes (Nom Projet, Style, Statut, etc.),
            le système détectera automatiquement la correspondance des colonnes. Sinon, l'ordre des
            colonnes doit suivre : Nom, Style, Statut, Collab, Label, Label Final, Date Sortie,
            Lien, J7, J14, J21, J28, J56, J84.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Pour les fichiers CSV Spotify, les colonnes{' '}
            <code className="bg-gray-800/50 px-1 rounded">song</code> et{' '}
            <code className="bg-gray-800/50 px-1 rounded">release_date</code> seront automatiquement
            mappées.
          </p>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Les formats tabulations et virgules sont supportés automatiquement. Vous pouvez également
          glisser-déposer un fichier CSV dans la zone ci-dessous.
        </p>
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-purple-600/50 hover:bg-purple-600 text-white rounded-lg transition-colors border border-purple-500/30 hover:border-purple-500/50 flex items-center gap-2"
          >
            <Upload size={14} aria-hidden="true" />
            Sélectionner un fichier CSV
          </button>
        </div>
        <div className="mb-3">
          <Checkbox
            checked={hasHeaders}
            onCheckedChange={setHasHeaders}
            label="La première ligne contient les en-têtes (recommandé)"
          />
          <div className="flex items-center gap-4 mt-3">
            <label className="text-sm text-gray-300">Format de date :</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="dateFormat"
                  value="fr"
                  checked={dateFormat === 'fr'}
                  onChange={(e) => setDateFormat('fr')}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all group-hover:border-purple-500/70 relative ${
                    dateFormat === 'fr'
                      ? 'border-purple-600 bg-purple-600'
                      : 'border-gray-600 bg-gray-800'
                  }`}
                >
                  {dateFormat === 'fr' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-300">Français (JJ/MM/AAAA)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="dateFormat"
                  value="en"
                  checked={dateFormat === 'en'}
                  onChange={(e) => setDateFormat('en')}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all group-hover:border-purple-500/70 relative ${
                    dateFormat === 'en'
                      ? 'border-purple-600 bg-purple-600'
                      : 'border-gray-600 bg-gray-800'
                  }`}
                >
                  {dateFormat === 'en' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-300">Anglais (MM/JJ/AAAA)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col mb-4 relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Sélectionner un fichier CSV"
        />
        <textarea
          ref={textareaRef}
          value={pastedText}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onChange={(e) => {
            const target = e.target;
            if (!target) return;

            const newValue = target.value || '';
            setPastedText(newValue);
            // Réinitialiser isSpotifyCsv si le texte change manuellement
            setIsSpotifyCsv(false);
            // Recalculer les largeurs si on a du texte
            if (newValue.trim()) {
              const separator = newValue.includes('\t') ? '\t' : ',';
              const widths = calculateColumnWidths(newValue, separator);
              setColumnWidths(widths);
            } else {
              setColumnWidths([]);
            }

            // Si le texte vient d'être collé (grande différence de longueur), remettre le scroll en haut
            if (newValue.length > pastedText.length + 100 && textareaRef.current) {
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.scrollTop = 0;
                  textareaRef.current.scrollLeft = 0;
                }
              }, 0);
            }
          }}
          onPaste={(e) => {
            // Empêcher le comportement par défaut qui pourrait scroller
            e.preventDefault();

            // Récupérer les données collées
            const clipboardData =
              e.clipboardData ||
              (window as Window & { clipboardData?: DataTransfer }).clipboardData;
            const pastedData = clipboardData?.getData('text') || '';

            // Insérer le texte à la position du curseur
            const target = e.currentTarget;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const newValue =
              pastedText.substring(0, start) + pastedData + pastedText.substring(end);

            setPastedText(newValue);
            // Réinitialiser isSpotifyCsv si le texte change manuellement
            setIsSpotifyCsv(false);

            // Recalculer les largeurs si on a du texte
            if (newValue.trim()) {
              const separator = newValue.includes('\t') ? '\t' : ',';
              const widths = calculateColumnWidths(newValue, separator);
              setColumnWidths(widths);
            }

            // Remettre le scroll en haut à gauche après le collage
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.scrollTop = 0;
                textareaRef.current.scrollLeft = 0;
                // Remettre le curseur au début
                textareaRef.current.setSelectionRange(0, 0);
              }
            });

            // Double vérification après un court délai
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.scrollTop = 0;
                textareaRef.current.scrollLeft = 0;
              }
            }, 100);
          }}
          placeholder="Collez vos données ici ou glissez-déposez un fichier CSV..."
          className={`w-full h-full bg-gray-800/50 border rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent font-mono leading-relaxed whitespace-pre overflow-x-auto resize-none transition-colors ${
            isDragging ? 'border-purple-500 bg-purple-500/20' : 'border-purple-500/30'
          }`}
          style={{
            tabSize: columnWidths.length > 0 ? Math.max(...columnWidths.map((w) => w + 2)) : 8,
            fontFeatureSettings: '"tnum"', // Tabular numbers
            letterSpacing: '0.025em', // Légère augmentation de l'espacement pour meilleure lisibilité
          }}
        />
      </div>
      <div className="flex justify-end gap-3 flex-shrink-0">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleParse}
          disabled={!pastedText.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Upload size={16} aria-hidden="true" />
          Analyser les données
        </button>
      </div>
    </div>
  );
}
