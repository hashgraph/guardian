import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: "@artifacts" }, () => {
    const authorization = Cypress.env("authorization");
    let policyId

    before(() => {
        cy.fixture("remoteWorkGHGPolicy.policy", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 300000,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                });
            })
    });

    it("Upload artifact", () => {
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
    });

    it("Upload artifact without auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + policyId,
            method: METHOD.POST,
            failOnStatusCode:false,
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
            failOnStatusCode:false,
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
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Upload artifact without file - Negative", () => {
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
                failOnStatusCode:false,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.BAD_REQUEST);
                // expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                // expect(response.body.message).to.eq("There are no files to upload");
            });
        })
    })

    it("Upload artifact with invalid policy id - Negative", () => {
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
                        failOnStatusCode:false,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.ERROR);
                        // expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                        // expect(response.body.message).to.eq("There is no appropriate policy or policy is not in DRAFT status");
                    });
                })
        });
    });
});
