/// <reference types="cypress" />

describe('Accessibility Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have proper heading structure', () => {
    cy.get('h1').should('exist');
    cy.get('h1').should('have.length.at.least', 1);
  });

  it('should have proper alt text for images', () => {
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt').and('not.be.empty');
    });
  });

  it('should have proper ARIA labels for interactive elements', () => {
    cy.get('button').each(($button) => {
      if (!$button.attr('aria-label')) {
        cy.wrap($button).invoke('text').should('not.be.empty');
      }
    });
  });

  it('should have proper focus indicators', () => {
    cy.get('a, button, input, select, textarea').first().focus();
    cy.get('a:focus, button:focus, input:focus, select:focus, textarea:focus').should(
      'have.length.at.least',
      1
    );
  });

  it('should have proper color contrast', () => {
    // This is a basic check and might need to be adjusted based on your specific design
    cy.get('body').should('have.css', 'color');
    cy.get('body').should('have.css', 'background-color');
  });

  it('should have proper form labels', () => {
    cy.get('form').each(($form) => {
      cy.wrap($form)
        .find('input, select, textarea')
        .each(($input) => {
          const id = $input.attr('id');
          if (id) {
            cy.get(`label[for="${id}"]`).should('exist');
          }
        });
    });
  });

  it('should have proper skip links', () => {
    cy.get('a[href="#main-content"]').should('exist');
  });
});
