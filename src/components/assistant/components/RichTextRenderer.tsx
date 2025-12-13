'use client';

/**
 * Rendu de texte riche (Markdown simple) pour l'assistant
 * Supporte :
 * - **gras**
 * - *italique*
 * - Listes à puces (- ou •)
 * - Liens (simplifiés)
 * - Sauts de ligne
 */
export function RichTextRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Séparer par lignes pour traiter les listes
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: React.ReactNode[] = [];
  let inList = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('• ');

    if (isListItem) {
      // Début ou continuation de liste
      const listContent = trimmed.substring(1).trim();
      currentList.push(
        <li key={`li-${index}`} className="ml-4 pl-1 marker:text-purple-400/70">
          <FormattedText text={listContent} />
        </li>
      );
      inList = true;
    } else {
      // Si on était dans une liste, on la ferme
      if (inList) {
        elements.push(
          <ul key={`ul-${index}`} className="list-disc my-2 space-y-1">
            {currentList}
          </ul>
        );
        currentList = [];
        inList = false;
      }

      // Paragraphe normal (sauf si vide)
      if (trimmed === '') {
        elements.push(<div key={`br-${index}`} className="h-2" />); // Espace vide
      } else {
        elements.push(
          <p key={`p-${index}`} className="min-h-[1em] mb-1 leading-relaxed">
            <FormattedText text={line} />
          </p>
        );
      }
    }
  });

  // Fermer la liste si elle est encore ouverte à la fin
  if (inList) {
    elements.push(
      <ul key="ul-end" className="list-disc my-2 space-y-1">
        {currentList}
      </ul>
    );
  }

  return <div className="rich-text-content">{elements}</div>;
}

/**
 * Parse le gras et l'italique dans une ligne
 */
function FormattedText({ text }: { text: string }) {
  // Regex pour capturer **gras** et *italique*
  // On utilise un split avec capture pour garder les délimiteurs
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-purple-200">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={i} className="italic text-purple-100/90">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      })}
    </>
  );
}
