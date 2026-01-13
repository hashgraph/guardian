import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'VM0033'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const PPUser = Cypress.env('PPUser');
    const VVBUser = Cypress.env('VVBUser');

    let tokenId, policyId, SRDid, VVBDid;

    it("Register PP and VVB", () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'accounts/standard-registries/aggregated',
                headers: { authorization }
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.username == SRUsername) SRDid = element.did;
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RandomKey,
                    headers: { authorization },
                }).then((response) => {
                    cy.wait(3000)
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + "profiles/" + PPUser,
                        headers: { authorization },
                        body: {
                            hederaAccountId: response.body.id,
                            hederaAccountKey: response.body.key,
                            parent: SRDid
                        },
                        timeout: 400000,
                    })
                })
            })
        })

        Authorization.getAccessToken(VVBUser).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'accounts/standard-registries/aggregated',
                headers: { authorization }
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.username == SRUsername) SRDid = element.did;
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RandomKey,
                    headers: { authorization },
                }).then((response) => {
                    cy.wait(3000)
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + "profiles/" + VVBUser,
                        headers: { authorization },
                        body: {
                            hederaAccountId: response.body.id,
                            hederaAccountKey: response.body.key,
                            parent: SRDid
                        },
                        timeout: 400000,
                    })
                })
            })
        })
    })

    it("Import, publish, assign policy", () => {
        //Create retire contract and save id
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsg,
                body: { messageId: "1755735271.024933000" }, //VM0033
                headers: {
                    authorization,
                },
                timeout: 1800000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                policyId = response.body.at(0).id;
                Authorization.getAccessToken(SRUsername).then((authorization) => {
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 1800000,
                    })
                })
            })
        })

        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Permissions + API.Users + PPUser + "/" + API.Policies + API.Assign,
                body: {
                    policyIds: [
                        policyId
                    ],
                    assign: true
                },
                headers: {
                    authorization
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            })
        })

        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Permissions + API.Users + VVBUser + "/" + API.Policies + API.Assign,
                body: {
                    policyIds: [
                        policyId
                    ],
                    assign: true
                },
                headers: {
                    authorization
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            })
        })
    })

    it("Token associate and grant kyc", () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'tokens',
                headers: {
                    authorization
                }
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.policyIds.at(0) == policyId) {
                        tokenId = element.tokenId
                    }
                });
                cy.request({
                    method: 'PUT',
                    url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                    headers: {
                        authorization
                    }
                }).then(() => {
                    Authorization.getAccessToken(SRUsername).then((authorization) => {
                        cy.request({
                            method: METHOD.PUT,
                            url:
                                API.ApiServer + API.ListOfTokens + tokenId + "/" + PPUser + "/grant-kyc",
                            headers: { authorization }
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.OK);
                        });
                    });
                })
            })
        })
    })

    it("Register PP in policy and create application", () => {
        //Choose role
        Authorization.getAccessToken(PPUser).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRole,
                headers: {
                    authorization
                },
                body: {
                    role: "Project_Proponent"
                }
            }).then(() => {
                const waitCreateProjectButton = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectBtn,
                    headers: {
                        authorization
                    },
                    failOnStatusCode: false,
                }
                Checks.whileRequestProccessing(waitCreateProjectButton, "New project", "uiMetaData.content")
            })
        })
    })

    it("Register VVB in policy", () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Profiles + VVBUser,
                headers: {
                    authorization
                }
            }).then((response) => {
                VVBDid = response.body.did
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "VVB"
                    }
                })
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateVVB,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field0: "TestingVVBName"
                        },
                        ref: null
                    }
                }).then(() => {
                    const waitProjectApproveStatus = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.NewVVB,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                    }
                    Checks.whileRequestProccessing(waitProjectApproveStatus, "Waiting for approval", "blocks.3.uiMetaData.title")
                })
            })
        })
    })

    it("Create application", () => {
        //Choose role
        Authorization.getAccessToken(PPUser).then((authorization) => {
            cy.fixture("payload.json").then((payload) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: payload.document,
                        ref: null
                    },
                    timeout: 600000
                }).then(() => {
                    const waitProjectAddStatus = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                        timeout: 60000
                    }
                    Checks.whileRequestProccessing(waitProjectAddStatus, "Waiting to be Added", "data.0.option.status")
                })
            })
        })
    })

    it("Approve VVB", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.VVBGrid,
                headers: {
                    authorization
                }
            }).then((response) => {
                let vvbData = response.body.data[0];
                vvbData.option.status = "APPROVED"
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDocs,
                    headers: {
                        authorization
                    },
                    body: {
                        document: vvbData,
                        tag: "Button_0"
                    }
                }).then(() => {
                    const waitVVBApproved = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.VVBGrid,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                        timeout: 60000
                    }
                    Checks.whileRequestProccessing(waitVVBApproved, "APPROVED", "data.0.option.status")
                })
            })
        })
    })

    it("Add project", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjGridVVB,
                headers: {
                    authorization
                }
            }).then((response) => {
                let projData = response.body.data[0];
                projData.option.status = "Waiting to Validate"
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.AddProj,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projData,
                        tag: "Option_0"
                    }
                }).then(() => {
                    const waitProjValidate = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ProjGridVVB,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                        timeout: 60000
                    }
                    Checks.whileRequestProccessing(waitProjValidate, "Waiting to Validate", "data.0.option.status")
                })
            })
        })
    })

    it("Assign project", () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                headers: {
                    authorization
                }
            }).then((response) => {
                let projDataAssign = response.body.data[0];
                projDataAssign.assignedTo = VVBDid;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.AssignVVB,
                    headers: {
                        authorization
                    },
                    body: projDataAssign,
                })
            })
        })
    })

    it("Approve project", () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            const waitProjectValidateStatus = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjGridVVB2,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }
            Checks.whileRequestProccessing(waitProjectValidateStatus, "Waiting to Validate", "data.0.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjGridVVB2,
                headers: {
                    authorization
                }
            }).then((response) => {
                let projDataApprove = response.body.data[0];
                projDataApprove.option.status = "Validated";
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveProjBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projDataApprove,
                        tag: "Button_0"
                    }
                })
            })
        })
    })

    it("Create report", () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            const waitProjectValidated = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                headers: {
                    authorization
                },
                failOnStatusCode: false
            }
            Checks.whileRequestProccessing(waitProjectValidated, "approved_project", "data.0.type")
            cy.request(waitProjectValidated).then((response) => { 
                cy.task('log', response.body.data.length)
            });
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                headers: {
                    authorization
                }
            }).then((response) => {
                let projectDataRef = response.body.data[0];
                cy.fixture("payload.json").then((payload) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.AddReportBtn,
                        headers: {
                            authorization
                        },
                        body: {
                            document: payload.document,
                            ref: projectDataRef
                        },
                        timeout: 600000
                    }).then(() => {
                        const waitReportCreating = {
                            method: METHOD.GET,
                            url: API.ApiServer + API.Policies + policyId + "/" + API.ReportGridPP,
                            headers: {
                                authorization
                            },
                            timeout: 600000,
                            failOnStatusCode: false,
                        }
                        Checks.whileRequestProccessing(waitReportCreating, "Waiting for Verification", "data.0.option.status")
                    })
                })
            })
        })
    })

    it("Assign report", () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ReportGridPP,
                headers: {
                    authorization
                },
                timeout: 120000,
            }).then((response) => {
                let reportAssignData = response.body.data[0];
                reportAssignData.assignedTo = VVBDid;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.AssignVVBMR,
                    headers: {
                        authorization
                    },
                    body: reportAssignData,
                    timeout: 60000
                })
            })
        })
    })

    it("Verify report", () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            const waitProjectValidateStatus = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ReportGridVVB,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }
            Checks.whileRequestProccessing(waitProjectValidateStatus, "Waiting for Verification", "data.0.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ReportGridVVB,
                headers: {
                    authorization
                }
            }).then((response) => {
                let reportVerifyData = response.body.data[0];
                reportVerifyData.option.status = "Verified";
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveReportBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: reportVerifyData,
                        tag: "Button_0"
                    },
                    timeout: 60000
                }).then(() => {
                    const waitReportIsVerifying = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ReportGridVVB,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                        timeout: 60000
                    }
                    Checks.whileRequestProccessing(waitReportIsVerifying, "Verified", "data.0.option.status")
                })
            })
        })
    })

    it("Create validation report", () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            cy.fixture("valrep.json").then((payload) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ProjGridVVB2,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let referenceValidationReport = response.body.data[0];
                    referenceValidationReport.option.status = "Verified";
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.AddValidationReport,
                        headers: {
                            authorization
                        },
                        body: {
                            document: payload,
                            ref: referenceValidationReport
                        },
                        timeout: 60000
                    })
                })
            })
        })
    })

    it("Approve validation report", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const waitValidationReportIsCreating = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ValidationReportsVerra,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }
            Checks.whileRequestProccessing(waitValidationReportIsCreating, "Submitted", "data.0.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ValidationReportsVerra,
                headers: {
                    authorization
                }
            }).then((response) => {
                let reportVerifyData = response.body.data[0];
                cy.task('log', reportVerifyData);
                reportVerifyData["option"]["status"] = "APPROVED";
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveValidationReportBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: reportVerifyData,
                        tag: "Approve_Button_Validation"
                    },
                    timeout: 60000
                })
            })
        })
    })

    it("Create verification report", () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            cy.fixture("verrep.json").then((payload) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ReportGridVVB,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let referenceValidationReport = response.body.data[0];
                    referenceValidationReport.option.status = "Verified";
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.AddVerificationReport,
                        headers: {
                            authorization
                        },
                        body: {
                            document: payload,
                            ref: referenceValidationReport
                        },
                        timeout: 60000
                    })
                })
            })
        })
    })

    it("Approve verification report", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const waitValidationReportIsCreating = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.VerificationReportsVerra,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }
            Checks.whileRequestProccessing(waitValidationReportIsCreating, "Submitted", "data.0.option.status")
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.VerificationReportsVerra,
                headers: {
                    authorization
                }
            }).then((response) => {
                let reportVerifyData = response.body.data[0];
                cy.task('log', reportVerifyData);
                reportVerifyData.option.status = "APPROVED";
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.MintTokenVerra,
                    headers: {
                        authorization
                    },
                    body: {
                        document: reportVerifyData,
                        tag: "Option_0"
                    },
                    timeout: 60000
                })
            })
        })
    })

    it("Create one more project for revoke", () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            cy.fixture("payload.json").then((payload) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: payload.document,
                        ref: null
                    },
                    timeout: 600000
                }).then(() => {
                    const waitProjectAddStatus = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                        timeout: 60000
                    }
                    Checks.whileRequestProccessing(waitProjectAddStatus, "Waiting to be Added", "data.0.option.status")
                })
            })
        })
    })

    it("Reject project", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjGridVVB,
                headers: {
                    authorization
                }
            }).then((response) => {
                let projData = response.body.data[0];
                projData.option.status = {
                    "status": "REJECTED",
                    "comment": [
                        "testRevoke"
                    ]
                }
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.AddProj,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projData,
                        tag: "Option_1"
                    }
                }).then(() => {
                    const waitProjValidate = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ProjGridVVB,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                        timeout: 60000
                    }
                    Checks.whileRequestProccessing(waitProjValidate, "Revoked", "data.1.option.status")
                })
            })
        })

        Authorization.getAccessToken(PPUser).then((authorization) => {
            const waitProjValidate = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
                timeout: 60000
            }
            Checks.whileRequestProccessing(waitProjValidate, "Revoked", "data.2.option.status")
        })
    })

    it("Revoke project", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                headers: {
                    authorization
                }
            }).then((response) => {
                let projData = response.body.data[1];
                projData.option.comment = ["testRevoke"];
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.RevokeProjectPP,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projData,
                        tag: "Button_0"
                    }
                }).then(() => {
                    const waitProjValidate = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ProjectGridPP2,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                        timeout: 60000
                    }
                    Checks.whileRequestProccessing(waitProjValidate, "Revoked", "data.0.option.status")
                })
            })
        })
    })

})