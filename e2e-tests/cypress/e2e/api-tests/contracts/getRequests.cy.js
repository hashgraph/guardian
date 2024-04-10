import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' },() => {
    const authorization = Cypress.env("authorization");
    //const username = Math.floor(Math.random() * 999) + "User";
    const username = "4User";
    const contractNameR = Math.floor(Math.random() * 999) + "RCon4RequestsTests";
    const contractNameW = Math.floor(Math.random() * 999) + "WCon4RequestsTests";
    const optionKey = "option"
    let wContractId, rContractId, tokenId, policyId, hederaId, rConractUuid
    let waitForApproveApplicationBlockId, deviceGridBlockId, issueRequestGridBlockId, approveRegistrantBtnBlockId

    let whileWipeRequestCreating = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body?.at(0)?.contractId)
                    whileWipeRequestCreating(dataToCompare, request, attempts)
                else {
                    let data = response.body.at(0).contractId
                    if (data !== dataToCompare)
                        whileWipeRequestCreating(dataToCompare, request, attempts)
                }
            })
        }
    }

    let whileApplicationCreating = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body?.uiMetaData?.title)
                    whileApplicationCreating(dataToCompare, request, attempts)
                else {
                    let data = response.body.uiMetaData.title
                    if (data !== dataToCompare)
                        whileApplicationCreating(dataToCompare, request, attempts)
                }
            })
        }
    }

    let whileApplicationApproving = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body?.fields)
                    whileApplicationApproving(dataToCompare, request, attempts)
                else {
                    let data = response.body.fields[0]?.title
                    if (data !== dataToCompare)
                        whileApplicationApproving(dataToCompare, request, attempts)
                }
            })
        }
    }

    let whileDeviceCreating = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body?.data)
                    whileDeviceCreating(dataToCompare, request, attempts)
                else {
                    let data = response.body.data[0]?.[optionKey]?.status
                    if (data !== dataToCompare)
                        whileDeviceCreating(dataToCompare, request, attempts)
                }
            })
        }
    }

    let whileDeviceApproving = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body?.data)
                    whileDeviceApproving(dataToCompare, request, attempts)
                else {
                    let data = response.body.data[0]?.[optionKey]?.status
                    if (data !== dataToCompare)
                        whileDeviceApproving(dataToCompare, request, attempts)
                }
            })
        }
    }

    let whileIssueRequestCreating = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body?.data)
                    whileIssueRequestCreating(dataToCompare, request, attempts)
                else {
                    let data = response.body.data[0]?.[optionKey]?.status
                    if (data !== dataToCompare)
                        whileIssueRequestCreating(dataToCompare, request, attempts)
                }
            })
        }
    }

    let whileIssueRequestApproving = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body?.data)
                    whileIssueRequestApproving(dataToCompare, request, attempts)
                else {
                    let data = response.body.data[0]?.[optionKey]?.status

                    cy.log(response)
                    cy.log(data)
                    cy.log(dataToCompare)
                    if (data !== dataToCompare)
                        whileIssueRequestApproving(dataToCompare, request, attempts)
                }
            })
        }
    }

    let whileBalanceVerifying = (dataToCompare, request, attempts) => {
        if (attempts < 100) {
            attempts++
            let balance
            cy.wait(3000)
            cy.request(request).then((response) => {
                if (!response?.body)
                    whileBalanceVerifying(dataToCompare, request, attempts)
                else {
                    for (let i = 0; i < response.body.length; i++) {
                        if (response.body[i].tokenId === tokenId)
                            balance = response.body[i].balance
                    }
                    if (balance !== dataToCompare)
                        whileBalanceVerifying(dataToCompare, request, attempts)
                }
            })
        }
    }

    before("Create contracts, policy and register new user", () => {
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
                policyId = response.body.at(-1).id;
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
                method: 'PUT',
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

        //Register new user
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: username,
                password: "test",
                password_confirmation: "test",
                role: "USER",
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
        })
        //Login and get PT
        cy.request({
            method: "POST",
            url: API.ApiServer + "accounts/login",
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            //Get AT
            cy.request({
                method: "POST",
                url: API.ApiServer + "accounts/access-token",
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                //Get SR did
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'accounts/standard-registries/aggregated',
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    let SRDid = response.body[0].did
                    //Get generated hedera creds
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.RandomKey,
                        headers: {authorization},
                    }).then((response) => {
                        hederaId = response.body.id
                        let hederaAccountKey = response.body.key
                        //Update profile
                        cy.request({
                            method: 'PUT',
                            url: API.ApiServer + 'profiles/' + username,
                            body: {
                                hederaAccountId: hederaId,
                                hederaAccountKey: hederaAccountKey,
                                parent: SRDid
                            },
                            headers: {
                                authorization: accessToken
                            },
                            timeout: 180000
                        })
                    })
                })
            })
        })
    })

    before("Get blocks for waiting(approve app, device grid, issue grid) and token id", () => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    waitForApproveApplicationBlockId = response.body.id
                })
                cy.request({
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    deviceGridBlockId = response.body.id
                })
                cy.request({
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    issueRequestGridBlockId = response.body.id
                })
                cy.request({
                    method: "GET",
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
    })

    before("Mint token", () => {
        //Choose role
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: "POST",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
                    headers: {
                        authorization: accessToken
                    },
                    body: {
                        role: "Registrant"
                    }
                })

                cy.wait(10000)

                //Create app and wait while it in progress
                cy.request({
                    method: "POST",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                    headers: {
                        authorization: accessToken
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
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
                    headers: {
                        authorization: accessToken
                    }
                }

                whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
            })
        })

        //Get applications data and prepare body for approve
        let applicationData
        cy.request({
            method: "GET",
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
                method: "POST",
                url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
                headers: {
                    authorization,
                    "content-type": "application/json"
                },
                body: appDataBody
            })
        })

        //Wait while approve in progress
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                accessToken = "Bearer " + response.body.accessToken

                let requestForApplicationApproveProgress = {
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization: accessToken
                    }
                }

                whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)
            })
        })

        //Create device and wait while it in progress
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: "POST",
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
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization: accessToken
                    }
                }

                whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
            })
        })

        //Get devices data and prepare body for approve
        let deviceBody
        cy.request({
            method: "GET",
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
                method: "POST",
                url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
                headers: {
                    authorization,
                    "content-type": "application/json"
                },
                body: appDataBody
            })
        })

        //Wait while approve in progress
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                accessToken = "Bearer " + response.body.accessToken

                let requestForDeviceApproveProgress = {
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
                    headers: {
                        authorization: accessToken
                    }
                }

                whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)
            })
        })

        //Get issue data and prepare body for create
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
                    headers: {
                        authorization: accessToken
                    }
                }).then((response) => {
                    let obj = response.body
                    let device_issue_row = obj.data[obj.data.length - 1]

                    //Create issue and wait while it in progress
                    cy.request({
                        method: "POST",
                        url: API.ApiServer + API.Policies + policyId + "/" + API.CreateIssue,
                        headers: {
                            authorization: accessToken,
                            "content-type": "application/json"
                        },
                        body: {
                            document: {
                                field2: {},
                                field3: {},
                                field6: "2024-03-01",
                                field7: 1,
                                field8: "2024-03-02",
                                field17: username,
                                field18: hederaId
                            },
                            ref: device_issue_row
                        }
                    })

                    let requestForIssueCreationProgress = {
                        method: "GET",
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                        headers: {
                            authorization: accessToken
                        }
                    }

                    whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
                })
            })
        })

        //Get issue data and prepare body for approve
        let issueRow
        cy.request({
            method: "GET",
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
                method: "POST",
                url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
                headers: {
                    authorization,
                    "content-type": "application/json"
                },
                body: issueRow
            })
        })

        //Wait while approve in progress
        let accessToken
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                accessToken = "Bearer " + response.body.accessToken

                let requestForIssueApproveProgress = {
                    method: "GET",
                    url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
                    headers: {
                        authorization: accessToken
                    }
                }

                whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)
            })
        })

        //Wait while balance updating
        cy.request({
            method: "POST",
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: username,
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: "POST",
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                accessToken = "Bearer " + response.body.accessToken

                let requestForBalance = {
                    method: "GET",
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization: accessToken
                    }
                }

                whileBalanceVerifying("1", requestForBalance)
            })
        })
    })

    before("Set pool", () => {
        //Set pool to retire contract and wait while it in progress
        cy.request({
            method: "POST",
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

        whileWipeRequestCreating(wContractId, requestForWipeRequestCreationProgress, 0)
    })

    it("Get wipe request", () => {
        cy.wait(1000)
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

    // it("Get all wipe contracts requests", () => {
    //     cy.request({
    //         method: METHOD.GET,
    //         url: API.ApiServer + API.WipeRequests,
    //         headers: {
    //             authorization,
    //         },
    //     }).then((resp) => {
    //         expect(resp.status).eql(STATUS_CODE.OK);
    //     });
    // });
    //
    // it("Get all retire contracts requests", () => {
    //     cy.request({
    //         method: METHOD.GET,
    //         url: API.ApiServer + API.RetireRequests,
    //         headers: {
    //             authorization,
    //         },
    //     }).then((resp) => {
    //         expect(resp.status).eql(STATUS_CODE.OK);
    //     });
    // });
});
