import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['policy_labels', 'formulas', 'trustchains', 'contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let contractIdR, contractUuidR, tokenId, policyId, hederaId, poolId, retireRequestId;

    before("Create contracts, policy and register new user", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            // Get Retire Contract
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: { authorization },
                qs: { "type": "RETIRE" },
                timeout: 180000
            }).then((response) => {
                contractIdR = response.body.at(0).id;
                contractUuidR = response.body.at(0).contractId;
            });

            // Get Policy and Token
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: { authorization },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.find(el => el.name === "iRec_4")?.id;

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: { authorization },
                }).then((response) => {
                    tokenId = response.body.find(el => el.policyIds.at(0) === policyId)?.tokenId;
                });
            });

            // Get User Profile
            Authorization.getAccessToken(UserUsername).then((userAuth) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + 'profiles/' + UserUsername,
                    headers: { authorization: userAuth }
                }).then((response) => {
                    hederaId = response.body.hederaAccountId;
                });
            });
        });
    });

    describe("Create and cancel retire request", () => {
        it("Create retire request", () => {
            Authorization.getAccessToken(UserUsername).then((userAuth) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetirePools,
                    headers: { authorization: userAuth }
                }).then((response) => {
                    poolId = response.body.at(0).id;
                    cy.createRetireAction(userAuth, poolId, tokenId, 1, [1]).then((res) => {
                        expect(res.status).eql(STATUS_CODE.OK);
                    });
                });
            });

            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                Checks.whileRetireRRequestCreating(contractUuidR, srAuth, 0);
                cy.getRetireRequests(srAuth, contractUuidR).then((response) => {
                    retireRequestId = response.body.at(0).id;
                    expect(response.body.at(0).user).eql(hederaId);
                });
            });
        });

        it("Cancel retire request without auth token - Negative", () => {
            cy.deleteRetireRequest(null, retireRequestId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Cancel retire request with invalid auth token - Negative", () => {
            cy.deleteRetireRequest("Bearer wqe", retireRequestId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Cancel retire request with empty auth token - Negative", () => {
            cy.deleteRetireRequest("", retireRequestId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Cancel retire request", () => {
            Authorization.getAccessToken(UserUsername).then((userAuth) => {
                cy.deleteRetireRequest(userAuth, retireRequestId, API.Cancel).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            });
        });
    });

    describe("Create and unset retire request", () => {
        it("Create retire request", () => {
            Authorization.getAccessToken(UserUsername).then((userAuth) => {
                cy.createRetireAction(userAuth, poolId, tokenId, 1, [1]).then((res) => {
                    expect(res.status).eql(STATUS_CODE.OK);
                });
            });

            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                Checks.whileRetireRRequestCreating(contractUuidR, srAuth, 0);
                cy.getRetireRequests(srAuth, contractUuidR).then((response) => {
                    retireRequestId = response.body.at(0).id;
                });
            });
        });

        it("Unset retire request without auth token - Negative", () => {
            cy.deleteRetireRequest(null, retireRequestId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Unset retire request with invalid auth token - Negative", () => {
            cy.deleteRetireRequest("Bearer wqe", retireRequestId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Unset retire request with empty auth token - Negative", () => {
            cy.deleteRetireRequest("", retireRequestId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Unset retire request", () => {
            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                cy.deleteRetireRequest(srAuth, retireRequestId).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            });
        });
    });

    describe("Get retire request", () => {
        it("Create retire request", () => {
            Authorization.getAccessToken(UserUsername).then((userAuth) => {
                cy.createRetireAction(userAuth, poolId, tokenId, 1, [1]);
            });
            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                Checks.whileRetireRRequestCreating(contractUuidR, srAuth, 0);
                cy.getRetireRequests(srAuth, contractUuidR).then((response) => {
                    retireRequestId = response.body.at(0).id;
                });
            });
        });

        it("Get retire request", () => {
            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                cy.getRetireRequests(srAuth, contractUuidR).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(contractUuidR);
                    expect(response.body.at(0).user).eql(hederaId);
                });
            });
        });

        it("Get all retire contracts requests", () => {
            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                cy.getRetireRequests(srAuth).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            });
        });

        it("Get all retire contracts requests without auth token - Negative", () => {
            cy.getRetireRequests(null).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all retire contracts requests with invalid auth token - Negative", () => {
            cy.getRetireRequests("Bearer wqe").then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all retire contracts requests with empty auth token - Negative", () => {
            cy.getRetireRequests("").then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request without auth token - Negative", () => {
            cy.getRetireRequests(null, contractUuidR).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request with invalid auth token - Negative", () => {
            cy.getRetireRequests("Bearer wqe", contractUuidR).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request with empty auth token - Negative", () => {
            cy.getRetireRequests("", contractUuidR).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    describe("Approve retire request", () => {
        it("Approve retire request without auth token - Negative", () => {
            cy.postRetireRequestAction(null, retireRequestId, API.Approve).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Approve retire request with invalid auth token - Negative", () => {
            cy.postRetireRequestAction("Bearer wqe", retireRequestId, API.Approve).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Approve retire request with empty auth token - Negative", () => {
            cy.postRetireRequestAction("", retireRequestId, API.Approve).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Approve retire request", () => {
            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                cy.postRetireRequestAction(srAuth, retireRequestId, API.Approve).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            });
        });
    });

    describe("Create and approve retire request without approve", () => {
        before("Set pool", () => {
            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                cy.request({
                    method: METHOD.POST,
                    url: `${API.ApiServer}${API.RetireContract}${contractIdR}/${API.PoolContract}`,
                    headers: { authorization: srAuth },
                    body: { tokens: [{ token: tokenId, count: 2 }], immediately: true }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            });
        });

        it("Create retire request", () => {
            Authorization.getAccessToken(UserUsername).then((userAuth) => {
                cy.createRetireAction(userAuth, poolId, tokenId, 2, [2, 3]).then((res) => {
                    expect(res.status).eql(STATUS_CODE.OK);
                });
            });
        });

        it("Create retire request without auth token - Negative", () => {
            cy.createRetireAction(null, poolId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Create retire request with invalid auth token - Negative", () => {
            cy.createRetireAction("Bearer wqe", poolId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Create retire request with empty auth token - Negative", () => {
            cy.createRetireAction("", poolId).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Verify balance decreased", () => {
            Authorization.getAccessToken(SRUsername).then((srAuth) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: { authorization: srAuth },
                }).then((response) => {
                    const token = response.body.find(t => t.tokenId === tokenId);
                    expect(token.balance).to.eq("7");
                });
            });
        });
    });
    
});