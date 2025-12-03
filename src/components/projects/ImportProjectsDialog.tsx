'use client';

import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useCallback, useRef, useMemo } from 'react';

import Modal from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { parseExcelData, ParsedProjectRow } from '@/lib/utils/parseExcelData';

// Fonction pour formater en Title Case (même logique que dans parseExcelData)
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
import { ProjectStatus, PROJECT_STATUSES } from './types';

interface ImportProjectsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    projects: ParsedProjectRow[],
    overwriteDuplicates?: boolean
  ) => Promise<{
    success: boolean;
    created: number;
    failed: number;
    errors?: Array<{ index: number; error: string }>;
    duplicatesExcluded?: number;
  }>;
}

type DialogStep = 'paste' | 'preview' | 'result';

export const ImportProjectsDialog = ({ isOpen, onClose, onImport }: ImportProjectsDialogProps) => {
  const [step, setStep] = useState<DialogStep>('paste');
  const [pastedText, setPastedText] = useState('');
  const [hasHeaders, setHasHeaders] = useState(true);
  const [dateFormat, setDateFormat] = useState<'fr' | 'en'>('fr');
  const [parsedRows, setParsedRows] = useState<ParsedProjectRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState<
    Array<{ original: string; mapped: string | null }>
  >([]);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    created: number;
    failed: number;
    errors?: Array<{ index: number; error: string }>;
    duplicatesExcluded?: number;
  } | null>(null);
  const [existingProjects, setExistingProjects] = useState<Array<{ name: string; status: string }>>(
    []
  );
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpotifyCsv, setIsSpotifyCsv] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parser une ligne CSV en gérant les guillemets
  const parseCsvLine = useCallback((line: string, separator: string): string[] => {
    if (separator !== ',') {
      return line.split(separator).map((cell) => cell.trim());
    }

    const cells: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Guillemet échappé (double guillemet)
          currentCell += '"';
          i++; // Skip le prochain guillemet
        } else {
          // Toggle insideQuotes
          insideQuotes = !insideQuotes;
        }
      } else if (char === separator && !insideQuotes) {
        // Fin de cellule
        cells.push(currentCell.trim().replace(/^"|"$/g, '')); // Retirer les guillemets de début/fin
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    // Ajouter la dernière cellule
    cells.push(currentCell.trim().replace(/^"|"$/g, '')); // Retirer les guillemets de début/fin

    return cells;
  }, []);

  // Calculer les largeurs de colonnes pour l'alignement
  const calculateColumnWidths = useCallback(
    (text: string, separator: string) => {
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length === 0) return [];

      const numColumns = Math.max(...lines.map((line) => parseCsvLine(line, separator).length));
      const widths: number[] = new Array(numColumns).fill(0);

      lines.forEach((line) => {
        const cells = parseCsvLine(line, separator);
        cells.forEach((cell, index) => {
          const trimmed = cell.trim();
          if (trimmed.length > widths[index]) {
            widths[index] = trimmed.length;
          }
        });
      });

      // Ajouter un peu de padding
      return widths.map((w) => Math.min(w + 3, 50)); // Max 50 caractères par colonne
    },
    [parseCsvLine]
  );

  // Formater le texte pour aligner les colonnes
  const formatTextForAlignment = useCallback(
    (text: string, separator: string, widths: number[]) => {
      if (widths.length === 0) return text;

      const lines = text.split('\n');
      return lines
        .map((line) => {
          if (!line.trim()) return line;
          const cells = parseCsvLine(line, separator);
          return cells
            .map((cell, index) => {
              const trimmed = cell.trim();
              const width = widths[index] || trimmed.length;
              // Pad avec des espaces pour aligner
              return trimmed.padEnd(width, ' ');
            })
            .join(separator === '\t' ? '\t' : ' | '); // Utiliser | pour les virgules pour meilleur alignement visuel
        })
        .join('\n');
    },
    [parseCsvLine]
  );

  const handleParse = useCallback(async () => {
    if (!pastedText.trim()) {
      return;
    }

    try {
      // Détecter si c'est un CSV Spotify (colonnes song et release_date)
      let detectedSpotifyCsv = isSpotifyCsv;
      if (!detectedSpotifyCsv && hasHeaders) {
        const lines = pastedText.split('\n').filter((line) => line.trim());
        if (lines.length > 0) {
          const headerLine = lines[0];
          const separator = pastedText.includes('\t') ? '\t' : ',';
          const headerCells =
            separator === ','
              ? parseCsvLine(headerLine, separator)
              : headerLine.split(separator).map((cell) => cell.trim());
          const normalizedHeaders = headerCells.map((h) => h.trim().toLowerCase());
          detectedSpotifyCsv =
            normalizedHeaders.includes('song') &&
            (normalizedHeaders.includes('release_date') ||
              normalizedHeaders.includes('release date'));
        }
      }

      const rows = parseExcelData(pastedText, hasHeaders, dateFormat);

      // Si c'est un CSV Spotify, mettre le statut à TERMINE et le label à "Accepté" par défaut
      const rowsWithStatus = detectedSpotifyCsv
        ? rows.map((row) => ({
            ...row,
            status: (row.status || 'TERMINE') as ProjectStatus,
            label: row.label || 'Accepté',
          }))
        : rows;

      setParsedRows(rowsWithStatus);

      // Calculer les largeurs de colonnes
      const separator = pastedText.includes('\t') ? '\t' : ',';
      const widths = calculateColumnWidths(pastedText, separator);
      setColumnWidths(widths);

      // Récupérer les projets existants pour détecter les doublons
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const result = await response.json();
          const projects = result.data || result;
          const projectsWithStatus = projects.map((p: { name?: string; status?: string }) => ({
            name: p.name?.trim().toLowerCase() || '',
            status: p.status || 'EN_COURS',
          }));
          setExistingProjects(projectsWithStatus);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des projets existants:', error);
      }

      // Détecter les colonnes si on a des en-têtes
      if (hasHeaders) {
        const lines = pastedText.split('\n').filter((line) => line.trim());
        if (lines.length > 0) {
          const headerLine = lines[0];
          const headerCells = parseCsvLine(headerLine, separator);

          // Mapping des colonnes détectées (utiliser la même logique que le parser)
          const columns = headerCells.map((header) => {
            // Utiliser la fonction findMappedField du parser
            const normalized = header.trim().toLowerCase().replace(/\s+/g, ' ');

            // Mapping exact
            const exactMapping: Record<string, string> = {
              'nom projet': 'Nom Projet',
              nom: 'Nom Projet',
              name: 'Nom Projet',
              song: 'Nom Projet', // CSV Spotify
              style: 'Style',
              statut: 'Statut',
              status: 'Statut',
              collab: 'Collab',
              collaboration: 'Collab',
              label: 'Label',
              'label final': 'Label Final',
              labelfinal: 'Label Final',
              'date sortie': 'Date Sortie',
              datesortie: 'Date Sortie',
              release_date: 'Date Sortie', // CSV Spotify
              'release date': 'Date Sortie', // CSV Spotify (avec espace)
              date: 'Date Sortie',
              lien: 'Lien',
              link: 'Lien',
            };

            let mapped: string | null = exactMapping[normalized] || null;

            // Matching flexible pour les dates
            if (
              !mapped &&
              normalized.includes('date') &&
              (normalized.includes('sortie') || normalized.includes('release'))
            ) {
              mapped = 'Date Sortie';
            }

            // Matching flexible pour les streams
            if (!mapped) {
              const streamPatterns = [
                { pattern: /j7|streams?\s*j7/i, name: 'J7' },
                { pattern: /j14|streams?\s*j14/i, name: 'J14' },
                { pattern: /j21|streams?\s*j21/i, name: 'J21' },
                { pattern: /j28|streams?\s*j28/i, name: 'J28' },
                { pattern: /j56|streams?\s*j56/i, name: 'J56' },
                { pattern: /j84|streams?\s*j84/i, name: 'J84' },
              ];

              for (const { pattern, name } of streamPatterns) {
                if (pattern.test(header)) {
                  mapped = name;
                  break;
                }
              }
            }

            return {
              original: header,
              mapped,
            };
          });

          setDetectedColumns(columns);
        }
      } else {
        setDetectedColumns([]);
      }

      setStep('preview');
    } catch (error) {
      console.error('Erreur lors du parsing:', error);
      alert('Erreur lors du parsing des données. Vérifiez le format.');
    }
  }, [pastedText, hasHeaders, dateFormat, calculateColumnWidths, isSpotifyCsv, parseCsvLine]);

  const handleUpdateRow = useCallback(
    (index: number, field: keyof ParsedProjectRow, value: string | number | Date | null) => {
      setParsedRows((prev) =>
        prev.map((row, i) => {
          if (i === index) {
            // Convertir undefined en null pour la cohérence
            const normalizedValue = value === undefined ? null : value;
            const updated = { ...row, [field]: normalizedValue };
            // Re-valider la ligne
            const errors: string[] = [];
            if (!updated.name || updated.name.trim() === '') {
              errors.push('Le nom du projet est requis');
            }
            if (updated.status && !PROJECT_STATUSES.find((s) => s.value === updated.status)) {
              errors.push(`Statut invalide`);
            }
            return { ...updated, errors: errors.length > 0 ? errors : undefined };
          }
          return row;
        })
      );
    },
    []
  );

  const handleImport = useCallback(async () => {
    // Filtrer les lignes valides (sans erreurs et avec un nom)
    const validRows = parsedRows.filter(
      (row) => (!row.errors || row.errors.length === 0) && row.name && row.name.trim() !== ''
    );

    if (validRows.length === 0) {
      alert('Aucun projet valide à importer. Corrigez les erreurs avant de continuer.');
      return;
    }

    // S'assurer que tous les noms sont formatés en Title Case avant de détecter les doublons
    const formattedRows = validRows.map((row) => ({
      ...row,
      name: formatTitleCase(row.name.trim()),
    }));

    // Exclure les doublons basés sur le nom + statut (case-insensitive, après formatage)
    const seenKeys = new Set<string>();
    const uniqueRows: ParsedProjectRow[] = [];
    const rowsToOverwrite: ParsedProjectRow[] = [];
    let duplicatesInFileCount = 0;
    let duplicatesInDbCount = 0;

    for (const row of formattedRows) {
      const normalizedName = row.name.trim().toLowerCase();
      const rowStatus = row.status || 'EN_COURS';
      const rowKey = `${normalizedName}|${rowStatus}`;

      // Vérifier si c'est un doublon dans le fichier
      if (seenKeys.has(rowKey)) {
        duplicatesInFileCount++;
        continue;
      }

      // Vérifier si c'est un doublon dans la base de données (nom + statut)
      const isDuplicateInDb = existingProjects.some(
        (p) => p.name === normalizedName && p.status === rowStatus
      );

      if (isDuplicateInDb) {
        duplicatesInDbCount++;
        if (overwriteDuplicates) {
          // Si on veut écraser, ajouter à la liste des projets à mettre à jour
          rowsToOverwrite.push(row);
        }
        continue;
      }

      seenKeys.add(rowKey);
      uniqueRows.push(row);
    }

    const totalDuplicates = duplicatesInFileCount + duplicatesInDbCount;
    const projectsToImport = overwriteDuplicates ? [...uniqueRows, ...rowsToOverwrite] : uniqueRows;

    if (projectsToImport.length === 0) {
      let message = 'Aucun projet à importer.';
      if (duplicatesInFileCount > 0 && duplicatesInDbCount > 0) {
        message += `\n${duplicatesInFileCount} doublon(s) dans le fichier, ${duplicatesInDbCount} doublon(s) déjà en base de données.`;
      } else if (duplicatesInFileCount > 0) {
        message += `\n${duplicatesInFileCount} doublon(s) dans le fichier.`;
      } else if (duplicatesInDbCount > 0) {
        message += `\n${duplicatesInDbCount} projet(s) existent déjà en base de données.`;
        if (!overwriteDuplicates) {
          message += '\nActivez l\'option "Écraser les doublons" pour les mettre à jour.';
        }
      }
      alert(message);
      return;
    }

    setIsImporting(true);
    try {
      const result = await onImport(projectsToImport, overwriteDuplicates);

      // Utiliser le résultat de l'API
      if (result && typeof result === 'object') {
        // Combiner les doublons du fichier et ceux de la base de données
        const totalDuplicates =
          duplicatesInFileCount + duplicatesInDbCount + (result.duplicatesExcluded || 0);
        setImportResult({
          success: result.success !== false,
          created: result.created || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
          duplicatesExcluded: totalDuplicates,
        });
      } else {
        // Fallback si le résultat n'est pas au format attendu
        setImportResult({
          success: true,
          created: uniqueRows.length,
          failed: parsedRows.length - validRows.length,
          duplicatesExcluded: duplicatesInFileCount + duplicatesInDbCount,
        });
      }
      setStep('result');
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      setImportResult({
        success: false,
        created: 0,
        failed: uniqueRows.length,
        errors: [
          { index: 0, error: error instanceof Error ? error.message : "Erreur lors de l'import" },
        ],
        duplicatesExcluded: duplicatesInFileCount + duplicatesInDbCount,
      });
      setStep('result');
    } finally {
      setIsImporting(false);
    }
  }, [parsedRows, onImport, existingProjects, overwriteDuplicates]);

  const handleClose = useCallback(() => {
    setPastedText('');
    setHasHeaders(true);
    setDateFormat('fr');
    setParsedRows([]);
    setStep('paste');
    setImportResult(null);
    setIsImporting(false);
    setDetectedColumns([]);
    setColumnWidths([]);
    setExistingProjects([]);
    setOverwriteDuplicates(false);
    setIsDragging(false);
    setIsSpotifyCsv(false);
    onClose();
  }, [onClose]);

  const readFileContent = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          // Détecter si c'est un CSV Spotify (avec colonnes song, release_date, etc.)
          const lines = content.split('\n').filter((line) => line.trim());
          if (lines.length > 0) {
            const headerLine = lines[0];
            const headerCells = parseCsvLine(headerLine, ',');
            const normalizedHeaders = headerCells.map((h) => h.trim().toLowerCase());

            // Vérifier si c'est un CSV Spotify (contient song et release_date)
            const isSpotifyCsv =
              normalizedHeaders.includes('song') &&
              (normalizedHeaders.includes('release_date') ||
                normalizedHeaders.includes('release date'));

            if (isSpotifyCsv) {
              // Reformater pour ne garder que song et release_date
              const songIndex = normalizedHeaders.indexOf('song');
              const releaseDateIndex = normalizedHeaders.findIndex(
                (h) => h === 'release_date' || h === 'release date'
              );

              if (songIndex !== -1 && releaseDateIndex !== -1) {
                // Reformater avec tabulation pour un meilleur alignement
                const formattedLines = lines.map((line, lineIndex) => {
                  if (lineIndex === 0) {
                    // En-tête : Nom Projet\tDate Sortie
                    return 'Nom Projet\tDate Sortie';
                  }

                  const cells = parseCsvLine(line, ',');
                  const song = cells[songIndex]?.trim() || '';
                  const releaseDate = cells[releaseDateIndex]?.trim() || '';

                  // Formater la date si nécessaire (YYYY-MM-DD)
                  let formattedDate = releaseDate;
                  if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
                    // Essayer de parser la date
                    const date = new Date(releaseDate);
                    if (!isNaN(date.getTime())) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      formattedDate = `${year}-${month}-${day}`;
                    }
                  }

                  return `${song}\t${formattedDate}`;
                });

                const formattedContent = formattedLines.join('\n');
                setPastedText(formattedContent);
                setIsSpotifyCsv(true); // Marquer comme CSV Spotify

                // Recalculer les largeurs
                if (formattedContent.trim()) {
                  const widths = calculateColumnWidths(formattedContent, '\t');
                  setColumnWidths(widths);
                }
                return;
              }
            }
          }

          // Sinon, utiliser le contenu tel quel
          setPastedText(content);
          setIsSpotifyCsv(false); // Pas un CSV Spotify
          // Recalculer les largeurs si on a du texte
          if (content.trim()) {
            const separator = content.includes('\t') ? '\t' : ',';
            const widths = calculateColumnWidths(content, separator);
            setColumnWidths(widths);
          }
        }
      };
      reader.onerror = () => {
        alert('Erreur lors de la lecture du fichier');
      };
      reader.readAsText(file);
    },
    [calculateColumnWidths, parseCsvLine]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Vérifier que c'est un fichier texte ou CSV
        if (file.type === 'text/csv' || file.type === 'text/plain' || file.name.endsWith('.csv')) {
          readFileContent(file);
        } else {
          alert('Veuillez sélectionner un fichier CSV ou texte');
        }
      }
      // Réinitialiser l'input pour permettre de sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [readFileContent]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        // Vérifier que c'est un fichier texte ou CSV
        if (file.type === 'text/csv' || file.type === 'text/plain' || file.name.endsWith('.csv')) {
          readFileContent(file);
        } else {
          alert('Veuillez déposer un fichier CSV ou texte');
        }
      }
    },
    [readFileContent]
  );

  // Calculer les statistiques avec détection des doublons
  const validRowsCount = parsedRows.filter(
    (row) => (!row.errors || row.errors.length === 0) && row.name && row.name.trim() !== ''
  ).length;
  const invalidRowsCount = parsedRows.length - validRowsCount;

  // Détecter les doublons dans le fichier et par rapport à la base de données
  const duplicatesInfo = useMemo(() => {
    if (parsedRows.length === 0) return { inFile: 0, inDb: 0, total: 0, uniqueCount: 0 };

    const validRows = parsedRows.filter(
      (row) => (!row.errors || row.errors.length === 0) && row.name && row.name.trim() !== ''
    );

    // Formater tous les noms en Title Case
    const formattedRows = validRows.map((row) => ({
      ...row,
      name: formatTitleCase(row.name.trim()),
    }));

    const seenKeys = new Set<string>();
    let duplicatesInFile = 0;
    let duplicatesInDb = 0;
    let uniqueCount = 0;

    for (const row of formattedRows) {
      const normalizedName = row.name.trim().toLowerCase();
      const rowStatus = row.status || 'EN_COURS';
      const rowKey = `${normalizedName}|${rowStatus}`;

      // Vérifier si c'est un doublon dans le fichier
      if (seenKeys.has(rowKey)) {
        duplicatesInFile++;
      } else {
        seenKeys.add(rowKey);

        // Vérifier si c'est un doublon dans la base de données (nom + statut)
        const isDuplicateInDb = existingProjects.some(
          (p) => p.name === normalizedName && p.status === rowStatus
        );

        if (isDuplicateInDb) {
          duplicatesInDb++;
        } else {
          uniqueCount++;
        }
      }
    }

    return {
      inFile: duplicatesInFile,
      inDb: duplicatesInDb,
      total: duplicatesInFile + duplicatesInDb,
      uniqueCount,
    };
  }, [parsedRows, existingProjects]);

  // Calculer le nombre de projets qui seront importés
  const projectsToImportCount =
    duplicatesInfo.uniqueCount + (overwriteDuplicates ? duplicatesInfo.inDb : 0);

  if (!isOpen) return null;

  return (
    <Modal
      maxWidth="max-w-[95vw]"
      onClose={handleClose}
      bgClass="bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a]"
      borderClass="border border-purple-500/30"
      fullscreenContent={false}
    >
      <div
        className="flex flex-col"
        style={{ height: 'calc(80vh - 5rem)', minHeight: '600px', display: 'flex' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <h2 className="text-2xl font-bold text-white">Importer des projets depuis Excel/CSV</h2>
        </div>

        {/* Step 1: Paste */}
        {step === 'paste' && (
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
                  Si vous incluez la première ligne avec les en-têtes (Nom Projet, Style, Statut,
                  etc.), le système détectera automatiquement la correspondance des colonnes. Sinon,
                  l'ordre des colonnes doit suivre : Nom, Style, Statut, Collab, Label, Label Final,
                  Date Sortie, Lien, J7, J14, J21, J28, J56, J84.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Pour les fichiers CSV Spotify, les colonnes{' '}
                  <code className="bg-gray-800/50 px-1 rounded">song</code> et{' '}
                  <code className="bg-gray-800/50 px-1 rounded">release_date</code> seront
                  automatiquement mappées.
                </p>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Les formats tabulations et virgules sont supportés automatiquement. Vous pouvez
                également glisser-déposer un fichier CSV dans la zone ci-dessous.
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
                  tabSize:
                    columnWidths.length > 0 ? Math.max(...columnWidths.map((w) => w + 2)) : 8,
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
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">Aperçu des données</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {parsedRows.length} ligne(s) détectée(s) •{' '}
                  <span className="text-green-400">
                    {validRowsCount - duplicatesInfo.total} valide(s)
                  </span>
                  {duplicatesInfo.total > 0 && (
                    <>
                      {' '}
                      • <span className="text-yellow-400">{duplicatesInfo.total} doublon(s)</span>
                      {duplicatesInfo.inFile > 0 && duplicatesInfo.inDb > 0 && (
                        <span className="text-gray-500 text-xs ml-1">
                          ({duplicatesInfo.inFile} dans le fichier, {duplicatesInfo.inDb} en base)
                        </span>
                      )}
                    </>
                  )}
                  {invalidRowsCount > 0 && (
                    <>
                      {' '}
                      • <span className="text-red-400">{invalidRowsCount} avec erreur(s)</span>
                    </>
                  )}
                </p>
                {hasHeaders && detectedColumns.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 inline-flex items-center gap-2">
                      <span>
                        Colonnes détectées : {detectedColumns.filter((c) => c.mapped).length}/
                        {detectedColumns.length} mappées
                      </span>
                      {/* Ne pas afficher les colonnes non mappées si on a exactement 2 colonnes mappées (Nom Projet et Date Sortie) = CSV Spotify reformaté */}
                      {detectedColumns.filter((c) => !c.mapped).length > 0 &&
                        !(
                          detectedColumns.filter((c) => c.mapped).length === 2 &&
                          detectedColumns.some((c) => c.mapped === 'Nom Projet') &&
                          detectedColumns.some((c) => c.mapped === 'Date Sortie')
                        ) && (
                          <div className="group relative inline-flex items-center">
                            <span className="text-yellow-400 cursor-help underline decoration-dotted">
                              ({detectedColumns.filter((c) => !c.mapped).length} non reconnue(s))
                            </span>
                            <div className="absolute left-0 top-6 z-20 hidden group-hover:block bg-gray-900 border border-yellow-500/50 rounded-lg p-3 shadow-lg min-w-[250px]">
                              <div className="text-xs font-semibold text-yellow-400 mb-2">
                                Colonnes non reconnues :
                              </div>
                              <div className="text-xs text-gray-300 space-y-1">
                                {detectedColumns
                                  .filter((c) => !c.mapped)
                                  .map((col, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <span className="text-yellow-400">•</span>
                                      <span className="font-mono">{col.original}</span>
                                    </div>
                                  ))}
                              </div>
                              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/10">
                                Ces colonnes seront ignorées lors de l'import
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setStep('paste')}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Modifier les données
              </button>
            </div>

            <div
              className="overflow-x-auto flex-1 min-h-0 border border-white/10 rounded-lg"
              style={{ overflowY: 'auto' }}
            >
              <table className="w-full border-collapse min-w-[1150px]">
                <thead className="sticky top-0 bg-gray-900/95 z-10">
                  <tr className="border-b border-white/10">
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '45px', width: '45px' }}
                    >
                      Etat
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '130px' }}
                    >
                      Nom *
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '100px' }}
                    >
                      Style
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '110px' }}
                    >
                      Statut
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '100px' }}
                    >
                      Collab
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '100px' }}
                    >
                      Label
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '100px' }}
                    >
                      Label Final
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '120px' }}
                    >
                      Date Sortie
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '120px' }}
                    >
                      Lien
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '60px' }}
                    >
                      J7
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '60px' }}
                    >
                      J14
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '60px' }}
                    >
                      J21
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '60px' }}
                    >
                      J28
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '60px' }}
                    >
                      J56
                    </th>
                    <th
                      className="px-2 py-2 text-left text-xs font-semibold text-purple-300 uppercase whitespace-nowrap"
                      style={{ minWidth: '60px' }}
                    >
                      J84
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {parsedRows.map((row, index) => {
                    const hasErrors = row.errors && row.errors.length > 0;
                    const normalizedName = row.name?.trim().toLowerCase() || '';
                    const rowStatus = row.status || 'EN_COURS';
                    const isDuplicateInFile = parsedRows
                      .slice(0, index)
                      .some(
                        (r) =>
                          r.name?.trim().toLowerCase() === normalizedName &&
                          (r.status || 'EN_COURS') === rowStatus
                      );
                    const isDuplicateInDb = existingProjects.some(
                      (p) => p.name === normalizedName && p.status === rowStatus
                    );
                    const isDuplicate = isDuplicateInFile || isDuplicateInDb;
                    return (
                      <tr
                        key={index}
                        className={`${
                          hasErrors
                            ? 'bg-red-500/10 border-l-4 border-red-500'
                            : isDuplicate
                              ? 'bg-yellow-500/10 border-l-4 border-yellow-500'
                              : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="px-2 py-2" style={{ width: '45px' }}>
                          {hasErrors ? (
                            <div className="group relative">
                              <AlertCircle size={16} className="text-red-400 cursor-help" />
                              <div className="absolute left-0 top-6 z-20 hidden group-hover:block bg-gray-900 border border-red-500/50 rounded-lg p-2 shadow-lg min-w-[200px]">
                                <div className="text-xs text-red-400 space-y-1">
                                  {row.errors?.map((err, i) => (
                                    <div key={i}>{err}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : isDuplicate ? (
                            <div className="group relative">
                              <AlertCircle size={16} className="text-yellow-400 cursor-help" />
                              <div className="absolute left-0 top-6 z-20 hidden group-hover:block bg-gray-900 border border-yellow-500/50 rounded-lg p-2 shadow-lg min-w-[250px]">
                                <div className="text-xs text-yellow-400 space-y-1">
                                  <div className="font-semibold mb-1">Doublon détecté</div>
                                  {isDuplicateInFile && (
                                    <div>• Doublon dans le fichier (même nom + statut)</div>
                                  )}
                                  {isDuplicateInDb && <div>• Existe déjà en base de données</div>}
                                  <div className="text-gray-400 mt-1 text-xs">
                                    Statut:{' '}
                                    {PROJECT_STATUSES.find((s) => s.value === rowStatus)?.label ||
                                      rowStatus}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Check size={16} className="text-green-400" />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.name || ''}
                            onChange={(e) => handleUpdateRow(index, 'name', e.target.value)}
                            className={`w-full bg-gray-800/50 border rounded px-2 py-1 text-sm text-white ${
                              !row.name || row.name.trim() === ''
                                ? 'border-red-500/50'
                                : 'border-purple-500/30'
                            } focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[120px]`}
                            placeholder="Nom requis"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.style || ''}
                            onChange={(e) => handleUpdateRow(index, 'style', e.target.value)}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                            placeholder="Style"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row.status || 'EN_COURS'}
                            onChange={(e) =>
                              handleUpdateRow(index, 'status', e.target.value as ProjectStatus)
                            }
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[100px]"
                          >
                            {PROJECT_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.collab || ''}
                            onChange={(e) => handleUpdateRow(index, 'collab', e.target.value)}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                            placeholder="Collab"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.label || ''}
                            onChange={(e) => handleUpdateRow(index, 'label', e.target.value)}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                            placeholder="Label"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.labelFinal || ''}
                            onChange={(e) => handleUpdateRow(index, 'labelFinal', e.target.value)}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[90px]"
                            placeholder="Label Final"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={row.releaseDate || ''}
                            onChange={(e) => handleUpdateRow(index, 'releaseDate', e.target.value)}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[110px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.externalLink || ''}
                            onChange={(e) => handleUpdateRow(index, 'externalLink', e.target.value)}
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-w-[110px]"
                            placeholder="URL"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={row.streamsJ7 ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(
                                index,
                                'streamsJ7',
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={row.streamsJ14 ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(
                                index,
                                'streamsJ14',
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={row.streamsJ21 ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(
                                index,
                                'streamsJ21',
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={row.streamsJ28 ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(
                                index,
                                'streamsJ28',
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={row.streamsJ56 ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(
                                index,
                                'streamsJ56',
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={row.streamsJ84 ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(
                                index,
                                'streamsJ84',
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 tabular-nums"
                            placeholder="0"
                            min="0"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {duplicatesInfo.inDb > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <Checkbox
                  checked={overwriteDuplicates}
                  onCheckedChange={setOverwriteDuplicates}
                  label={`Écraser les ${duplicatesInfo.inDb} projet(s) existant(s) en base de données avec les nouvelles valeurs`}
                />
                <p className="text-xs text-yellow-300 mt-2 ml-6">
                  Si désactivé, les projets existants seront ignorés et seuls les nouveaux projets
                  seront importés.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => setStep('paste')}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                Retour
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || projectsToImportCount === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Importer {projectsToImportCount} projet(s)
                    {duplicatesInfo.inDb > 0 &&
                      overwriteDuplicates &&
                      ` (${duplicatesInfo.uniqueCount} nouveau(x) + ${duplicatesInfo.inDb} mis à jour)`}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && importResult && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div
              className={`p-4 rounded-lg border ${
                importResult.success
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <Check size={24} className="text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3
                    className={`text-lg font-semibold ${
                      importResult.success ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {importResult.success ? 'Import réussi !' : "Erreur lors de l'import"}
                  </h3>
                  <p className="text-sm text-gray-300 mt-1">
                    {importResult.created} projet(s) créé(s)
                    {importResult.failed > 0 && ` • ${importResult.failed} échec(s)`}
                    {importResult.duplicatesExcluded !== undefined &&
                      importResult.duplicatesExcluded > 0 && (
                        <span className="text-yellow-400">
                          {' '}
                          • {importResult.duplicatesExcluded} doublon(s) exclu(s)
                        </span>
                      )}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-xs text-red-400">
                          Ligne {err.index + 1}: {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
