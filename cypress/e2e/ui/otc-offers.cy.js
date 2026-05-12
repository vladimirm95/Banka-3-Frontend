describe("OtcOffersPage – aktivne ponude", () => {
    beforeEach(() => {
        cy.visitAsClient("/otc/offers");
    });

    it("prikazuje naslov stranice", () => {
        cy.contains("Aktivne OTC ponude").should("be.visible");
    });

    it("prikazuje tabelu sa kolonama", () => {
        cy.get(".otc-table").should("exist");
        cy.get(".otc-table th").should("contain", "Ticker");
        cy.get(".otc-table th").should("contain", "Količina");
        cy.get(".otc-table th").should("contain", "Status");
        cy.get(".otc-table th").should("contain", "Akcije");
    });

    it("prikazuje mock ponude u tabeli", () => {
        cy.get(".otc-table tbody tr").should("have.length", 4);
        cy.get(".otc-ticker").should("contain", "AAPL");
        cy.get(".otc-ticker").should("contain", "MSFT");
        cy.get(".otc-ticker").should("contain", "GOOGL");
        cy.get(".otc-ticker").should("contain", "GOVT");
    });

    it("prikazuje status badge za svaku ponudu", () => {
        cy.get(".otc-status--pending").should("have.length", 2);
        cy.get(".otc-status--accepted").should("have.length", 1);
        cy.get(".otc-status--rejected").should("have.length", 1);
    });

    it("prikazuje akcije samo za pending ponude", () => {
        cy.get(".otc-actions").should("have.length", 2);
        cy.get(".otc-btn--accept").should("have.length", 2);
        cy.get(".otc-btn--reject").should("have.length", 2);
        cy.get(".otc-btn--counter").should("have.length", 2);
    });

    it("prihvatanje ponude menja status u Prihvaćena", () => {
        cy.get(".otc-btn--accept").first().click();
        cy.get(".otc-banner--ok").should("be.visible").and("contain", "prihvaćena");
    });

    it("odbijanje ponude menja status u Odbijena", () => {
        cy.get(".otc-btn--reject").first().click();
        cy.get(".otc-banner--ok").should("be.visible").and("contain", "odbijena");
    });

    it("otvara modal za kontraponudu", () => {
        cy.get(".otc-btn--counter").first().click();
        cy.get(".otc-modal").should("be.visible");
        cy.get(".otc-modal h2").should("contain", "Kontraponuda");
    });

    it("slanje kontraponude zatvara modal i prikazuje poruku", () => {
        cy.get(".otc-btn--counter").first().click();
        cy.get(".otc-modal-input").type("150");
        cy.get(".otc-btn-primary").click();
        cy.get(".otc-modal").should("not.exist");
        cy.get(".otc-banner--ok").should("be.visible").and("contain", "Kontraponuda");
    });

    it("zatvaranje modala klikom na Otkaži", () => {
        cy.get(".otc-btn--counter").first().click();
        cy.get(".otc-modal").should("be.visible");
        cy.get(".otc-btn-secondary").click();
        cy.get(".otc-modal").should("not.exist");
    });
});