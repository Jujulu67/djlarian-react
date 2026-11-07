/**
 * Modifier un projet désigné par son nom (« passe Fly à 50% »).
 * Parseur réel, sans mocks.
 */
import { handleUpdateCommand } from '../handlers/update';
import { findNamedProject } from '../named-project';
import { detectFilters } from '../../query-parser/filters';
import { ProjectCommandType } from '../types';
import { createTestProject, resetTestProjectFactory } from './test-project-factory';

const styles = ['House', 'Techno', 'Dark'];

function setup() {
  resetTestProjectFactory();
  const projects = [
    createTestProject({ name: 'Fly', progress: 40 }),
    createTestProject({ name: 'Zz Test Claude', progress: 0 }),
    createTestProject({ name: 'Dark Mage', progress: 40 }),
    createTestProject({ name: 'Électric Symphonie', progress: 10 }),
    createTestProject({ name: 'Autre', progress: 40 }),
  ];
  return projects;
}

function update(
  message: string,
  projects = setup(),
  filters = detectFilters(message, message.toLowerCase(), [], styles).filters
) {
  const result = handleUpdateCommand(
    message,
    message.toLowerCase(),
    filters,
    projects,
    {},
    [],
    styles
  );
  return { result, projects };
}

describe('findNamedProject', () => {
  it('trouve le nom sans tenir compte de la casse ni des accents', () => {
    const projects = setup();
    const found = findNamedProject('passe electric symphonie à 80%', projects);
    expect(found.kind === 'found' && found.project.name).toBe('Électric Symphonie');
  });

  it('remplace le nom par « le projet », y compris après « du » ou « le projet »', () => {
    const projects = setup();
    const a = findNamedProject('passe le projet Zz Test Claude à 40%', projects);
    expect(a.kind === 'found' && a.rewrittenMessage).toBe('passe le projet à 40%');
    const b = findNamedProject('mets la deadline de Fly au 20/12/2026', projects);
    expect(b.kind === 'found' && b.rewrittenMessage).toBe(
      'mets la deadline du projet au 20/12/2026'
    );
  });

  it('ignore les commandes au pluriel et les notes', () => {
    const projects = setup();
    expect(findNamedProject('passe les projets à 40% à 50%', projects).kind).toBe('none');
    expect(findNamedProject('ajoute une note pour Fly : refaire le mix', projects).kind).toBe(
      'none'
    );
  });

  it('ne confond pas un nom avec un morceau de mot', () => {
    expect(findNamedProject('passe Flying à 50%', setup()).kind).toBe('none');
  });

  it('signale deux projets du même nom', () => {
    const projects = [...setup(), createTestProject({ name: 'fly' })];
    expect(findNamedProject('passe Fly à 50%', projects)).toMatchObject({
      kind: 'ambiguous',
      count: 2,
    });
  });
});

describe('handleUpdateCommand avec un projet nommé', () => {
  it.each([
    ['passe Zz Test Claude à 40%', 'Zz Test Claude', { newProgress: 40 }],
    ['passe le projet Zz Test Claude à 40%', 'Zz Test Claude', { newProgress: 40 }],
    ['mets Fly à 75%', 'Fly', { newProgress: 75 }],
    ['passe Dark Mage en terminé', 'Dark Mage', { newStatus: 'TERMINE' }],
  ])('« %s » ne vise que %s', (message, name, mutation) => {
    const { result } = update(message);
    expect(result.type).toBe(ProjectCommandType.UPDATE);
    expect(result.pendingAction?.scopeSource).toBe('NamedProject');
    expect(result.pendingAction?.affectedProjects.map((p) => p.name)).toEqual([name]);
    expect(result.pendingAction?.mutation).toMatchObject(mutation);
  });

  it('refuse de choisir entre deux projets du même nom', () => {
    const projects = [...setup(), createTestProject({ name: 'Fly' })];
    const { result } = update('passe Fly à 50%', projects);
    expect(result.type).toBe(ProjectCommandType.GENERAL);
    expect(result.pendingAction).toBeUndefined();
    expect(result.response).toMatch(/2 projets s'appellent « Fly »/);
  });

  it('garde le comportement par filtre sans nom de projet', () => {
    const { result } = update('passe les projets en cours à 60%', setup(), { status: 'EN_COURS' });
    expect(result.pendingAction?.scopeSource).toBe('ExplicitFilter');
    expect(result.pendingAction?.affectedProjects).toHaveLength(5);
    expect(result.pendingAction?.mutation).toMatchObject({ newProgress: 60 });
  });
});
