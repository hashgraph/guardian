import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {

    before(() => {
        const authorization = Cypress.env("authorization");

        let username = "Installer";

        cy.sendRequest(
            METHOD.POST,
            API.AccountsLogin,
            { authorization },
            {
                username: username,
                password: "test",
            }
        )
            .as("requestToken")
            .then((response) => {
                const accessToken = Cypress.env("authorization");

                cy.sendRequest(METHOD.GET, API.Profiles + username, {
                    accessToken,
                }).then((response) => {
                    cy.request({
                        method: "GET",
                        url: Cypress.env("api_server") + "profiles/" + username,
                        headers: {
                            authorization: accessToken,
                        },
                    }).then((response) => {
                        response.body.accessToken = accessToken;
                        cy.writeFile(
                            "cypress/fixtures/Installer.json",
                            JSON.stringify(response.body)
                        );
                    });
                });
            });
    });

    it("should be able to dissociate and associate token", () => {
        cy.get("@requestToken").then((response) => {
            const accessToken =  Cypress.env("authorization");
            const tokenId = Cypress.env("tokenId");

            cy.request({
                method: "PUT",
                url:
                    Cypress.env("api_server") +
                    "tokens/" +
                    tokenId +
                    "/dissociate",
                headers: {
                    authorization: accessToken,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });

            cy.request({
                method: "PUT",
                url:
                    Cypress.env("api_server") +
                    "tokens/" +
                    tokenId +
                    "/associate",
                headers: {
                    authorization: accessToken,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });
});
