/// <reference types="cypress" />
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {
    const authorization = Cypress.env("authorization");

    it("get all tokens", () => {
        cy.sendRequest(METHOD.POST, API.ListOfTokens, { authorization }, 
            {
                "changeSupply": true,
                "decimals": "string",
                "enableAdmin": true,
                "enableFreeze": true,
                "enableKYC": true,
                "enableWipe": true,
                "initialSupply": "string",
                "tokenName": "string",
                "tokenSymbol": "string",
                "tokenType": "string"
              }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.ERROR);
            }
        );
    });
});
