describe("PortfolioPage – pregled hartija", () => {
    beforeEach(() => {
        cy.visitAsClient("/portfolio");
    });

    it("prikazuje naslov stranice", () => {
        cy.contains("Moj portfolio").should("be.visible");
    });

    it("prikazuje tabelu sa kolonama", () => {
        cy.get(".portfolio-table").should("exist");
        cy.get(".portfolio-table th").should("contain", "Tip");
        cy.get(".portfolio-table th").should("contain", "Ticker");
        cy.get(".portfolio-table th").should("contain", "Naziv");
        cy.get(".portfolio-table th").should("contain", "Količina");
        cy.get(".portfolio-table th").should("contain", "Trenutna cena");
        cy.get(".portfolio-table th").should("contain", "Profit/Gubitak");
    });

    it("prikazuje mock hartije u tabeli", () => {
        cy.get(".portfolio-table tbody tr").should("have.length", 4);
        cy.get(".ticker").should("contain", "AAPL");
        cy.get(".ticker").should("contain", "MSFT");
        cy.get(".ticker").should("contain", "GOVT");
        cy.get(".ticker").should("contain", "GOOGL");
    });

    it("prikazuje tip hartije kao badge", () => {
        cy.get(".security-type-badge").first().should("be.visible");
        cy.get(".security-type-badge").should("contain", "Akcija");
        cy.get(".security-type-badge").should("contain", "Obveznica");
    });

    it("prikazuje profit u zelenoj boji", () => {
        cy.get(".pl--profit").should("exist");
        cy.get(".pl--profit").each(($el) => {
            cy.wrap($el).should("contain", "+");
        });
    });

    it("prikazuje gubitak u crvenoj boji", () => {
        cy.get(".pl--loss").should("exist");
        cy.get(".pl--loss").each(($el) => {
            cy.wrap($el).invoke("text").should("not.contain", "+");
        });
    });

    it("prikazuje summary karticu sa ukupnim profit/gubitkom", () => {
        cy.get(".portfolio-summary").should("exist");
        cy.get(".summary-label").should("contain", "Ukupni profit/gubitak");
        cy.get(".summary-value").should("be.visible");
    });

    it("summary kartica ima zelenu boju kada je ukupno profit", () => {
        // AAPL: +25000, MSFT: -15000, GOVT: +10000, GOOGL: -3000 => +17000 = profit
        cy.get(".portfolio-summary").should("have.class", "summary--profit");
        cy.get(".summary-value").should("contain", "+");
    });

    it("svaki red ima Sell dugme", () => {
        cy.get(".sell-btn").should("have.length", 4);
    });

    it("klik na Sell dugme prikazuje alert", () => {
        cy.on("window:alert", (text) => {
            expect(text).to.contain("AAPL");
        });
        cy.get(".sell-btn").first().click();
    });
});