import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';
import { seededMessageId } from '../../../support/CustomHelpers/ipfsSeeding';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Policies', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let policyId; let registrantDid; let adminDid; let approverDid; let applicationDocumentId; let deviceDocumentId; let issueDocumentId;

    before('Import policy and dry-run it', () => {
        seededMessageId('policy_for_compare2').then((policyMessageId) => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: { messageId: policyMessageId },
                    headers: {
                        authorization,
                    },
                    timeout: TIMEOUTS.longOperation,
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    policyId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.PUT,
                        url:
                            API.ApiServer + API.Policies + policyId + '/' + API.DryRun,
                        headers: {
                            authorization,
                        },
                        timeout: TIMEOUTS.longOperation,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                    });
                });
            })
        });
    });

    it('Start record', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Record + policyId + '/' + API.RecordStart,
                headers: {
                    authorization
                },
                timeout: TIMEOUTS.backend
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
                url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunUser,
                headers: {
                    authorization
                },
                timeout: TIMEOUTS.backend
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                //Save DIDs
                adminDid = response.body.at(0).did;
                registrantDid = response.body.at(1).did;
                //Login by Registrant
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunLogin,
                    headers: {
                        authorization
                    },
                    body: {
                        did: registrantDid
                    },
                    timeout: TIMEOUTS.backend
                }).then(() => {
                    //Block wait
                    Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.ChooseRegistrantRole, authorization);
                    //Choose registrant role
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.ChooseRegistrantRole,
                        headers: {
                            authorization
                        },
                        body: {
                            group: 'Registrant',
                            label: 'q'
                        },
                        timeout: TIMEOUTS.backend
                    }).then(() => {
                        //Block wait
                        Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.CreateApplication, authorization);
                        //Create application
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.Policies + policyId + '/' + API.CreateApplication,
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
                            timeout: TIMEOUTS.backend
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
                url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunUser,
                headers: {
                    authorization
                },
                timeout: TIMEOUTS.backend
            }).then((response) => {
                approverDid = response.body.at(2).did;
                //Login by Approver
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunLogin,
                    headers: {
                        authorization
                    },
                    body: {
                        did: approverDid
                    },
                    timeout: TIMEOUTS.backend
                }).then(() => {
                    //Block wait
                    Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.ChooseRegistrantRole, authorization);
                    //Choose approver role
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.ChooseRegistrantRole,
                        headers: {
                            authorization
                        },
                        body: {
                            group: 'Approvers',
                            label: ''
                        },
                        timeout: TIMEOUTS.backend
                    }).then(() => {
                        //Get document id for approve
                        Checks.pollUntil({
                            request: {
                                method: METHOD.GET,
                                url: API.ApiServer + API.Policies + policyId + '/' + API.GetApplications,
                                headers: {
                                    authorization
                                },
                                timeout: TIMEOUTS.backend
                            },
                            predicate: (response) => response.body?.data?.at(0) && response,
                            description: 'the application in the registrants grid'
                        }).then((response) => {
                            //Block wait
                            Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.ApproveApplication, authorization);
                            applicationDocumentId = response.body.data.at(0).id
                            //Approve application
                            cy.request({
                                method: METHOD.POST,
                                url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveApplication,
                                headers: {
                                    authorization
                                },
                                body: {
                                    document: {
                                        id: applicationDocumentId
                                    },
                                    status: 'SIGNED'
                                },
                                timeout: TIMEOUTS.backend
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
                url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: registrantDid
                },
                timeout: TIMEOUTS.backend
            }).then(() => {
                //Block wait
                Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.CreateDevice, authorization);
                //Create device
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field0: 'example',
                            field1: '2000-01-01',
                            field2: 'example',
                            field3: {
                                field0: 'example',
                                field1: 'example',
                                field2: 'example',
                                field3: 'example',
                                field4: 'example',
                                field5: 'example',
                                field6: 'example',
                                field7: 'example@email.com',
                                field8: 'example',
                                field9: 'example',
                                field10: 'example'
                            },
                            field4: {
                                field0: 'example',
                                field1: 'example',
                                field2: 'example',
                                field3: 'example',
                                field4: 'example',
                                field5: 'example',
                                field6: 'example',
                                field7: 1,
                                field8: 1,
                                field9: '2000-01-01',
                                field10: 'example',
                                field11: 'example',
                                field12: 'example',
                                field13: 'example'
                            },
                            field5: {
                                field0: 'example',
                                field1: 'example',
                                field2: true,
                                field3: 'example',
                                field4: true,
                                field5: 'example',
                                field6: 'example',
                                field7: 'example',
                                field8: 'example',
                                field9: true,
                                field10: 'example',
                                field11: '2000-01-01',
                                field12: 'example'
                            }
                        }
                    },
                    timeout: TIMEOUTS.backend
                })
            })
        })
    })

    it('Dry-run flow - Approve device', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Login by Approver
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: approverDid
                },
                timeout: TIMEOUTS.backend
            }).then(() => {
                //Get device document id
                Checks.pollUntil({
                    request: {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.GetDevices,
                        headers: {
                            authorization
                        },
                        timeout: TIMEOUTS.backend
                    },
                    predicate: (response) => response.body?.data?.at(0) && response,
                    description: 'the device in the devices grid'
                }).then((response) => {
                    deviceDocumentId = response.body.data.at(0).id
                    //Block wait
                    Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.ApproveDevice, authorization);
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveDevice,
                        headers: {
                            authorization
                        },
                        body: {
                            document: {
                                id: deviceDocumentId
                            },
                            status: 'SIGNED'
                        },
                        timeout: TIMEOUTS.backend
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
                url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: registrantDid
                },
                timeout: TIMEOUTS.backend
            }).then(() => {
                //Block wait
                Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.CreateIssue, authorization);
                //Create issue request
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.CreateIssue,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field0: 'example',
                            field1: 'example',
                            field2: {
                                field0: 'example',
                                field1: 'example',
                                field2: 'example',
                                field3: 'example',
                                field4: 'example',
                                field5: 'example',
                                field6: 'example',
                                field7: 'example@email.com',
                                field8: 'example',
                                field9: 'example',
                                field10: 'example'
                            },
                            field3: {
                                field0: 'example',
                                field1: 'example',
                                field2: 'example',
                                field3: 'example',
                                field4: 'example',
                                field5: 'example',
                                field6: 'example',
                                field7: 1,
                                field8: 1,
                                field9: '2000-01-01',
                                field10: 'example',
                                field11: 'example',
                                field12: 'example',
                                field13: 'example'
                            },
                            field4: 'example',
                            field5: '2000-01-01',
                            field6: '2000-01-01',
                            field7: 1,
                            field8: '2000-01-01',
                            field9: 1,
                            field10: 'example',
                            field11: 'example',
                            field12: 'example',
                            field13: 'example',
                            field14: true,
                            field15: true,
                            field16: true,
                            field17: 'example',
                            field18: 'example'
                        }
                    },
                    timeout: TIMEOUTS.backend
                })
            })
        })
    })

    it('Dry-run flow - Approve issue request', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Login by Approver
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: approverDid
                },
                timeout: TIMEOUTS.backend
            }).then(() => {
                //Get issue document id
                Checks.pollUntil({
                    request: {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.GetIssues,
                        headers: {
                            authorization
                        },
                        timeout: TIMEOUTS.backend
                    },
                    predicate: (response) => response.body?.data?.at(0) && response,
                    description: 'the issue request in the issue requests grid'
                }).then((response) => {
                    issueDocumentId = response.body.data.at(0).id
                    //Block wait
                    Checks.waitForBlockAvailable(API.ApiServer + API.Policies + policyId + '/' + API.ApproveIssueRequestsBtn, authorization);
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization
                        },
                        body: {
                            document: {
                                id: issueDocumentId
                            },
                            status: 'SIGNED'
                        },
                        timeout: TIMEOUTS.backend
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
                url: API.ApiServer + API.Policies + policyId + '/' + API.DryRunLogin,
                headers: {
                    authorization
                },
                body: {
                    did: adminDid
                },
                timeout: TIMEOUTS.backend
            }).then(() => {
                //Get token amount
                Checks.pollUntil({
                    request: {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.GetTokenAmountTag + API.Blocks,
                        headers: {
                            authorization
                        },
                        timeout: TIMEOUTS.backend
                    },
                    predicate: (response) => response.body?.data?.at(0)?.amount === 1 && response,
                    description: 'the minted amount in the VP grid'
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
                url: API.ApiServer + API.Record + policyId + '/' + API.RecordActions,
                headers: {
                    authorization
                },
                timeout: TIMEOUTS.backend
            })
        })
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Record + policyId + '/' + API.RecordStop,
                encoding: null,
                headers: {
                    authorization
                },
                timeout: TIMEOUTS.backend
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, '']);
                cy.writeFile(
                    'cypress/fixtures/recordedDryRunFlow.record',
                    Cypress.Blob.arrayBufferToBinaryString(response.body),
                    'binary'
                );
            })
        })
    })
})
