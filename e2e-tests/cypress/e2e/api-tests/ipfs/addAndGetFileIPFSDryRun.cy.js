import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("IPFS", { tags: '@ipfs' }, () => {
    
    const authorization = Cypress.env("authorization");
    let cid, policyId;

    before("Import and dry-run policy", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1707125414.999819805" }, //iRec2
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            policyId = response.body.id;
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
    });

    it("Add file from ipfs for dry run mode", () => {
        cy.fixture("testJsonDR.json").then((file) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.IPFSFile + API.DryRun + "/" + policyId,
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

    it("Add file from ipfs for dry run mode without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile + API.DryRun + "/" + policyId,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file from ipfs for dry run mode with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile + API.DryRun + "/" + policyId,
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
            url: API.ApiServer + API.IPFSFile + API.DryRun + "/" + policyId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    
    it("Get file from ipfs for dry run mode", () => {
        cy.fixture("testJsonC id")
            .then((cid) => {
                cid = cid
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.IPFSFile + "/" + cid + API.DryRun,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    let body = JSON.parse(response.body)
                    expect(body.red).eql("rose");
                    expect(body.blue).eql("grass");
                });
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
})