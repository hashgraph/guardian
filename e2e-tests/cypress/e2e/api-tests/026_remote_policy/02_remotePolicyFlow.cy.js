import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";
import * as Checks from "../../../support/checkingMethods";

context("Policies", { tags: ['remote_policy', 'secondPool', 'all'] }, () => {

    const MainSRUsername = Cypress.env('MainSRUser');
    const DepUserUsername = Cypress.env('DepUser');
    const MGSAdminUsername = Cypress.env('MGSAdmin');
    const tenantName = "testTenantFromOS";

    let policyId, tenantId;

    it("Get tenant id", () => {
        Authorization.getAccessTokenMGS(MGSAdminUsername, null).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiMGS + API.TenantsUser,
                headers: {
                    authorization,
                },
                body: {
                    "pageSize": 10,
                    "pageIndex": 0,
                    "sortDirection": "desc"
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.tenants.forEach(element => {
                    if (element.tenantName == tenantName) {
                        tenantId = element.id
                    }
                })
            })
        })
    });

    it("Get policy id", () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                qs: {
                    type: "remote"
                },
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.name == "iRec2ForRemote") {
                        policyId = element.id;
                    }
                })
            })
        })
    });

    it('Registrant register', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {            
            cy.task('fireAndForget', {
                url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                method: METHOD.POST,
                data: { role: "Registrant" },
                headers: { 'Content-Type': 'application/json', authorization }
            });
            Checks.whileRequestAppear(authorization);
            const waitCreateApplication = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                failOnStatusCode: false
            }
            Checks.whileRequestProccessing(waitCreateApplication, "Registrant Application", "uiMetaData.title")
            cy.task('fireAndForget', {
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                method: METHOD.POST,
                data: {
                    document: {
                        field1: {},
                        field2: {},
                        field3: {}
                    },
                    ref: null
                },
                headers: { 'Content-Type': 'application/json', authorization }
            });
            Checks.whileRequestAppear(authorization);
            Checks.whileRequestAppear(authorization);
            Checks.whileRequestAppear(authorization);
        })
    })

    it('Application approve', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            const waitProjectApproveStatus = {
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetApplications,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }
            Checks.whileRequestProccessing(waitProjectApproveStatus, "Waiting for approval", "data.0.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetApplications,
                headers: {
                    authorization
                }
            }).then((response) => {
                let applicationData = response.body.data[0];
                applicationData.option.status = "Approved"
                cy.task('fireAndForget', {
                    url: API.ApiMGS + API.Policies + policyId + "/" + API.ApproveApplication,
                    method: METHOD.POST,
                    data: {
                        document: applicationData,
                        tag: "Option_0"
                    },
                    headers: { 'Content-Type': 'application/json', authorization }
                });
            })
        })
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            Checks.whileRequestAppear(authorization);
        })
    })

    it('Create device', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            const waitDeviceAddStatus = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                headers: {
                    authorization
                },
                failOnStatusCode: false
            }
            Checks.whileRequestProccessing(waitDeviceAddStatus, "Approved", "data.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                headers: {
                    authorization
                }
            }).then((response) => {
                let applicationData = response.body.data[0];
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Profiles + DepUserUsername,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    cy.task('fireAndForget', {
                        url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                        method: METHOD.POST,
                        data: {
                            document: {
                                field0: response.body.did,
                                field3: {},
                                field4: {},
                                field5: {}
                            },
                            ref: applicationData
                        },
                        headers: { 'Content-Type': 'application/json', authorization }
                    });
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                })
            })
        })
    })

    it('Device approve', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            const waitDeviceApproveStatus = {
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetDevices,
                headers: {
                    authorization
                },
                failOnStatusCode: false
            }
            Checks.whileRequestProccessing(waitDeviceApproveStatus, "Waiting for approval", "data.0.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetDevices,
                headers: {
                    authorization
                }
            }).then((response) => {
                let deviceBody = response.body;
                let data = deviceBody.data[deviceBody.data.length - 1]
                data.option.status = "Approved"
                let appDataBody = {
                    document: data,
                    tag: "Option_0"
                }
                //Approve device
                cy.task('fireAndForget', {
                    url: API.ApiMGS + API.Policies + policyId + "/" + API.ApproveDevice,
                    method: METHOD.POST,
                    data: appDataBody,
                    headers: { 'Content-Type': 'application/json', authorization }
                });
            })
        })
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            Checks.whileRequestAppear(authorization);
            const waitDeviceApproveStatus = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                headers: {
                    authorization
                },
                failOnStatusCode: false
            }
            Checks.whileRequestProccessing(waitDeviceApproveStatus, "Approved", "data.0.option.status")
        })
    })

    it('Create issue', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                headers: {
                    authorization
                }
            }).then((response) => {
                let obj = response.body
                let device_issue_row = obj.data[obj.data.length - 1]
                let credDid = response.body.data[0].document.credentialSubject[0].id
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Profiles + DepUserUsername,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    //Create issue and wait while it in progress
                    cy.task('fireAndForget', {
                        url: API.ApiServer + API.Policies + policyId + "/" + API.CreateIssue,
                        method: METHOD.POST,
                        data: {
                            document: {
                                field0: response.body.did,
                                field1: credDid,
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 1,
                                field8: "2024-03-02",
                                field17: DepUserUsername,
                                field18: response.body.hederaAccountId
                            },
                            ref: device_issue_row
                        },
                        headers: { 'Content-Type': 'application/json', authorization }
                    });
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                })
            })
        })
    })

    it('Issue approve', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            const waitDeviceApproveStatus = {
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetIssues,
                headers: {
                    authorization
                },
                failOnStatusCode: false
            }
            Checks.whileRequestProccessing(waitDeviceApproveStatus, "Waiting for approval", "data.0.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetIssues,
                headers: {
                    authorization
                }
            }).then((response) => {
                let issueRow = response.body.data
                issueRow = issueRow[issueRow.length - 1]
                issueRow.option.status = "Approved"
                issueRow = {
                    document: issueRow,
                    tag: "Option_0"
                }
                //Approve issue
                cy.task('fireAndForget', {
                    url: API.ApiMGS + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                    method: METHOD.POST,
                    data: issueRow,
                    headers: { 'Content-Type': 'application/json', authorization }
                });
            })
        })
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            Checks.whileRequestAppear(authorization);
        })
    })

    it('Balance approve', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            const waitBalance = {
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization
                }
            }
            Checks.whileRequestProccessing(waitBalance, "1", "0.balance")
        })
    })

    after('Delete MGS Tenant', () => {
        Authorization.getAccessTokenMGS(MGSAdminUsername, null).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiMGS + API.TenantsDelete,
                headers: {
                    authorization,
                },
                body: {
                    tenantId: tenantId,
                    tenantName: tenantName
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            })
        })
    })
})