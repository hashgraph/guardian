import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {
    const authorization = Cypress.env("authorization");

    it("get all tokens", () => {
        cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.ListOfTokens, { authorization }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
                expect(resp.body[0]).to.have.property("_id");
                expect(resp.body[0]).to.have.property("tokenId");
                expect(resp.body[0]).to.have.property("tokenName");
            }
        );
    });
});
