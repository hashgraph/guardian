import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let policyId, fileId, adminDid, registrantDid, topicId, appDetailsSchemaId, schema, fileId2;

    it("Flow for custom logic block - Import and dry run policy", () => {
        //Create retire contract and save id
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("policyForCLBlock.policy", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicisImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 18000000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = JSON.parse(new TextDecoder().decode(response.body)).at(0).id;
                        topicId = JSON.parse(new TextDecoder().decode(response.body)).at(0).topicId;
                        Authorization.getAccessToken(SRUsername).then((authorization) => {
                            cy.request({
                                method: METHOD.PUT,
                                url: API.ApiServer + API.Policies + policyId + "/" + API.DryRun,
                                headers: {
                                    authorization
                                },
                                timeout: 18000000,
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                            });
                        })
                    })
                });
        })
    })

    it('Flow for custom logic block - create application', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Add Registrant
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunUser,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                //Save DIDs
                adminDid = response.body.at(0).did;
                registrantDid = response.body.at(1).did;
                //Login by Registrant
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunLogin,
                    headers: {
                        authorization
                    },
                    body: {
                        did: registrantDid
                    },
                    timeout: 180000
                }).then(() => {
                    //Block wait
                    cy.wait(5000);
                    //Choose registrant role 
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                        headers: {
                            authorization
                        },
                        body: {
                            role: "Registrant"
                        },
                        timeout: 180000
                    }).then(() => {
                        //Block wait
                        cy.fixture("tableField.csv", 'binary')
                            .then((file) => Cypress.Blob.binaryStringToBlob(file))
                            .then((blob) => {
                                var formdata = new FormData();
                                formdata.append("file", blob, "tableField.csv");
                                cy.request({
                                    url: API.ApiServer + API.ArtifactsFiles,
                                    method: METHOD.POST,
                                    headers: {
                                        authorization,
                                        "content-type": "multipart/form-data",
                                    },
                                    body: formdata,
                                }).then((response) => {
                                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                                    fileId = JSON.parse(new TextDecoder().decode(response.body)).fileId;
                                    //Create application
                                    cy.request({
                                        method: METHOD.POST,
                                        url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                                        headers: {
                                            authorization
                                        },
                                        body: {
                                            document: {
                                                field1: {
                                                    field20: JSON.stringify({
                                                        type: "table",
                                                        fileId: fileId
                                                    })
                                                },
                                                field2: {},
                                                field3: {}
                                            },
                                            ref: null
                                        },
                                        timeout: 180000
                                    })
                                })
                            })
                    });
                })
            })
        })
    })

    it('Flow for custom logic block - Verify table field and auto-calculation fields', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: adminDid
                },
                timeout: 180000
            }).then(() => {
                //Block wait
                cy.wait(10000);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    //Block wait
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    expect(JSON.stringify(response.body.data[0].document.credentialSubject[0].field1.field20)).to.eq(JSON.stringify({ type: "table", fileId: fileId }));
                    expect(response.body.data[0].document.credentialSubject[0].field1.field21).to.eq(16);
                })
            })
        })
    })
})