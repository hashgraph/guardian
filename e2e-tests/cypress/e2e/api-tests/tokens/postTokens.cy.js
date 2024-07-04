import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens",{ tags: ['tokens', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");

    it("Create a new token", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfTokens,
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
