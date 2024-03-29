describe('Single model', () => {
    it('Has model name', () => {
        cy.visit('localhost:8124');
        cy.contains('Single model');
    });

    it('Opens report page', () => {
        cy.visit('localhost:8124');
        cy.contains('Discover').click();
        cy.get('input').should('have.attr', 'placeholder', 'Untitled discovery');
    });
});
