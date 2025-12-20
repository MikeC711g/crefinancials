/// <reference types="cypress" />
/********************************************************************************
 * Takes menu items (main and secondary) and a string to verify it all worked
 * Assumes data-cy for menu items and item to select to verify
 *********************************************************************************/
function selectHeader(hdrMain: string, hdrItem: string, verifyStr: string) {
  cy.get(`[data-cy="${hdrMain}"]`).click();
  cy.get(`[data-cy="${hdrItem}"]`).click();
  cy.get(`[data-cy="ctrn-${verifyStr}"`).should('have.length', 1) ;
}

function addTran(acct: string, category: string, tranTp: string, amt: string, tranExt: string,
  taxCat: string, annotation: string, house: string, project: string) {
  selectHeader('hdrTran', 'hdrTrCre8', 'ctrn-addTran')
  cy.get('[data-cy="cta-dbs"]').as('addBtn').should('be.disabled') ;
  cy.get('[data-cy="cta-account"').select(acct)
  cy.get('[data-cy="cta-category"').select(category)
  cy.get('[data-cy="cta-tranType"').select(tranTp)
  cy.get('[data-cy="cta-amount"').type(amt)
  if (tranExt) cy.get('[data-cy="cta-tranExtra"').type(tranExt)
  cy.get('[data-cy="cta-taxCat"').select(taxCat)
  if (annotation) cy.get('[data-cy="cta-annot"').type(annotation)
  if (house) cy.get('[data-cy="cta-house"').type(house)
  if (project) cy.get('[data-cy="cta-project"').type(project)
  cy.get('@addBtn').should('not.be.disabled').click() ;
  // cy.get('[data-cy="cta-canBtn"]').click();
}

describe('Check initial screen and sign in', () => {
  it('should login then create a transaction', () => {
    cy.login()
//    selectHeader('hdrTran', 'hdrTrCre8', 'ctrn-addTran')
    // cy.get('[data-cy="hdrTran"]').click();
    // cy.get('[data-cy="hdrTrCre8"]').click();
    // cy.get('[data-cy="ctrn-addTran"').should('have.length', 1) ;
    addTran('phChecking', 'Mortgage Interest', 'DEBIT', '150.50', 'Extra Tran Info', 'BE',
      'Annotation text', '', '') ;
    // cy.get('[data-cy="cta-account"').select('phChecking')
      // as('acctSelect').should('have.length', 1) ;
    // cy.get('@acctSelect').select('phChecking') // .should('eq', 'phChecking')
    // cy.get('[data-cy="cta-category"').select('Mortgage Interest')
    // cy.get('[data-cy="cta-tranType"').select('DEBIT')
    // cy.get('[data-cy="cta-amount"').type('150.50')
    // cy.get('[data-cy="cta-tranExtra"').type('Extra Tran Info')
    // cy.get('[data-cy="cta-taxCat"').select('BE')
    // cy.get('[data-cy="cta-annot"').type('Annotation text')
    // cy.screenshot() ;
    // cy.get('[data-cy="cta-canBtn"]').click();

    cy.logout()
  })
})
