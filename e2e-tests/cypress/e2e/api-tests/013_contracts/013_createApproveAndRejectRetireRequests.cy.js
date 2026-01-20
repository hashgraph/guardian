
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['policy_labels', 'formulas', 'trustchains', 'contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let contractIdR, contractUuidR, tokenId, policyId, hederaId, poolId, retireRequestId;

    const getRetirePools = (authorization, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RetirePools,
            headers: authorization ? { authorization } : {},
            failOnStatusCode
        });

    const createRetireRequest = (authorization, poolId, body, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetirePools + poolId + "/" + API.Retire,
            headers: authorization ? { authorization, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
            body,
            failOnStatusCode
        });

    const getRetireRequests = (authorization, qs = {}, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RetireRequests,
            headers: authorization ? { authorization } : {},
            qs,
            failOnStatusCode
        });

    const deleteRetireRequest = (authorization, retireRequestId, action = "", failOnStatusCode = true) =>
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireRequests + retireRequestId + (action ? "/" + action : ""),
            headers: authorization ? { authorization } : {},
            failOnStatusCode
        });

    const approveRetireRequest = (authorization, retireRequestId, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireRequests + retireRequestId + "/" + API.Approve,
            headers: authorization ? { authorization } : {},
            failOnStatusCode
        });

    before("Create contracts, policy and register new user", () => {
        //Create retire contract and save id
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
            })

            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.name == "iRec_4") {
                        policyId = element.id
                    }
                })
                //Get token(Irec token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    response.body.forEach(element => {
                        if (element.policyIds.at(0) == policyId) {
                            tokenId = element.tokenId
                        }
                    });
                })
            })
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + 'profiles/' + UserUsername,
                    headers: {
                        authorization,
                    }
                }).should((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK)
                    hederaId = response.body.hederaAccountId;
                })
            })
        })
    })

    describe("Create and cancel retire request", () => {

        it("Create retire request", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                getRetirePools(authorization).then((response) => {
                    poolId = response.body.at(0).id;
                    createRetireRequest(authorization, poolId, [{
                        token: tokenId,
                        count: 1,
                        serials: [1]
                    }]).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {

                Checks.whileRetireRRequestCreating(contractUuidR, authorization, 0)

                getRetireRequests(authorization, { contractId: contractUuidR }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it("Cancel retire request without auth token - Negative", () => {
            deleteRetireRequest(undefined, retireRequestId, "", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        })

        it("Cancel retire request with invalid auth token - Negative", () => {
            deleteRetireRequest("Bearer wqe", retireRequestId, "", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Cancel retire request with empty auth token - Negative", () => {
            deleteRetireRequest("", retireRequestId, "", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Cancel retire request", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                deleteRetireRequest(authorization, retireRequestId, API.Cancel, true).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        })
    })

    describe("Create and unset retire request", () => {

        it("Create retire request", () => {

            Authorization.getAccessToken(UserUsername).then((authorization) => {
                getRetirePools(authorization).then((response) => {
                    poolId = response.body.at(0).id;
                    createRetireRequest(authorization, poolId, [{
                        token: tokenId,
                        count: 1,
                        serials: [1]
                    }]).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {

                Checks.whileRetireRRequestCreating(contractUuidR, authorization, 0)

                getRetireRequests(authorization, { contractId: contractUuidR }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it("Unset retire request without auth token - Negative", () => {
            deleteRetireRequest(undefined, retireRequestId, "", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Unset retire request with invalid auth token - Negative", () => {
            deleteRetireRequest("Bearer wqe", retireRequestId, "", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Unset retire request with empty auth token - Negative", () => {
            deleteRetireRequest("", retireRequestId, "", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Unset retire request", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                deleteRetireRequest(authorization, retireRequestId, "", true).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        })
    })

    describe("Get retire request", () => {

        it("Create retire request", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                getRetirePools(authorization).then((response) => {
                    poolId = response.body.at(0).id;
                    createRetireRequest(authorization, poolId, [{
                        token: tokenId,
                        count: 1,
                        serials: [1]
                    }]).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {

                Checks.whileRetireRRequestCreating(contractUuidR, authorization, 0)

                getRetireRequests(authorization, { contractId: contractUuidR }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it("Get retire request", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                getRetireRequests(authorization, { contractId: contractUuidR }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(contractUuidR)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

        it("Get all retire contracts requests", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                getRetireRequests(authorization).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        });

        it("Get all retire contracts requests without auth token - Negative", () => {
            getRetireRequests(undefined, {}, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all retire contracts requests with invalid auth token - Negative", () => {
            getRetireRequests("Bearer wqe", {}, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all retire contracts requests with empty auth token - Negative", () => {
            getRetireRequests("", {}, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request without auth token - Negative", () => {
            getRetireRequests(undefined, { contractId: contractIdR }, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request with invalid auth token - Negative", () => {
            getRetireRequests("Bearer wqe", { contractId: contractIdR }, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request with empty auth token - Negative", () => {
            getRetireRequests("", { contractId: contractIdR }, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    })

    describe("Approve retire request", () => {

        it("Approve retire request without auth token - Negative", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                getRetireRequests(authorization, { contractId: contractUuidR }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    retireRequestId = response.body.at(0).id;
                })
            })
            approveRetireRequest(undefined, retireRequestId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Approve retire request with invalid auth token - Negative", () => {
            approveRetireRequest("Bearer wqe", retireRequestId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Approve retire request with empty auth token - Negative", () => {
            approveRetireRequest("", retireRequestId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Approve retire request", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                approveRetireRequest(authorization, retireRequestId, true).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        });
    })

    describe("Create and approve retire request without approve", () => {

        before("Set pool", () => {
            //Set pool to retire contract and wait while it in progress
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
                                count: 2
                            }
                        ],
                        immediately: true
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })
            })
        });

        it("Create retire request", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                getRetirePools(authorization).then((response) => {
                    poolId = response.body.at(0).id;
                    createRetireRequest(authorization, poolId, [{
                        token: tokenId,
                        count: 2,
                        serials: [2, 3]
                    }]).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })
        });

        it("Create retire request without auth token - Negative", () => {
            createRetireRequest(undefined, poolId, undefined, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Create retire request with invalid auth token - Negative", () => {
            createRetireRequest("Bearer wqe", poolId, undefined, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Create retire request with empty auth token - Negative", () => {
            createRetireRequest("", poolId, undefined, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Verify balance decreased", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    for (let i = 0; i < response.body.length; i++) {
                        if (response.body.tokenId == tokenId)
                            expect(response.body.balance === "7")
                    }
                })
            })
            //TBD Checking retirement end
        })
    });
})
