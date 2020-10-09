describe('Single model', () => {
    it('Visits discovery server', () => {
        cy.visit('localhost:8123');
    });

    it('Has model name', () => {
        cy.contains('Single model');
    });

    it('Opens report page', () => {
        cy.contains('Make report').click();
        cy.get('input').should('have.attr', 'placeholder', 'Untitled report');
    });
});
