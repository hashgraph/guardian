import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let contractNameR = Math.floor(Math.random() * 999) + "RCon4RequestsTests";
    let contractNameW = Math.floor(Math.random() * 999) + "WCon4RequestsTests";
    const optionKey = "option"
    let wContractId, rContractId, tokenId, tokenId2, policyId, hederaId, rConractUuid
    let waitForApproveApplicationBlockId, deviceGridBlockId, issueRequestGridBlockId, approveRegistrantBtnBlockId

    describe("Flow for one NFT token and get requests", () => {
        //Flow with one NFT token
        before("Create contracts, policy and register new user", () => {
            //Create retire contract and save id
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameR,
                        "type": "RETIRE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    rContractId = response.body.contractId;
                    rConractUuid = response.body.id;
                });

                //Create wipe contract and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameW,
                        "type": "WIPE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    wContractId = response.body.contractId;
                });

                //Import policy and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenId: tokenId,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })

                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ContractPermissions + API.Users + username + "/" + API.Policies + API.Assign,
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

        before("Get blocks for waiting(approve app, device grid, issue grid) and token id", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                })
            })
        })

        before("Mint token", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let applicationData
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })
            //Get devices data and prepare body for approve
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let deviceBody
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

                //Get issue data and prepare body for create
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

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
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })

                //Get issue data and prepare body for approve
                let issueRow
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })

                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)
            })

            //Wait while balance updating
            Authorization.getAccessToken(UserUsername).then((authorization) => {

                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })
        })

        before("Set pool", () => {
            //Set pool to retire contract and wait while it in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 1
                            }
                        ],
                        immediately: false
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })

                let requestForWipeRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileWipeRequestCreating(wContractId, requestForWipeRequestCreationProgress, 0)
            })
        })

        it("Get wipe request", { tags: ['smoke'] }, () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(wContractId)
                });
            })
        });

        it("Get retire request", { tags: ['smoke'] }, () => {
            let wipeRequestId, poolId
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    wipeRequestId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            })

            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetirePools,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    poolId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + "/" + API.Retire,
                        headers: {
                            authorization,
                            "Content-Type": "application/json"
                        },
                        body: [{
                            token: tokenId,
                            count: 1,
                            serials: [1]
                        }]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let requestForRetireRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }

                Checks.whileRetireRequestCreating(rContractId, requestForRetireRequestCreationProgress, 0)

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(rContractId)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });
    })

    describe("Flow for two NFT tokens and get requests", () => {

        before("Create contracts, policies, register new user and associate token with him", () => {
            contractNameR = Math.floor(Math.random() * 99999) + "RCon4RequestsTests";
            contractNameW = Math.floor(Math.random() * 99999) + "WCon4RequestsTests";
            //Create retire contract and save id
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameR,
                        "type": "RETIRE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    rContractId = response.body.contractId;
                    rConractUuid = response.body.id;
                });

                //Create wipe contract and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameW,
                        "type": "WIPE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    wContractId = response.body.contractId;
                });

                //Import policy and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec 4 token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenId: tokenId,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })

                //Import second policy to have one more token and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec 5 token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId2 = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenId: tokenId2,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })

                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ContractPermissions + API.Users + username + "/" + API.Policies + API.Assign,
                    body: {
                        policyIds: [
                            policyId,
                            policyId2
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

        before("Get blocks for waiting(approve app, device grid, issue grid) and tokens id", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId2 = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(1).tokenId;
                    tokenId2 = response.body.at(0).tokenId;
                })
            })
        })

        before("Mint tokens", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            let applicationData
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            let deviceBody
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

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
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            let issueRow
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)

                //Wait while balance updating

                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })
        })

        before("Mint second tokens", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateApplication,
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + waitForApproveApplicationBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            let applicationData
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {

                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            let deviceBody
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

                //Get issue data and prepare body for create
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

                    //Create issue and wait while it in progress
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateIssue,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: {
                            document: {
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + issueRequestGridBlockId2,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            let issueRow
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {

                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + issueRequestGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)

                //Wait while balance updating

                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })
        })

        before("Set pool", () => {
            //Set pool to retire contract and wait while it in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 1
                            },
                            {
                                token: tokenId2,
                                count: 2
                            }
                        ],
                        immediately: false
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })

                let requestForWipeRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileWipeRequestCreating(wContractId, requestForWipeRequestCreationProgress, 0)
            })
        })

        it("Get wipe request for two tokens", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(wContractId)
                    expect(response.body.at(0).user).eql(rContractId)
                });
            })
        });

        it("Get retire request two tokens", () => {
            let wipeRequestId, poolId
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    wipeRequestId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            })
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetirePools,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    poolId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + "/" + API.Retire,
                        headers: {
                            authorization,
                            "Content-Type": "application/json"
                        },
                        body: [
                            {
                                token: tokenId,
                                count: 1,
                                serials: [1]
                            },
                            {
                                token: tokenId2,
                                count: 2,
                                serials: [1, 2]
                            }
                        ]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let requestForRetireRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }

                Checks.whileRetireRequestCreating(rContractId, requestForRetireRequestCreationProgress, 0)

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(rContractId)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId || tokenId2)
                    expect(response.body.at(0).tokens.at(0).count).eql(1 || 2)
                    expect(response.body.at(0).tokens.at(1).token).eql(tokenId2 || tokenId)
                    expect(response.body.at(0).tokens.at(1).count).eql(2 || 1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            });
        })
    })

    describe("Flow for one FT token and get requests", () => {

        //Flow with one FT token
        before("Create contracts, policy and register new user", () => {
            contractNameR = Math.floor(Math.random() * 99999) + "RCon4RequestsTests";
            contractNameW = Math.floor(Math.random() * 99999) + "WCon4RequestsTests";
            //Create retire contract and save id
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameR,
                        "type": "RETIRE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    rContractId = response.body.contractId;
                    rConractUuid = response.body.id;
                });

                //Create wipe contract and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameW,
                        "type": "WIPE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    wContractId = response.body.contractId;
                });

                //Import policy and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token and change token type
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenId: tokenId,
                            tokenType: "fungible",
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ContractPermissions + API.Users + username + "/" + API.Policies + API.Assign,
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

        before("Get blocks for waiting(approve app, device grid, issue grid) and token id", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                })
            })
        })

        before("Mint token", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            let applicationData
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            let deviceBody
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

                //Get issue data and prepare body for create
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

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
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            let issueRow
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)

                //Wait while balance updating
                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })
        })

        before("Set pool", () => {
            //Set pool to retire contract and wait while it in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 1
                            }
                        ],
                        immediately: false
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })

                let requestForWipeRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileWipeRequestCreating(wContractId, requestForWipeRequestCreationProgress, 0)
            })

            it("Get wipe request", () => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(wContractId)
                });
            });

            it("Get retire request", () => {
                let wipeRequestId, poolId
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    wipeRequestId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            })
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetirePools,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    poolId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + "/" + API.Retire,
                        headers: {
                            authorization,
                            "Content-Type": "application/json"
                        },
                        body: [{
                            token: tokenId,
                            count: 1,
                            serials: [1]
                        }]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let requestForRetireRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }

                Checks.whileRetireRequestCreating(rContractId, requestForRetireRequestCreationProgress, 0)

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(rContractId)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId)
                    expect(response.body.at(0).tokens.at(0).count).eql(1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });
    })

    describe("Flow for two FT tokens and get requests", () => {

        before("Create contracts, policies, register new user and associate token with him", () => {
            contractNameR = Math.floor(Math.random() * 99999) + "RCon4RequestsTests";
            contractNameW = Math.floor(Math.random() * 99999) + "WCon4RequestsTests";
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                //Create retire contract and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameR,
                        "type": "RETIRE",
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    rContractId = response.body.contractId;
                    rConractUuid = response.body.id;
                });

                //Create wipe contract and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameW,
                        "type": "WIPE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    wContractId = response.body.contractId;
                });

                //Import policy and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec 4 token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenType: "fungible",
                            tokenId: tokenId,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })

                //Import second policy to have one more token and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec 5 token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId2 = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenType: "fungible",
                            tokenId: tokenId2,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ContractPermissions + API.Users + username + "/" + API.Policies + API.Assign,
                    body: {
                        policyIds: [
                            policyId,
                            policyId2
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

        before("Get blocks for waiting(approve app, device grid, issue grid) and tokens id", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.DeviceGrid,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    deviceGridBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    issueRequestGridBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(1).tokenId;
                    tokenId2 = response.body.at(0).tokenId;
                })
            })
        })

        before("Mint tokens", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            let applicationData
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                    headers: {
                        authorization: accessToken
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization: accessToken
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            let deviceBody
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

                //Get issue data and prepare body for create
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

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
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            let issueRow
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                    headers: {
                        authorization
                    }
                }
                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)
                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })
        })

        before("Mint second tokens", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateApplication,
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + waitForApproveApplicationBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            let applicationData
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {

                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            let deviceBody
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

                //Get issue data and prepare body for create
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

                    //Create issue and wait while it in progress
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateIssue,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: {
                            document: {
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + issueRequestGridBlockId2,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            let issueRow
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + issueRequestGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)

                //Wait while balance updating

                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }

                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })

            let requestForBalance = {
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization
                }
            }

            Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
        })

        before("Set pool", () => {
            //Set pool to retire contract and wait while it in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 1
                            },
                            {
                                token: tokenId2,
                                count: 2
                            }
                        ],
                        immediately: false
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })

                let requestForWipeRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileWipeRequestCreating(wContractId, requestForWipeRequestCreationProgress, 0)
            })
        })

        it("Get wipe request for two tokens", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(wContractId)
                    expect(response.body.at(0).user).eql(rContractId)
                });
            })
        });

        it("Get retire request two tokens", () => {
            let wipeRequestId, poolId
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    wipeRequestId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            })

            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccountsLogin,
                body: {
                    username: username,
                    password: "test"
                }
            }).then((response) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.AccessToken,
                    body: {
                        refreshToken: response.body.refreshToken
                    }
                }).then((response) => {
                    let accessToken = "Bearer " + response.body.accessToken
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.RetirePools,
                        headers: {
                            authorization: accessToken
                        }
                    }).then((response) => {
                        poolId = response.body.at(0).id;
                        cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.RetirePools + poolId + "/" + API.Retire,
                            headers: {
                                authorization: accessToken,
                                "Content-Type": "application/json"
                            },
                            body: [
                                {
                                    token: tokenId,
                                    count: 1,
                                    serials: [1]
                                },
                                {
                                    token: tokenId2,
                                    count: 2,
                                    serials: [1, 2]
                                }
                            ]
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.OK);
                        });
                    })
                })
            })

            let requestForRetireRequestCreationProgress = {
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization,
                },
                qs: {
                    contractId: rContractId
                }
            }

            Checks.whileRetireRequestCreating(rContractId, requestForRetireRequestCreationProgress, 0)

            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization,
                },
                qs: {
                    contractId: rContractId
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0).contractId).eql(rContractId)
                expect(response.body.at(0).tokens.at(0).token).eql(tokenId || tokenId2)
                expect(response.body.at(0).tokens.at(0).count).eql(1 || 2)
                expect(response.body.at(0).tokens.at(1).token).eql(tokenId2 || tokenId)
                expect(response.body.at(0).tokens.at(1).count).eql(2 || 1)
                expect(response.body.at(0).user).eql(hederaId)
            });
        });

    })

    describe("Flow for NFT and FT tokens and get requests", () => {

        before("Create contracts, policies, register new user and associate token with him", () => {
            contractNameR = Math.floor(Math.random() * 99999) + "RCon4RequestsTests";
            contractNameW = Math.floor(Math.random() * 99999) + "WCon4RequestsTests";
            //Create retire contract and save id
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameR,
                        "type": "RETIRE",
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    rContractId = response.body.contractId;
                    rConractUuid = response.body.id;
                });

                //Create wipe contract and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfContracts,
                    headers: {
                        authorization,
                    },
                    body: {
                        "description": contractNameW,
                        "type": "WIPE",
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    wContractId = response.body.contractId;
                });

                //Import policy and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec 4 token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenType: "fungible",
                            tokenId: tokenId,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })

                //Import second policy to have one more token and save id
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportMsg,
                    body: {
                        "messageId": Cypress.env('policy_for_compare1')//iRec 4
                    },
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                })
                    .then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        policyId = response.body.at(0).id;
                    })

                //Get token(Irec 5 token) draft id to update it
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId2 = response.body.at(0).tokenId;
                }).then(() => {
                    //Put wipe contract to token
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + API.Async,
                        headers: {
                            authorization,
                        },
                        body: {
                            tokenId: tokenId2,
                            wipeContractId: wContractId,
                            draftToken: true
                        }
                    })
                }).then(() => {
                    //Publish policy
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 600000
                    })
                        .then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                        })
                })
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ContractPermissions + API.Users + username + "/" + API.Policies + API.Assign,
                    body: {
                        policyIds: [
                            policyId,
                            policyId2
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

        before("Get blocks for waiting(approve app, device grid, issue grid) and tokens id", () => {
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId = response.body.id
                })
            })
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.DeviceGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceGridBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRequestGridBlockId2 = response.body.id
                })
            })
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveRegistrantBtn,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    approveRegistrantBtnBlockId2 = response.body.id
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenId = response.body.at(1).tokenId;
                    tokenId2 = response.body.at(0).tokenId;
                })
            })
        })

        before("Mint tokens", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            let applicationData
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            let deviceBody
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

                //Get issue data and prepare body for create
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

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
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            let issueRow
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)

                //Wait while balance updating
                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
                Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
            })
        })

        before("Mint second tokens", () => {
            //Choose role
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateApplication,
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
                    }
                })

                let requestForApplicationCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + waitForApproveApplicationBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })

            //Get applications data and prepare body for approve
            let applicationData
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetApplications,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    applicationData = response.body.data[0];
                    applicationData.option.status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: applicationData,
                        tag: "Button_0"
                    })
                    //Approve app
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveApplication,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForApplicationApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

                //Create device and wait while it in progress
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateDevice,
                    headers: {
                        authorization
                    },
                    body: {
                        document: {
                            field3: {},
                            field4: {},
                            field5: {}
                        },
                        ref: null
                    }
                })

                let requestForDeviceCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })

            //Get devices data and prepare body for approve
            let deviceBody
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetDevices,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    deviceBody = response.body;
                    let data = deviceBody.data[deviceBody.data.length - 1]
                    data[optionKey].status = "Approved"
                    let appDataBody = JSON.stringify({
                        document: data,
                        tag: "Button_0"
                    })
                    //Approve device
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveDevice,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: appDataBody
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForDeviceApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + deviceGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)
            })

            //Get issue data and prepare body for create
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

                    //Create issue and wait while it in progress
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.CreateIssue,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: {
                            document: {
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 10,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: METHOD.GET,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + issueRequestGridBlockId2,
                        headers: {
                            authorization
                        }
                    }

                    Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })

            //Get issue data and prepare body for approve
            let issueRow
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.GetIssues,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    issueRow = response.body.data
                    issueRow = issueRow[issueRow.length - 1]
                    issueRow[optionKey].status = "Approved"
                    issueRow = JSON.stringify({
                        document: issueRow,
                        tag: "Button_0"
                    })
                    //Approve issue
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId2 + "/" + API.ApproveIssueRequestsBtn,
                        headers: {
                            authorization,
                            "content-type": "application/json"
                        },
                        body: issueRow
                    })
                })
            })

            //Wait while approve in progress
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                let requestForIssueApproveProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId2 + "/" + API.Blocks + issueRequestGridBlockId2,
                    headers: {
                        authorization
                    }
                }

                Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)

                //Wait while balance updating

                let requestForBalance = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization
                    }
                }

                Checks.whileBalanceVerifying("10", requestForBalance, 0)
            })
        })

        before("Set pool", () => {
            //Set pool to retire contract and wait while it in progress
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.RetireContract + rConractUuid + "/" + API.PoolContract,
                    headers: {
                        authorization,
                    },
                    body: {
                        tokens: [
                            {
                                token: tokenId,
                                count: 1
                            },
                            {
                                token: tokenId2,
                                count: 2
                            }
                        ],
                        immediately: false
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                })

                let requestForWipeRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }

                Checks.whileWipeRequestCreating(wContractId, requestForWipeRequestCreationProgress, 0)
            })
        })

        it("Get wipe request for two tokens", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(wContractId)
                    expect(response.body.at(0).user).eql(rContractId)
                });
            })
        });

        it("Get retire request two tokens", () => {
            let wipeRequestId, poolId
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: wContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    wipeRequestId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            })
            Authorization.getAccessToken(UserUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetirePools,
                    headers: {
                        authorization
                    }
                }).then((response) => {
                    poolId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.RetirePools + poolId + "/" + API.Retire,
                        headers: {
                            authorization,
                            "Content-Type": "application/json"
                        },
                        body: [
                            {
                                token: tokenId,
                                count: 1,
                                serials: [1]
                            },
                            {
                                token: tokenId2,
                                count: 2,
                                serials: [1, 2]
                            }
                        ]
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            })

            Authorization.getAccessToken(SRUsername).then((authorization) => {
                let requestForRetireRequestCreationProgress = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }

                Checks.whileRetireRequestCreating(rContractId, requestForRetireRequestCreationProgress, 0)

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                    qs: {
                        contractId: rContractId
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.at(0).contractId).eql(rContractId)
                    expect(response.body.at(0).tokens.at(0).token).eql(tokenId || tokenId2)
                    expect(response.body.at(0).tokens.at(0).count).eql(1 || 2)
                    expect(response.body.at(0).tokens.at(1).token).eql(tokenId2 || tokenId)
                    expect(response.body.at(0).tokens.at(1).count).eql(2 || 1)
                    expect(response.body.at(0).user).eql(hederaId)
                });
            })
        });

    })

    describe("Flow for getting all requests and negative scenarios", () => {

        it("Get all wipe contracts requests", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.WipeRequests,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            });
        })

        it("Get all wipe contracts requests without auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.WipeRequests,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all wipe contracts requests with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.WipeRequests,
                headers: {
                    authorization: "Bearer wqe",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all wipe contracts requests with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.WipeRequests,
                headers: {
                    authorization: "",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all retire contracts requests", () => {
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetireRequests,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                });
            })
        });

        it("Get all retire contracts requests without auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all retire contracts requests with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: "Bearer wqe",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get all retire contracts requests with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: "",
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get wipe request without auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.WipeRequests,
                qs: {
                    contractId: wContractId
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get wipe request with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.WipeRequests,
                headers: {
                    authorization: "Bearer wqe",
                },
                qs: {
                    contractId: wContractId
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get wipe request with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.WipeRequests,
                headers: {
                    authorization: "",
                },
                qs: {
                    contractId: wContractId
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request without auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                qs: {
                    contractId: rContractId
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request with invalid auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: "Bearer wqe",
                },
                qs: {
                    contractId: rContractId
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });

        it("Get retire request with empty auth token - Negative", () => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RetireRequests,
                headers: {
                    authorization: "",
                },
                qs: {
                    contractId: rContractId
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    })
});
