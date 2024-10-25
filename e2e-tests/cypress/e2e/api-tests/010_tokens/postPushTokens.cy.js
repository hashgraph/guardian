import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tokens", { tags: ['tokens', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Push create a new token", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfTokens + "push",
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
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
            });
        });
    })
});
