import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Policies', { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId, registrantDid, adminDid, approverDid, applicationDocumentId, deviceDocumentId, issueDocumentId;

    before('Import policy and dry-run it', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsg,
                body: { messageId: "1707126709.066208559" }, //iRec5
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

    it('Start record', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Record + policyId + "/" + API.RecordStart,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            })
        })
    })

    it('Dry-run flow - Create application', () => {
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
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRoleTag + API.Blocks,
                        headers: {
                            authorization
                        },
                        body: {
                            group: "Registrant",
                            label: "q"
                        },
                        timeout: 180000
                    }).then(() => {
                        //Block wait
                        cy.wait(5000);
                        //Create application
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplicationTag + API.Blocks,
                            headers: {
                                authorization
                            },
                            body: {
                                document: {
                                    field1: {},
                                    field2: {},
                                    field3: {}
                                },
                                ref: null
                            },
                            timeout: 180000
                        })
                    })
                })
            })
        })
    })

    it('Dry-run flow - Approve application', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Add Approver
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunUser,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                approverDid = response.body.at(2).did;
                //Login by Approver
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunLogin,
                    headers: {
                        authorization
                    },
                    body: {
                        did: approverDid
                    },
                    timeout: 180000
                }).then(() => {
                    //Block wait
                    cy.wait(5000);
                    //Choose approver role
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRoleTag + API.Blocks,
                        headers: {
                            authorization
                        },
                        body: {
                            group: "Approvers",
                            label: ""
                        },
                        timeout: 180000
                    }).then(() => {
                        //Get document id for approve
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.Policies + policyId + "/" + API.RegistrantGrid + API.Blocks,
                            headers: {
                                authorization
                            },
                            timeout: 180000
                        }).then((response) => {
                            //Block wait
                            cy.wait(5000);
                            applicationDocumentId = response.body.data.at(0).id
                            //Approve application
                            cy.request({
                                method: METHOD.POST,
                                url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplicationTag + API.Blocks,
                                headers: {
                                    authorization
                                },
                                body: {
                                    document: {
                                        id: applicationDocumentId
                                    },
                                    status: "SIGNED"
                                },
                                timeout: 180000
                            })
                        })
                    })
                })
            })
        })
    })

    it('Dry-run flow - Create device', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                //Create device
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDeviceTag + API.Blocks,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field0: "example",
                            field1: "2000-01-01",
                            field2: "example",
                            field3: {
                                field0: "example",
                                field1: "example",
                                field2: "example",
                                field3: "example",
                                field4: "example",
                                field5: "example",
                                field6: "example",
                                field7: "example@email.com",
                                field8: "example",
                                field9: "example",
                                field10: "example"
                            },
                            field4: {
                                field0: "example",
                                field1: "example",
                                field2: "example",
                                field3: "example",
                                field4: "example",
                                field5: "example",
                                field6: "example",
                                field7: 1,
                                field8: 1,
                                field9: "2000-01-01",
                                field10: "example",
                                field11: "example",
                                field12: "example",
                                field13: "example"
                            },
                            field5: {
                                field0: "example",
                                field1: "example",
                                field2: true,
                                field3: "example",
                                field4: true,
                                field5: "example",
                                field6: "example",
                                field7: "example",
                                field8: "example",
                                field9: true,
                                field10: "example",
                                field11: "2000-01-01",
                                field12: "example"
                            }
                        }
                    },
                    timeout: 180000
                })
            })
        })
    })

    it('Dry-run flow - Approve device', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Login by Approver
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: approverDid
                },
                timeout: 180000
            }).then(() => {
                //Block wait
                cy.wait(5000);
                //Get device document id
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid + API.Blocks,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    deviceDocumentId = response.body.data.at(0).id
                    //Block wait
                    cy.wait(5000);
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDeviceTag + API.Blocks,
                        headers: {
                            authorization
                        },
                        body: {
                            document: {
                                id: deviceDocumentId
                            },
                            status: "SIGNED"
                        },
                        timeout: 180000
                    })
                })
            })
        })
    })

    it('Dry-run flow - Create issue request', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                //Create issue request
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateIssueTag + API.Blocks,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field0: "example",
                            field1: "example",
                            field2: {
                                field0: "example",
                                field1: "example",
                                field2: "example",
                                field3: "example",
                                field4: "example",
                                field5: "example",
                                field6: "example",
                                field7: "example@email.com",
                                field8: "example",
                                field9: "example",
                                field10: "example"
                            },
                            field3: {
                                field0: "example",
                                field1: "example",
                                field2: "example",
                                field3: "example",
                                field4: "example",
                                field5: "example",
                                field6: "example",
                                field7: 1,
                                field8: 1,
                                field9: "2000-01-01",
                                field10: "example",
                                field11: "example",
                                field12: "example",
                                field13: "example"
                            },
                            field4: "example",
                            field5: "2000-01-01",
                            field6: "2000-01-01",
                            field7: 1,
                            field8: "2000-01-01",
                            field9: 1,
                            field10: "example",
                            field11: "example",
                            field12: "example",
                            field13: "example",
                            field14: true,
                            field15: true,
                            field16: true,
                            field17: "example",
                            field18: "example"
                        }
                    },
                    timeout: 180000
                })
            })
        })
    })

    it('Dry-run flow - Approve issue request', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Login by Approver
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: approverDid
                },
                timeout: 180000
            }).then(() => {
                //Block wait
                cy.wait(5000);
                //Get issue document id
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueGrid + API.Blocks,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    issueDocumentId = response.body.data.at(0).id
                    //Block wait
                    cy.wait(5000);
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueTag + API.Blocks,
                        headers: {
                            authorization
                        },
                        body: {
                            document: {
                                id: issueDocumentId
                            },
                            status: "SIGNED"
                        },
                        timeout: 180000
                    })
                })
            })
        })
    })

    it('Dry-run flow - Get token ammount', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Login by Administrator
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
                //Get token amount
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetTokenAmountTag + API.Blocks,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.body.data.at(0).amount).to.eq(1)
                })
            })
        })
    })

    it('Stop record', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Record + policyId + "/" + API.RecordActions,
                headers: {
                    authorization
                },
                timeout: 180000
            })
        })
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Record + policyId + "/" + API.RecordStop,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, ""]);
                let record = Cypress.Blob.arrayBufferToBinaryString(
                    response.body
                );
                cy.writeFile(
                    "cypress/fixtures/recordedDryRunFlow.record",
                    record,
                    "binary"
                );
            })
        })
    })
})
