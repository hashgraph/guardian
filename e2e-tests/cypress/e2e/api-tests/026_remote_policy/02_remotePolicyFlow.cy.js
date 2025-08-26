import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";
import * as Checks from "../../../support/checkingMethods";

//context("Policies", { tags: ['remote_policy', 'secondPool', 'all'] }, () => {
context("Policies", { tags: ['remote_policy', 'secondPool', ] }, () => {

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
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                body: {
                    role: "Registrant"
                },
                headers: {
                    "content-type": "binary/octet-stream",
                    authorization,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                Checks.whileRequestAppear(authorization);
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                    body: {
                        document: {
                            field1: {},
                            field2: {},
                            field3: {}
                        },
                        ref: null
                    },
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 180000,
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                })
            })
        })
    })

    it('Application approve', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetApplications,
                headers: {
                    authorization
                }
            }).then((response) => {
                applicationData = response.body.data[0];
                applicationData.option.status = "Approved"
                let appDataBody = JSON.stringify({
                    document: applicationData,
                    tag: "Option_0"
                })
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiMGS + API.Policies + policyId + "/" + API.ApproveApplication,
                    headers: {
                        authorization,
                        "content-type": "application/json"
                    },
                    body: appDataBody
                })
            })
        })
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            Checks.whileRequestAppear(authorization);
        })
    })

    it('Create device', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetApplications,
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
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                        headers: {
                            authorization
                        },
                        body: {
                            document: {
                                field0: response.body.did,
                                field3: {},
                                field4: {},
                                field5: {}
                            },
                            ref: applicationData
                        }
                    })
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                })
            })
        })
    })

    it('Device approve', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetDevices,
                headers: {
                    authorization
                }
            }).then((response) => {
                deviceBody = response.body;
                let data = deviceBody.data[deviceBody.data.length - 1]
                data[optionKey].status = "Approved"
                let appDataBody = JSON.stringify({
                    document: data,
                    tag: "Option_0"
                })
                //Approve device
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiMGS + API.Policies + policyId + "/" + API.ApproveDevice,
                    headers: {
                        authorization,
                        "content-type": "application/json"
                    },
                    body: appDataBody
                })
            })
        })
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            Checks.whileRequestAppear(authorization);
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
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.CreateIssue,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: {
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
                        }
                    })
                    Checks.whileRequestAppear(authorization);
                    Checks.whileRequestAppear(authorization);
                })
            })
        })
    })

    it('Issue approve', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiMGS + API.Policies + policyId + "/" + API.GetIssues,
                headers: {
                    authorization
                }
            }).then((response) => {
                issueRow = response.body.data
                issueRow = issueRow[issueRow.length - 1]
                issueRow[optionKey].status = "Approved"
                issueRow = JSON.stringify({
                    document: issueRow,
                    tag: "Option_0"
                })
                //Approve issue
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiMGS + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                    headers: {
                        authorization,
                        "content-type": "application/json"
                    },
                    body: issueRow
                })
            })
        })
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            Checks.whileRequestAppear(authorization);
        })
    })

    it('Balance approve', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization
                }
            }).then((response) => {
                expect(response.body[0].balance).to.eq("1");
            })
        })
    })
});
