import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let policyId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsg,
                body: { messageId: "1707125414.999819805" }, //iRec2
                headers: {
                    authorization,
                },
                timeout: 600000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                policyId = response.body.at(0).id;
            });
        })
    });

    it("Run policy without making any persistent changes or executing transaction", { tags: ['analytics', 'schema', 'tokens', 'smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url:
                    API.ApiServer + API.Policies + policyId + "/" + API.DryRun,
                headers: {
                    authorization,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get all virtual users", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url:
                    API.ApiServer + API.Policies + policyId + "/" + API.DryRun + API.Users,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get lists of virtual transactions", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url:
                    API.ApiServer + API.Policies + policyId + "/dry-run/transactions",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get lists of virtual artifacts", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url:
                    API.ApiServer + API.Policies + policyId + "/dry-run/artifacts",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get lists of virtual ipfs", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url:
                    API.ApiServer + API.Policies + policyId + "/" + API.DryRun + API.IPFS,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Create a new virtual account and login", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url:
                    API.ApiServer + API.Policies + policyId + "/dry-run/user",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                const did = response.body[0].did;

                cy.request({
                    method: METHOD.POST,
                    url:
                        API.ApiServer + "policies/" + policyId + "/dry-run/login",
                    body: {
                        did: did,
                    },
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                });
            });
        })
    });

    it("should restarts the execution of the policy and clear data in database", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url:
                    API.ApiServer + API.Policies + policyId + "/dry-run/restart",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });
});
