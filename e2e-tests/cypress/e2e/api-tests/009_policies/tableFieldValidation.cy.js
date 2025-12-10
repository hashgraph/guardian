import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let policyId, fileId, adminDid, registrantDid, topicId, appDetailsSchemaId, schema, fileId2;

    it("Flow for table field - Import and dry run policy", () => {
        //Create retire contract and save id
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("policyForTableField.policy", "binary")
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

    it('Flow for table field - create application', () => {
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
                                                    }),
                                                    field21: 10
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

    it('Flow for table field - Verify table field and auto-calculation fields', () => {
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
                cy.wait(5000);
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
                    expect(response.body.data[0].document.credentialSubject[0].field1.field20).to.eq(JSON.stringify({ type: "table", fileId: fileId }));
                    expect(response.body.data[0].document.credentialSubject[0].field1.field21).to.eq(10);
                    expect(response.body.data[0].document.credentialSubject[0].field1.field22).to.eq(71);
                    expect(response.body.data[0].document.credentialSubject[0].field1.field23).to.eq(81);


                })
            })
        })
    })

    it('Flow for table field - Change “Allow multiple answers checkbox” property and rerun dryrun', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Policies + policyId + "/" + API.Draft,
                headers: {
                    authorization
                },
                timeout: 18000000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Schemas,
                    qs: {
                        category: "POLICY",
                        topicId: topicId
                    },
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    response.body.forEach(schema => {
                        if (schema.name === "Applicant Details") {
                            appDetailsSchemaId = schema.id;
                            console.log(schema.id)
                        }
                    })
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.Schemas + API.SchemasWithSubSchemas,
                        headers: {
                            authorization,
                        },
                        qs: {
                            category: "POLICY",
                            schemaId: appDetailsSchemaId,
                            topicId: topicId
                        }
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        schema = response.body.schema;
                        schema.document.properties.field20.type = "array";
                        schema.document.properties.field20.items = { "type": "string" };
                        delete schema.documentFileId;
                        cy.request({
                            method: METHOD.PUT,
                            url: API.ApiServer + API.Schemas,
                            headers: {
                                authorization,
                            },
                            body: schema
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.OK);
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
            });
        });
    })

    it('Flow for table field - create application with multiple answers', () => {
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
                                        fileId2 = JSON.parse(new TextDecoder().decode(response.body)).fileId;
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
                                                        field20: [
                                                            JSON.stringify({
                                                                type: "table",
                                                                fileId: fileId
                                                            }),
                                                            JSON.stringify({
                                                                type: "table",
                                                                fileId: fileId2
                                                            })
                                                        ],
                                                        field21: 10
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
    })

    it('Flow for table field - Verify table field and auto-calculation fields with multiple answers', () => {
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
                cy.wait(5000);
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
                    expect(response.body.data[0].document.credentialSubject[0].field1.field20[0]).to.eq(JSON.stringify({ type: "table", fileId: fileId }));
                    expect(response.body.data[0].document.credentialSubject[0].field1.field20[1]).to.eq(JSON.stringify({ type: "table", fileId: fileId2 }));
                    expect(response.body.data[0].document.credentialSubject[0].field1.field21).to.eq(10);
                    expect(response.body.data[0].document.credentialSubject[0].field1.field22).to.eq(0);
                    expect(response.body.data[0].document.credentialSubject[0].field1.field23).to.eq(10);
                })
            })
        })
    })
})