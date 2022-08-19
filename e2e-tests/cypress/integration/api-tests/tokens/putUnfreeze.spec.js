import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {
    const authorization = Cypress.env("authorization");
    const tokenId = Cypress.env("tokenId");
    const user = Cypress.env("root_user");

    it("Unreezes transfers of the specified token for the user.", () => {
        cy.sendRequest(
            METHOD.PUT,
            API.ListOfTokens + tokenId + "/" + user + "/unfreeze",
            { authorization }
        ).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);

            let token = resp.body.tokenId;
            let frozen = resp.body.frozen;

            expect(token).to.deep.equal(tokenId);
            expect(frozen).to.be.false;
        });
    });
});
