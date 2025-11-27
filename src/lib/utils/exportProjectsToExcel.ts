import * as XLSX from 'xlsx-js-style';
import { Project } from '@/components/projects/types';
import { PROJECT_STATUSES } from '@/components/projects/types';

/**
 * Exporte les projets vers un fichier Excel avec un header stylé
 */
export function exportProjectsToExcel(projects: Project[], filename: string = 'projets.xlsx') {
  // Créer un nouveau workbook
  const wb = XLSX.utils.book_new();

  // Préparer les données avec les en-têtes
  const headers = [
    'Nom Projet',
    'Style',
    'Statut',
    'Collab',
    'Label',
    'Label Final',
    'Date Sortie',
    'Streams J7',
    'Streams J14',
    'Streams J21',
    'Streams J28',
    'Streams J56',
    'Streams J84',
    'Date Création',
    'Date Modification',
    'Action',
  ];

  // Convertir les projets en données pour Excel
  const data = projects.map((project) => {
    const statusLabel =
      PROJECT_STATUSES.find((s) => s.value === project.status)?.label || project.status;

    // Construire la colonne Action avec lien et action
    const actionParts = [];
    if (project.externalLink) {
      actionParts.push(`Lien: ${project.externalLink}`);
    }
    actionParts.push('Supprimer');
    const actionValue = actionParts.join(' | ');

    return [
      project.name || '',
      project.style || '',
      statusLabel,
      project.collab || '',
      project.label || '',
      project.labelFinal || '',
      project.releaseDate ? new Date(project.releaseDate).toLocaleDateString('fr-FR') : '',
      project.streamsJ7 ?? '',
      project.streamsJ14 ?? '',
      project.streamsJ21 ?? '',
      project.streamsJ28 ?? '',
      project.streamsJ56 ?? '',
      project.streamsJ84 ?? '',
      project.createdAt ? new Date(project.createdAt).toLocaleDateString('fr-FR') : '',
      project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('fr-FR') : '',
      actionValue,
    ];
  });

  // Créer les données - commencer directement par les headers
  const excelData = [headers, ...data];

  // Créer la feuille avec les données
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // Définir la largeur des colonnes
  const colWidths = [
    { wch: 25 }, // Nom Projet
    { wch: 15 }, // Style
    { wch: 12 }, // Statut
    { wch: 20 }, // Collab
    { wch: 20 }, // Label
    { wch: 20 }, // Label Final
    { wch: 12 }, // Date Sortie
    { wch: 10 }, // Streams J7
    { wch: 10 }, // Streams J14
    { wch: 10 }, // Streams J21
    { wch: 10 }, // Streams J28
    { wch: 10 }, // Streams J56
    { wch: 10 }, // Streams J84
    { wch: 12 }, // Date Création
    { wch: 12 }, // Date Modification
    { wch: 30 }, // Action
  ];
  ws['!cols'] = colWidths;

  // Styliser le header (ligne 0) avec un bandeau foncé
  for (let col = 0; col < headers.length; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: {
        bold: true,
        color: { rgb: 'FFFFFF' },
        sz: 11,
      },
      fill: {
        fgColor: { rgb: '2D3748' }, // Gris foncé
        patternType: 'solid',
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
      },
      border: {
        top: { style: 'thin', color: { rgb: '1A202C' } },
        bottom: { style: 'thin', color: { rgb: '1A202C' } },
        left: { style: 'thin', color: { rgb: '1A202C' } },
        right: { style: 'thin', color: { rgb: '1A202C' } },
      },
    };
  }

  // Alterner les couleurs pour les lignes de données (gris/blanc)
  for (let row = 1; row <= data.length; row++) {
    const isEven = row % 2 === 0;
    const bgColor = isEven ? 'F7FAFC' : 'FFFFFF'; // Gris clair / Blanc

    for (let col = 0; col < headers.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;

      if (!ws[cellAddress].s) {
        ws[cellAddress].s = {};
      }

      ws[cellAddress].s.fill = {
        fgColor: { rgb: bgColor },
        patternType: 'solid',
      };

      ws[cellAddress].s.border = {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      };
    }
  }

  // Ajouter la feuille au workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Projets');

  // Générer le fichier et le télécharger
  XLSX.writeFile(wb, filename);
}
