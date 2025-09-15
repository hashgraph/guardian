import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const tokenName = "FirstToken"
    let contractIdR, contractUuidW, tokenId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    "type": "RETIRE",
                },
                timeout: 180000
            }).then((response) => {
                contractIdR = response.body.at(0).id;
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    qs: {
                        "type": "WIPE",
                    },
                }).then((response) => {
                    contractUuidW = response.body.at(0).contractId;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ListOfTokens,
                        headers: { authorization },
                        body: {
                            draftToken: false,
                            tokenName: tokenName,
                            tokenSymbol: "F",
                            tokenType: "non-fungible",
                            decimals: "2",
                            initialSupply: "0",
                            enableAdmin: true,
                            changeSupply: true,
                            enableFreeze: false,
                            enableKYC: false,
                            enableWipe: true,
                            wipeContractId: contractUuidW,
                            tokenId: null,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);
                        response.body.forEach(element => {
                            if (element.tokenName == tokenName) {
                                tokenId = element.tokenId
                            }
                        });
                    });
                })
            })
        })
    })

    it("Set retire contract pool", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
                headers: {
                    authorization,
                },
                body: {
                    tokens: [
                        {
                            token: tokenId,
                            count: 1
                        }
                    ],
                    immediately: false
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            })
        })
    });

    it("Set retire contract pool without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
            failOnStatusCode: false,
            body: {
                tokens: [
                    {
                        token: tokenId,
                        count: 1
                    }
                ],
                immediately: false
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Set retire contract pool with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
            body: {
                tokens: [
                    {
                        token: tokenId,
                        count: 1
                    }
                ],
                immediately: false
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Set retire contract pool with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
            body: {
                tokens: [
                    {
                        token: tokenId,
                        count: 1
                    }
                ],
                immediately: false
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Set retire contract pool as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
                body: {
                    tokens: [
                        {
                            token: tokenId,
                            count: 1
                        }
                    ],
                    immediately: false
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
});
