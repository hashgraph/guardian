import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";
import * as Checks from "../../../support/checkingMethods";

context("Savepoints Flow", { tags: ['savepoints', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId, sv1, sv3, sv4, sv5, adminDid, registrantDid;

    before('Get policy id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.name == "iRecDRS") {
                        policyId = element.id
                    }
                })
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DryRunRestart,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                })
            })
        })
    });

    it('Dry-run flow - Create application and first savepoint', () => {
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
                        cy.wait(5000);
                        //Create application
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
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
                        }).then(() => {
                            //Block wait
                            cy.wait(5000);
                            cy.request({
                                method: METHOD.POST,
                                url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint,
                                headers: {
                                    authorization
                                },
                                body: {
                                    "name": "SV1",
                                    "savepointPath": []
                                },
                                timeout: 180000
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                                sv1 = response.body.savepoint.id;
                            })
                        })
                    })
                })
            })
        })
    })

    it('Dry-run flow - Approve application, create second savepoint and restore savepoint', () => {
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
                cy.wait(5000);
                //Get document id for approve
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    //Block wait
                    let appData = response.body.data.at(0)
                    appData.option.status = "Approved"
                    //Approve application
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization
                        },
                        body: {
                            document: appData,
                            tag: "Button_0"
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
                            expect(response.body.data.at(0).option.status).to.eq("Approved")
                            cy.request({
                                method: METHOD.POST,
                                url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint,
                                headers: {
                                    authorization
                                },
                                body: {
                                    "name": "SV2",
                                    "savepointPath": [sv1]
                                },
                                timeout: 180000
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                            })
                            cy.request({
                                method: METHOD.PUT,
                                url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint + sv1,
                                headers: {
                                    authorization
                                },
                                timeout: 180000
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                                cy.wait(5000);
                                cy.request({
                                    method: METHOD.GET,
                                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                                    headers: {
                                        authorization
                                    },
                                    timeout: 180000
                                }).then((response) => {
                                    expect(response.body.data.at(0).option.status).to.eq("Waiting for approval")
                                })
                            })
                        })
                    })
                })
            })
        })
    })

    it('Dry-run flow - Approve application again', () => {
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
                cy.wait(5000);
                //Get document id for approve
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    //Block wait
                    let appData = response.body.data.at(0)
                    appData.option.status = "Approved"
                    //Approve application
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization
                        },
                        body: {
                            document: appData,
                            tag: "Button_0"
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
                            expect(response.body.data.at(0).option.status).to.eq("Approved")
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
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
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

    it('Dry-run flow - Approve device and create third savepoint', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //Login by Approver
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
                //Get device document id
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    let deviceData = response.body.data.at(0)
                    deviceData.option.status = "Approved"
                    //Block wait
                    cy.wait(5000);
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                        headers: {
                            authorization
                        },
                        body: {
                            document: deviceData,
                            tag: "Button_0"
                        },
                        timeout: 180000
                    }).then(() => {
                        //Block wait
                        cy.wait(5000);
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                            headers: {
                                authorization
                            },
                            timeout: 180000
                        }).then((response) => {
                            expect(response.body.data.at(0).option.status).to.eq("Approved")
                            cy.request({
                                method: METHOD.POST,
                                url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint,
                                headers: {
                                    authorization
                                },
                                body: {
                                    "name": "SV3",
                                    "savepointPath": [sv1]
                                },
                                timeout: 180000
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                                sv3 = response.body.savepoint.id;
                            })
                        })
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
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateIssue,
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
                    did: adminDid
                },
                timeout: 180000
            }).then(() => {
                cy.wait(5000);
                //Block wait
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint,
                    headers: {
                        authorization
                    },
                    body: {
                        "name": "SV4",
                        "savepointPath": [sv1, sv3]
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    sv4 = response.body.savepoint.id;
                })
                cy.wait(5000);
                //Get issue document id
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    let issueData = response.body.data.at(0)
                    //Block wait
                    cy.wait(5000);
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization
                        },
                        body: {
                            document: issueData,
                            tag: "Button_0"
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
                    //Block wait
                    cy.wait(5000);
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint,
                        headers: {
                            authorization
                        },
                        body: {
                            "name": "SV5",
                            "savepointPath": [sv1, sv3, sv4]
                        },
                        timeout: 180000
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        sv5 = response.body.savepoint.id;
                    })
                })
            })
        })
    })

    it('Dry-run flow - Restore savepoint and reject mint', () => {
        cy.wait(5000);
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint + sv4,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                cy.wait(5000);
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
                    const waitIssueApproveStatus = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues + "?savepointIds=%5B%22" + sv1 + "%22,%22" + sv3 + "%22,%22" + sv4 + "%22%5D",
                        headers: {
                            authorization
                        },
                        timeout: 180000,
                        failOnStatusCode: false
                    }
                    Checks.whileRequestProccessing(waitIssueApproveStatus, "Waiting for approval", "data.0.option.status")
                    cy.request(waitIssueApproveStatus).then((response) => {
                        let issueData = response.body.data.at(0)
                        issueData.option = { "status": "Rejected", "comment": ["q"] };
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                            headers: {
                                authorization
                            },
                            body: {
                                document: issueData,
                                tag: "Button_1"
                            },
                            timeout: 180000
                        }).then(() => {
                            cy.wait(10000);
                            cy.request({
                                method: METHOD.GET,
                                url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues + "?savepointIds=%5B%22" + sv1 + "%22,%22" + sv3 + "%22,%22" + sv4 + "%22%5D",
                                headers: {
                                    authorization
                                },
                                timeout: 180000
                            }).then((response) => {
                                expect(response.body.data.at(0).option.status).to.eq("Rejected");
                            })
                        })
                    })
                })
            })
        })
    })

    it('Dry-run flow - Restore savepoint and check mint', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint + sv5,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                cy.wait(5000);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.body.data.at(0).option.status).to.eq("Minted");
                })
            })
        })
    })

    it('Dry-run flow - Restore savepoint and check mint status', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Policies + policyId + "/" + API.Savepoint + sv4,
                headers: {
                    authorization
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                cy.wait(10000);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.body.data.at(0).option.status).to.eq("Waiting for approval");
                })
            })
        })
    })
})
