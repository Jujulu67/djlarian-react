'use client';

import { useState, useCallback, useRef, useMemo } from 'react';

import Modal from '@/components/ui/Modal';
import { parseExcelData, ParsedProjectRow } from '@/lib/utils/parseExcelData';

import { PasteStep } from './import-projects/PasteStep';
import { PreviewStep } from './import-projects/PreviewStep';
import { ResultStep } from './import-projects/ResultStep';
import type { DialogStep, ImportResult } from './import-projects/types';
import { calculateColumnWidths, formatTitleCase, parseCsvLine } from './importProjectsUtils';
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [existingProjects, setExistingProjects] = useState<Array<{ name: string; status: string }>>(
    []
  );
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpotifyCsv, setIsSpotifyCsv] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [pastedText, hasHeaders, dateFormat, isSpotifyCsv]);

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

  const readFileContent = useCallback((file: File) => {
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
  }, []);

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
          <PasteStep
            columnWidths={columnWidths}
            dateFormat={dateFormat}
            fileInputRef={fileInputRef}
            handleClose={handleClose}
            handleDragLeave={handleDragLeave}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleFileSelect={handleFileSelect}
            handleParse={handleParse}
            hasHeaders={hasHeaders}
            isDragging={isDragging}
            isSpotifyCsv={isSpotifyCsv}
            pastedText={pastedText}
            setColumnWidths={setColumnWidths}
            setDateFormat={setDateFormat}
            setHasHeaders={setHasHeaders}
            setIsSpotifyCsv={setIsSpotifyCsv}
            setPastedText={setPastedText}
            textareaRef={textareaRef}
          />
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <PreviewStep
            detectedColumns={detectedColumns}
            duplicatesInfo={duplicatesInfo}
            existingProjects={existingProjects}
            handleImport={handleImport}
            handleUpdateRow={handleUpdateRow}
            hasHeaders={hasHeaders}
            invalidRowsCount={invalidRowsCount}
            isImporting={isImporting}
            overwriteDuplicates={overwriteDuplicates}
            parsedRows={parsedRows}
            projectsToImportCount={projectsToImportCount}
            setOverwriteDuplicates={setOverwriteDuplicates}
            setStep={setStep}
            validRowsCount={validRowsCount}
          />
        )}

        {/* Step 3: Result */}
        {step === 'result' && importResult && (
          <ResultStep handleClose={handleClose} importResult={importResult} />
        )}
      </div>
    </Modal>
  );
};
