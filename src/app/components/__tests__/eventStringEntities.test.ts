import fs from 'fs';
import path from 'path';

import ts from 'typescript';

/**
 * Garde-fou : dans les chaînes JS (toasts, messages d'erreur, titres calculés…),
 * les entités HTML (&apos; / &quot;) s'affichent telles quelles à l'utilisateur.
 * Dans le JSX texte et les attributs JSX elles sont décodées, donc on ne les flag pas.
 */
const ROOT = path.resolve(__dirname, '../../../..');

const SCOPE = [
  'src/app/components/EventForm.tsx',
  'src/app/components/event-form',
  'src/app/(routes)/events',
];

const ENTITY_REGEX = /&(apos|quot);/;

function listSourceFiles(target: string): string[] {
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : listSourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function findEntitiesInJsStrings(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const found: string[] = [];

  const visit = (node: ts.Node): void => {
    const isStringLike =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node);
    const isJsxAttributeValue =
      ts.isStringLiteral(node) && !!node.parent && ts.isJsxAttribute(node.parent);

    if (isStringLike && !isJsxAttributeValue && ENTITY_REGEX.test(node.getText(sourceFile))) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      found.push(`${path.relative(ROOT, filePath)}:${line + 1} ${node.getText(sourceFile)}`);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

describe('chaînes JS sans entités HTML (formulaire et pages événements)', () => {
  const files = SCOPE.flatMap((target) => listSourceFiles(path.join(ROOT, target)));

  it('trouve bien les fichiers du périmètre', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('ne contient pas d&apos;/&quot; dans une chaîne JS', () => {
    const offenders = files.flatMap(findEntitiesInJsStrings);
    expect(offenders).toEqual([]);
  });
});
