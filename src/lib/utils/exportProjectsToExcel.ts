import { Workbook } from 'exceljs';
import { Project } from '@/components/projects/types';
import { PROJECT_STATUSES } from '@/components/projects/types';

/**
 * Exporte les projets vers un fichier Excel avec un header stylé
 */
export async function exportProjectsToExcel(
  projects: Project[],
  filename: string = 'projets.xlsx'
): Promise<void> {
  // Créer un nouveau workbook
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Projets');

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

  // Ajouter les headers
  worksheet.addRow(headers);

  // Définir la largeur des colonnes
  const colWidths = [25, 15, 12, 20, 20, 20, 12, 10, 10, 10, 10, 10, 10, 12, 12, 30];
  colWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  // Styliser le header (ligne 1) avec un bandeau foncé
  const headerRow = worksheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' }, // Blanc
    size: 11,
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D3748' }, // Gris foncé
  };
  headerRow.alignment = {
    horizontal: 'center',
    vertical: 'middle',
  };
  headerRow.border = {
    top: { style: 'thin', color: { argb: 'FF1A202C' } },
    bottom: { style: 'thin', color: { argb: 'FF1A202C' } },
    left: { style: 'thin', color: { argb: 'FF1A202C' } },
    right: { style: 'thin', color: { argb: 'FF1A202C' } },
  };

  // Ajouter les données
  data.forEach((rowData) => {
    worksheet.addRow(rowData);
  });

  // Alterner les couleurs pour les lignes de données (gris/blanc)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const isEven = rowNumber % 2 === 0;
    const bgColor = isEven ? 'FFF7FAFC' : 'FFFFFFFF'; // Gris clair / Blanc

    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Générer le fichier et le télécharger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
