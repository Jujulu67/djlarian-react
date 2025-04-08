/// <reference types="cypress" />

describe('Internationalization Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display content in French by default', () => {
    cy.get('html').should('have.attr', 'lang', 'fr');
    cy.contains('Contact').should('exist');
  });

  it('should switch to English when language is changed', () => {
    cy.get('[data-testid="language-switcher"]').click();
    cy.get('[data-testid="language-option-en"]').click();
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.contains('Contact').should('exist');
  });

  it('should switch to Spanish when language is changed', () => {
    cy.get('[data-testid="language-switcher"]').click();
    cy.get('[data-testid="language-option-es"]').click();
    cy.get('html').should('have.attr', 'lang', 'es');
    cy.contains('Contacto').should('exist');
  });

  it('should persist language preference', () => {
    cy.get('[data-testid="language-switcher"]').click();
    cy.get('[data-testid="language-option-en"]').click();
    cy.reload();
    cy.get('html').should('have.attr', 'lang', 'en');
  });

  it('should translate all UI elements', () => {
    // Switch to English
    cy.get('[data-testid="language-switcher"]').click();
    cy.get('[data-testid="language-option-en"]').click();

    // Check navigation items
    cy.contains('Home').should('exist');
    cy.contains('Music').should('exist');
    cy.contains('Events').should('exist');
    cy.contains('Gallery').should('exist');
    cy.contains('Contact').should('exist');

    // Switch to Spanish
    cy.get('[data-testid="language-switcher"]').click();
    cy.get('[data-testid="language-option-es"]').click();

    // Check navigation items
    cy.contains('Inicio').should('exist');
    cy.contains('Música').should('exist');
    cy.contains('Eventos').should('exist');
    cy.contains('Galería').should('exist');
    cy.contains('Contacto').should('exist');
  });
});
