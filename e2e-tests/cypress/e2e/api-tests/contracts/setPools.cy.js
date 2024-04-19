import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' }, () => {
    const authorization = Cypress.env("authorization");
    const contractNameR = Math.floor(Math.random() * 999) + "RCon4GetPoolsTests";
    const contractNameW = Math.floor(Math.random() * 999) + "WCon4GetPoolsTests";
    const tokenName = Math.floor(Math.random() * 999) + "TokenName";
    let rConractId, tokenId, rConractUuid;
    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractNameR,
                "type": "RETIRE",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
            rConractUuid = response.body.id;
            rConractId = response.body.contractId;
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                body: {
                    "description": contractNameW,
                    "type": "WIPE",
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                let wConractId = response.body.contractId;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                    body: {
                        draftToken: false,
                        tokenName: tokenName,
                        tokenSymbol: "tn",
                        tokenType: "fungible",
                        decimals: "2",
                        initialSupply: "0",
                        enableAdmin: true,
                        changeSupply: true,
                        enableFreeze: false,
                        enableKYC: false,
                        enableWipe: true,
                        wipeContractId: wConractId,
                        tokenId: null
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.ListOfTokens,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        tokenId = response.body.at(0).tokenId;
                    });
                });
            })
        });
    })

    it("Set retire contract pool", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
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
    });

    it("Set retire contract pool without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
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
            url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
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
            url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
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
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: "Registrant",
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization: accessToken
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
});
