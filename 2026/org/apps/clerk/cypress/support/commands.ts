/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Chainable<Subject> {
    // login(email: string, password: string): void;
    login(): void;
    logout(): void;
  }
}
Cypress.Commands.add('login', () => {
  cy.visit('/')
  cy.get('[data-cy="hdrAuth"]').click();
  cy.get('[data-cy="auth-email"').as('emlInput').click()
  cy.get('@emlInput').type('mikecnc61@yahoo.com')
  cy.get('[data-cy="auth-password"').type('Passw0rd')
  cy.get('[data-cy="auth-submit"').click()
  cy.get('[data-cy="hdrProj"').should('have.length', 1)
})

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy="hdrLogout"]').as('logBtn').click();
  cy.get('[data-cy="hdrAuth"]').should('have.length', 1)
})
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => {
  // console.log("Custom command example: Login", email, password);
// });
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
