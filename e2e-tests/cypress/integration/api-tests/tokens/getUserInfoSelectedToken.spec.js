import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {
    const authorization = Cypress.env("authorization");
    const tokenId = Cypress.env("tokenId");
    const user = Cypress.env("root_user");

    it("get token info", () => {
        cy.sendRequest(
            METHOD.GET,
            API.ListOfTokens + tokenId + "/" + user + "/info",
            { authorization }
        ).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body).to.not.be.oneOf([null, ""]);
        });
    });
});

