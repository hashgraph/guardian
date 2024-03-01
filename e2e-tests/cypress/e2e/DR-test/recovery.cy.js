
const Locators = {
    createNew: "Create new",
    srBtn: "Standard Registry",
    submitBtn: '[type="submit"]',
    restoreDataBtn: "Restore data",
    refreshBtn: "refresh",
    username: '[formcontrolname="login"]',
    nextBtn: "Next",
    connectBtn: "Connect",
    inputGeo: '[ng-reflect-name="geography"]',
    inputLaw:  '[ng-reflect-name="law"]',
    inputTags:  '[ng-reflect-name="tags"]',
};

describe("Disaster Recovery Testing", { tags: "@recovery" }, () => {
    const name = Math.floor(Math.random() * 999) + "testName";
    it("checks ", () => {
        cy.viewport(1440, 900);

        cy.visit("http://localhost:3000/");

        //create new
        cy.get("div > form > a")
            .should("have.attr", "href")
            .and("include", "/register")
            .then(() => {
                cy.contains(Locators.createNew).click();
                cy.contains(Locators.srBtn).click();

                const inputName = cy.get(Locators.username);
                inputName.type(name);

                cy.get(Locators.submitBtn).click();

                cy.contains("Generate").click();
                cy.wait(5000);

                cy.get('[formcontrolname="hederaAccountId"]')
                    .invoke("val")
                    .then((hederaAccountId) => {
                        cy.log(hederaAccountId);
                        let accountId = hederaAccountId;

                        cy.get('[formcontrolname="hederaAccountKey"]')
                            .invoke("val")
                            .then((hederaAccountKey) => {
                                cy.log(hederaAccountKey);
                                let accountKey = hederaAccountKey;

                                cy.contains(Locators.nextBtn).click();


                                const inputGeography = cy.get(Locators.inputGeo);
                                inputGeography.type('test');
                                const inputLaw = cy.get(Locators.inputLaw);
                                inputLaw.type('test');
                                const inputTags = cy.get(Locators.inputTags);
                                inputTags.type('test');


                                cy.contains(Locators.connectBtn).click();
                                cy.wait(16000);

                                const standartRegistry = cy.contains(name);
                                standartRegistry.click({ force: true });
                                cy.contains("Log out").click({ force: true });

                                cy.get("div > form > a")
                                    .should("have.attr", "href")
                                    .and("include", "/register")
                                    .then(() => {
                                        cy.contains(Locators.createNew).click();
                                        cy.contains(Locators.srBtn).click();

                                        const inputName = cy.get(
                                            Locators.username
                                        );
                                        inputName.type(name);

                                        cy.get(Locators.submitBtn).click();

                                        const inputhederaAccountId = cy.get(
                                            '[formcontrolname="hederaAccountId"]'
                                        );
                                        inputhederaAccountId.type(accountId);

                                        const inputhederaAccountKey = cy.get(
                                            '[formcontrolname="hederaAccountKey"]'
                                        );
                                        inputhederaAccountKey.type(accountKey);

                                        cy.contains(
                                            "*[role='img']",
                                            "arrow_drop_down"
                                        )
                                            .trigger("mouseover")
                                            .click();
                                        cy.contains(
                                            Locators.restoreDataBtn
                                        ).click();
                                        cy.wait(20000);
                                        cy.contains(
                                            Locators.refreshBtn
                                        ).click();
                                        cy.wait(120000);
                                        cy.contains(
                                            Locators.restoreDataBtn
                                        ).click();
                                    });
                            });
                    });
            });
    });
});

export {};
