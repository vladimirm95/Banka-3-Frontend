describe("PortfolioPage – profit kalkulacija", () => {
    beforeEach(() => {
        cy.visitAsClient("/portfolio");
    });

    it("prikazuje kolonu Vrednost pozicije", () => {
        cy.get(".portfolio-table th").should("contain", "Vrednost pozicije");
    });

    it("vrednost pozicije je trenutna cena * kolicina", () => {
        // AAPL: 175.00 * 10 = 1.750,00 RSD
        cy.get(".position-value").first().should("contain", "1.750,00");
    });

    it("prikazuje dve summary kartice", () => {
        cy.get(".portfolio-summary").should("have.length", 2);
    });

    it("prikazuje ukupnu vrednost portfolia", () => {
        cy.get(".summary--neutral").should("exist");
        cy.get(".summary-label").should("contain", "Ukupna vrednost portfolia");
        // AAPL 1750 + MSFT 1350 + GOVT 2100 + GOOGL 330 = 5.530,00
        cy.get(".summary-value--neutral").should("contain", "5.530,00");
    });

    it("profit redovi imaju zelenu boju", () => {
        cy.get("td").contains("+250,00").should("have.css", "color", "rgb(52, 211, 153)");
    });

    it("gubitak redovi imaju crvenu boju", () => {
        cy.get("td").contains("-150,00").should("have.css", "color", "rgb(248, 113, 113)");
    });

    it("ukupni profit je pozitivan i zelen", () => {
        // +250 - 150 + 100 - 30 = +170
        cy.get(".summary--profit .summary-value").should("contain", "+170,00");
    });
});