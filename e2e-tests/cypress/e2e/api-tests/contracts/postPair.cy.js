import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' },() => {
    const authorization = Cypress.env("authorization");
    let contractId;
    let basicTokenId;
    let oppositeTokenId;

    it("get contract id for pair", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            }
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.status).eql(STATUS_CODE.OK);
            contractId = resp.body.at(-1).contractId;
        });
    });

    it("get tokens ids for pair", () => {
        cy.request({
            method: "POST",
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
                "tokenName": "test" + Math.floor(Math.random() * 999),
                "tokenSymbol": "string",
                "tokenType": "string"
            },
        });
        cy.request({
            method: "POST",
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
                "tokenName": "test" + Math.floor(Math.random() * 999),
                "tokenSymbol": "string",
                "tokenType": "string"
            },
        });
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfTokens,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            basicTokenId = resp.body.at(-1).tokenId;
            oppositeTokenId = resp.body.at(-2).tokenId;
            console.log(basicTokenId, oppositeTokenId)
        });
    });

    it("create pair", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts + contractId + "/pair",
            headers: {
                authorization,
            },
            body: {
                "baseTokenId": basicTokenId,
                "oppositeTokenId": oppositeTokenId,
                "baseTokenCount": 1,
                "oppositeTokenCount": 2
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body).to.eq(true);
        });
    });
});
