import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['remote_policy', 'secondPool', 'all'] }, () => {

    const MainSRUsername = Cypress.env('MainSRUser');
    const DepSRUsername = Cypress.env('DepSRUser');
    const MainUserUsername = Cypress.env('MainUser');
    const DepUserUsername = Cypress.env('DepUser');
    const MGSAdminUsername = Cypress.env('MGSAdmin');
    const tenantName = "testTenantFromOS";

    let policyId, remoteMessageId, tokenId, tenantId;

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
    })

    it('Import and publish policy', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            cy.fixture("iRec2ForRemote.policy", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiMGS + API.PolicisImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiMGS + API.Policies,
                            headers: {
                                authorization,
                            },
                            timeout: 180000
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                            response.body.forEach(element => {
                                if (element.name == "iRec2ForRemote") {
                                    policyId = element.id
                                }
                            })
                            cy.request({
                                method: METHOD.PUT,
                                url: API.ApiMGS + API.Policies + policyId + "/" + API.Publish,
                                body: {
                                    policyVersion: "19.9.9",
                                    policyAvailability: "public"
                                },
                                headers: {
                                    authorization,
                                },
                                timeout: 180000,
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                                cy.request({
                                    method: METHOD.GET,
                                    url: API.ApiMGS + API.Policies + policyId,
                                    headers: {
                                        authorization,
                                    },
                                    timeout: 180000
                                }).then((response) => {
                                    expect(response.status).to.eq(STATUS_CODE.OK);
                                    remoteMessageId = response.body.messageId;
                                })
                            });
                        })
                    })
                })
        });
    });

    it('Assign policy to dep users', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ExternalPolicy + API.Import,
                body: {
                    messageId: remoteMessageId,
                },
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                Authorization.getAccessToken(DepSRUsername).then((authorization) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ExternalPolicy + remoteMessageId + "/" + API.Approve,
                        headers: {
                            authorization,
                        },
                        timeout: 180000
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
                    })
                });
            })
        });
    });

    it('Generate and import key', () => {
        Authorization.getAccessToken(DepUserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Profiles + API.Key,
                body: {
                    messageId: remoteMessageId,
                },
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                let userKey = response.body.key;
                Authorization.getAccessTokenMGS(MainUserUsername, tenantId).then((authorization) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiMGS + API.Profiles + API.Key,
                        body: {
                            messageId: remoteMessageId,
                            key: userKey,
                        },
                        headers: {
                            authorization,
                        },
                        timeout: 180000
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                    })
                });
            })
        });
    })

    it('Assign dep users by main sr', () => {
        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiMGS + API.UsersPermissions + MainUserUsername + "/" + API.Policies + API.Assign,
                body: {
                    "policyIds": [
                        policyId
                    ],
                    "assign": true
                },
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            })
        });
    })

    it('Token associate and KYC grant', () => {
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
                    if (element.messageId == remoteMessageId) {
                        policyId = element.id;
                    }
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    response.body.forEach(element => {
                        if (element.policyIds[0] == policyId) {
                            tokenId = element.tokenId;
                        }
                    })
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + tokenId + "/associate",
                        headers: {
                            authorization,
                        },
                        body: {
                            isValid: true
                        },
                        timeout: 180000
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((authorization) => {
                            cy.request({
                                method: METHOD.PUT,
                                url: API.ApiMGS + API.ListOfTokens + tokenId + "/" + MainUserUsername + "/grant-kyc",
                                headers: {
                                    authorization,
                                },
                                body: {
                                    isValid: true
                                },
                                timeout: 180000
                            }).then((response) => {
                                expect(response.status).to.eq(STATUS_CODE.OK);
                            })
                        })
                    })
                })
            })
        });
    })
});
