import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const contractNameR = "SecondAPIContractR";
    const tokenName = "FirstToken";

    let contractUuidW, contractIdW, contractIdR, contractUuidR, tokenId, wipeRequestId;

    describe("Reject", () => {

        before("Get request id", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                        method: METHOD.GET,
                        url: API.ApiServer + API.WipeRequests,
                        headers: {
                            authorization,
                        },
                        qs: {
                            contractId: contractUuidW,
                            pageIndex: 0,
                            pageSize: 5
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        wipeRequestId = response.body.at(0).id;
                    })
                })
            })
        })

        it("Reject wipe contract requests without auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Reject wipe contract requests with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                headers: {
                    authorization: "Bearer wqe",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Reject wipe contract requests with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                headers: {
                    authorization: "",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Reject wipe contract requests", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Reject,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: contractUuidW
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0)).to.not.exist;
                })
            })
        })
    })

    describe("Clear", () => {

        before("Set pool", () => {
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
                    contractUuidR = response.body.at(0).contractId;
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
                        contractIdW = response.body.at(0).id;
                        contractUuidW = response.body.at(0).contractId;
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.ListOfTokens,
                            headers: {
                                authorization,
                            },
                        }).then((response) => {
                            response.body.forEach(element => {
                                if (element.tokenName == tokenName) {
                                    tokenId = element.tokenId
                                }
                            });
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

                            Checks.whileRetireRequestCreating(contractUuidW, authorization, 0)

                            cy.request({
                                method: METHOD.GET,
                                url: API.ApiServer + API.WipeRequests,
                                headers: {
                                    authorization,
                                },
                                qs: {
                                    contractId: contractUuidW
                                }
                            }).then((response) => {
                                expect(response.status).eql(STATUS_CODE.OK);
                                wipeRequestId = response.body.at(0).id;
                            })
                        })
                    })
                })
            })
        })

        it("Clear wipe contract requests without auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + contractUuidW + "/" + API.Requests,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Clear wipe contract requests with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + contractUuidW + "/" + API.Requests,
                headers: {
                    authorization: "Bearer wqe",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Clear wipe contract requests with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + contractUuidW + "/" + API.Requests,
                headers: {
                    authorization: "",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Clear wipe contract requests", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + contractUuidR,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: contractUuidW
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0)).to.not.exist;
                    expect(response.body.at(1)).to.not.exist;
                })
            })
        })
    })
});
