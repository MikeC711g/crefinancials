/// <reference types="cypress" />
// hdrAuth  hdrTran  hdrTrLoad  hdrTrCre8  hdrTrSrch  hdrProj  hdrRecon  
describe('Check initial screen and sign in', () => {
  it('should verify login menu item then sign in', () => {
    cy.login()
    cy.logout()
  })
})
