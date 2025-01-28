import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("IPFS", { tags: ['ipfs', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let cid, policyId;

    before("Import and dry-run policy", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.at(0).id;
                cy.request({
                    method: METHOD.PUT,
                    url:
                        API.ApiServer + API.Policies + policyId + "/" + API.DryRun,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                });
            });
        })
    });

    it("Add file from ipfs for dry run mode", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("testJsonDR.json").then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.IPFSFile + API.DryRun + policyId,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 200000
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    cy.writeFile(
                        "cypress/fixtures/testJsonDRCid",
                        response.body
                    );

                });
            })
        })
    })

    it("Add file from ipfs for dry run mode without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile + API.DryRun + policyId,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file from ipfs for dry run mode with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile + API.DryRun + policyId,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file from ipfs for dry run mode with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile + API.DryRun + policyId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs for dry run mode", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("testJsonDRCid")
                .then((cid) => {
                    cid = cid
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.IPFSFile + cid + "/" + API.DryRun,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        let body = JSON.parse(response.body)
                        expect(body.red).eql("rose");
                        expect(body.blue).eql("sky");
                    });
                })
        })
    });

    it("Get file from ipfs for dry run mode without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.IPFSFile + cid,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs for dry run mode with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.IPFSFile + cid,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs for dry run mode with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.IPFSFile + cid,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    })

    after("Stop dry-run policy", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url:
                    API.ApiServer + API.Policies + policyId + "/" + API.Draft,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        })
    })
})