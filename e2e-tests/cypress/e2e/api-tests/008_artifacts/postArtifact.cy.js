import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Artifacts", { tags: ['artifacts', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let policyId;

    it("Upload artifact", { tags: ['smoke'] }, () => {
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
                cy.fixture("artifactsImport.policy", 'binary')
                    .then((file) => Cypress.Blob.binaryStringToBlob(file))
                    .then((blob) => {
                        var formdata = new FormData();
                        formdata.append("artifacts", blob, "artifactsImport.policy");
                        cy.request({
                            url: API.ApiServer + API.Artifacts + policyId,
                            method: METHOD.POST,
                            headers: {
                                authorization,
                                'Content-Type': 'multipart/form-data'
                            },
                            body: formdata,
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        });
                    })
            });
        })
    });

    it("Upload artifact without auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + policyId,
            method: METHOD.POST,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Upload artifact with invalid auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + policyId,
            method: METHOD.POST,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Upload artifact with empty auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + policyId,
            method: METHOD.POST,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Upload artifact without file - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.at(-1).id;
                cy.request({
                    url: API.ApiServer + API.Artifacts + policyId,
                    method: METHOD.POST,
                    headers: {
                        Authorization: authorization,
                        'content-type': 'multipart/form-data'
                    },
                    failOnStatusCode: false,
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.BAD_REQUEST);
                    // expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                    // expect(response.body.message).to.eq("There are no files to upload");
                });
            })
        })
    })

    it("Upload artifact with invalid policy id - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = "-----";
                cy.fixture("remoteWorkGHGPolicy.policy", 'binary')
                    .then((file) => Cypress.Blob.binaryStringToBlob(file))
                    .then((blob) => {
                        var formdata = new FormData();
                        formdata.append("artifacts", blob, "remoteWorkGHGPolicy.policy");
                        cy.request({
                            url: API.ApiServer + API.Artifacts + policyId,
                            method: METHOD.POST,
                            headers: {
                                Authorization: authorization,
                                'content-type': 'multipart/form-data'
                            },
                            body: formdata,
                            failOnStatusCode: false,
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                            // expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                            // expect(response.body.message).to.eq("There is no appropriate policy or policy is not in DRAFT status");
                        });
                    })
            })
        });
    });
});