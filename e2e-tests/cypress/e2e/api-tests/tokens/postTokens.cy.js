import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens",{ tags: '@tokens' }, () => {
    const authorization = Cypress.env("authorization");

    it("post for creating new token", () => {
        cy.request({
            method: "POST",
            url: Cypress.env("api_server") + API.ListOfTokens,
            headers: { authorization },
            body: {
                "changeSupply": true,
                "decimals": "string",
                "enableAdmin": true,
                "enableFreeze": true,
                "enableKYC": true,
                "enableWipe": true,
                "initialSupply": "string",
                "tokenName": "test",
                "tokenSymbol": "string",
                "tokenType": "string" 
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
        });
    });
});
