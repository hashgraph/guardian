import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", { tags: ['tokens', 'thirdPool'] },() => {
    const authorization = Cypress.env("authorization");

    it("Get all tokens", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfTokens,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body[0]).to.have.property("_id");
            expect(response.body[0]).to.have.property("tokenId");
            expect(response.body[0]).to.have.property("tokenName");
        });
    });
});
