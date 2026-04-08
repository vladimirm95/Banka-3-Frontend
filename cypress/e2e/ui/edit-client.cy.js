describe("Izmena klijenta", () => {
    beforeEach(() => {
        cy.intercept("GET", "**/api/clients*", {
            statusCode: 200,
            body: [
                {
                    id: 1,
                    first_name: "Pera",
                    last_name: "Peric",
                    email: "pera@primer.rs",
                    gender: "M",
                    phone_number: "+381601234567",
                    address: "Knez Mihailova 1, Beograd",
                    date_of_birth: 946684800, // 01.01.2000
                    username: "pera.peric",
                },
            ],
        }).as("getClients");

        cy.intercept("GET", "**/api/accounts*", {
            statusCode: 200,
            body: [],
        }).as("getAccounts");

        cy.intercept("PUT", "**/api/clients/1", {
            statusCode: 200,
            body: { id: 1, valid: true },
        }).as("updateClient");

        cy.visit("/clients/edit/1", {
            onBeforeLoad(win) {
                win.localStorage.setItem("accessToken", "mock_access_token_123");
                win.localStorage.setItem("refreshToken", "mock_refresh_token_123");
                win.localStorage.setItem("userRole", "employee");
                win.localStorage.setItem(
                    "permissions",
                    JSON.stringify(["admin", "manage_clients"])
                );
            },
        });

        cy.wait("@getClients");
    });

    it("forma je popunjena postojecim podacima", () => {
        cy.get('input[name="firstName"]').should("have.value", "Pera");
        cy.get('input[name="lastName"]').should("have.value", "Peric");
        cy.get('select[name="gender"]').should("have.value", "M");
        cy.get('input[name="email"]').should("have.value", "pera@primer.rs");
        cy.get('input[name="phoneNumber"]').should("have.value", "+381601234567");
        cy.get('input[name="address"]').should(
            "have.value",
            "Knez Mihailova 1, Beograd"
        );
        cy.get('input[name="dateOfBirth"]').should("have.value", "01.01.2000");
    });

    it("korisnik moze izmeniti podatke", () => {
        cy.get('input[name="lastName"]').clear().type("Petrovic");
        cy.get('input[name="phoneNumber"]').clear().type("+381641112223");
        cy.get('input[name="address"]').clear().type("Bulevar 12, Novi Sad");

        cy.get('button[type="submit"]').click();

        cy.wait("@updateClient").its("request.body").should((body) => {
            expect(body.first_name).to.eq("Pera");
            expect(body.last_name).to.eq("Petrovic");
            expect(body.gender).to.eq("M");
            expect(body.email).to.eq("pera@primer.rs");
            expect(body.phone_number).to.eq("381641112223");
            expect(body.address).to.eq("Bulevar 12, Novi Sad");
            expect(body.date_of_birth).to.be.a("number");
        });

        cy.get(".success-msg").should(
            "contain",
            "Podaci klijenta su uspešno izmenjeni."
        );
    });

    it("validacija radi za prazna polja", () => {
        cy.get('input[name="lastName"]').clear();
        cy.get('button[type="submit"]').click();

        cy.get(".error-msg").should("contain", "Prezime je obavezno.");
    });

    it("korisnik bez manage_clients permisije ne moze da udje", () => {
        cy.visit("/clients/edit/1", {
            onBeforeLoad(win) {
                win.localStorage.setItem("accessToken", "mock_access_token_123");
                win.localStorage.setItem("refreshToken", "mock_refresh_token_123");
                win.localStorage.setItem("userRole", "employee");
                win.localStorage.setItem("permissions", JSON.stringify(["admin"]));
            },
        });

        cy.url().should("include", "/employees");
    });
});