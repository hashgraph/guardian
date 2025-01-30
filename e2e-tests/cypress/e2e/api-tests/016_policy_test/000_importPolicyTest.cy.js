import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Import policy test', { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;


    before('Import policy and dry-run it', () => {
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
        })
    });

    it('Import a new policy test', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("iRecFullFlow.record", 'binary')
                .then((file) => Cypress.Blob.binaryStringToBlob(file))
                .then((blob) => {
                    var formdata = new FormData();
                    formdata.append("tests", blob, "iRecFullFlow.record");
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Test,
                        body: formdata,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        expect(JSON.parse(new TextDecoder().decode(response.body)).at(0).policyId).to.eq(policyId);
                    });
                });
        })
    })

    it("Import a new policy test without auth token - Negative", () => {
        cy.fixture("iRecFullFlow.record", 'binary')
            .then((file) => Cypress.Blob.binaryStringToBlob(file))
            .then((blob) => {
                var formdata = new FormData();
                formdata.append("tests", blob, "iRecFullFlow.record");
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Test,
                    body: formdata,
                    headers: {
                        "content-type": "binary/octet-stream",
                    },
                    failOnStatusCode: false,
                    timeout: 180000,
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
                });
            });
    });

    it("Import a new policy test with invalid auth token - Negative", () => {
        cy.fixture("iRecFullFlow.record", 'binary')
            .then((file) => Cypress.Blob.binaryStringToBlob(file))
            .then((blob) => {
                var formdata = new FormData();
                formdata.append("tests", blob, "iRecFullFlow.record");
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Test,
                    body: formdata,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "Bearer wqe",
                    },
                    failOnStatusCode: false,
                    timeout: 180000,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    });

    it("Import a new policy test with empty auth token - Negative", () => {
        cy.fixture("iRecFullFlow.record", 'binary')
            .then((file) => Cypress.Blob.binaryStringToBlob(file))
            .then((blob) => {
                var formdata = new FormData();
                formdata.append("tests", blob, "iRecFullFlow.record");
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Test,
                    body: formdata,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization: "",
                    },
                    failOnStatusCode: false,
                    timeout: 180000,
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
                });
            });
    });

    it("Import a new policy test without policy test file", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.Test,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
                timeout: 180000,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.BAD_REQUEST);
            });
        });
    })
})
