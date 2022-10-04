
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {
    const authorization = Cypress.env("authorization");
    const user = Cypress.env("root_user");

    it("push sets the KYC flag for the user", () => {
        cy.sendRequest(METHOD.GET,Cypress.env("api_server") + API.ListOfTokens, { authorization }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);

                const tokenId = resp.body[0].tokenId;

                cy.sendRequest(
                    METHOD.PUT,
                    Cypress.env("api_server") + API.ListOfTokens +
                        "push/" +
                        tokenId +
                        "/" +
                        user +
                        "/grantKyc",
                    { authorization }
                ).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);
                });
            }
        );
    });

    it("push unsets the KYC flag for the user", () => {
        cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.ListOfTokens, { authorization }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);

                const tokenId = resp.body[0].tokenId;

                cy.sendRequest(
                    METHOD.PUT,
                    Cypress.env("api_server") + API.ListOfTokens +
                        "push/" +
                        tokenId +
                        "/" +
                        user +
                        "/revokeKyc",
                    { authorization }
                ).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);
                });
            }
        );
    });
});
