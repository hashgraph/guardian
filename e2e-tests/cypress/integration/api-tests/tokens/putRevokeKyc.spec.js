/// <reference types="cypress" />
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {
    const authorization = Cypress.env("authorization");
    const tokenId = Cypress.env("tokenId");
    const user = Cypress.env("root_user");

    it("Unsets the KYC flag for the user", () => {
        cy.sendRequest(
            METHOD.PUT,
            API.ListOfTokens + tokenId + "/" + user + "/revokeKyc",
            { authorization }
        ).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);

            let token = resp.body.tokenId;
            let kyc = resp.body.kyc;

            expect(token).to.deep.equal(tokenId);
            expect(kyc).to.be.false;
        });
    });
});
