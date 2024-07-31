import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: ['contracts', 'firstPool'] }, () => {
    const authorization = Cypress.env("authorization");
    const username = "Verra";
    let contractIdR, contractIdW, hederaIdVerra, contractUuidR, contractUuidW, contractIdWVerra, contractIdRVerra;
    const contractNameR = Math.floor(Math.random() * 999) + "RCon4GetPerms";
    const contractNameW = Math.floor(Math.random() * 999) + "WCon4GetPerms";
    before(() => {
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
            contractIdR = response.body.id;
            contractUuidR = response.body.contractId;
        });
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
            contractIdW = response.body.id;
            contractUuidW = response.body.contractId;
        });
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
                    url: API.ApiServer + API.Profiles + "Verra",
                    headers: {
                        authorization: accessToken,
                    }
                }).then((response) => {
                    hederaIdVerra = response.body.hederaAccountId;
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ImportContracts,
                        headers: {
                            authorization: accessToken
                        },
                        body: {
                            "contractId": contractUuidW,
                            "description": contractNameW
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        contractIdWVerra = response.body.id
                    });
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.ImportContracts,
                        headers: {
                            authorization: accessToken
                        },
                        body: {
                            "contractId": contractUuidR,
                            "description": contractNameR
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        contractIdRVerra = response.body.id
                    });
                })

            })
        })
    })

    it("Add wipe contract admin(wipe)", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Add wipe contract admin(wipe) without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(wipe) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(wipe) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(retire)", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Add wipe contract admin(retire) without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(retire) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(retire) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Add wipe contract manager without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract wiper", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Add wipe contract wiper without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract wiper with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract wiper permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Verify roles(wipe)", () => {
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
                    url: API.ApiServer + API.ListOfContracts + contractIdWVerra + "/" + API.ContractPermissions,
                    headers: {
                        authorization: accessToken
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body).eql("14");
                });
            })
        });
    });

    it("Verify roles(retire)", () => {
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
                    url: API.ApiServer + API.ListOfContracts + contractIdRVerra + "/" + API.ContractPermissions,
                    headers: {
                        authorization: accessToken
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body).eql("2");
                });
            })
        });
    });

    it("Remove  wipe contract admin(wipe)", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Remove  wipe contract admin(wipe) without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.AdminRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(wipe) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(wipe) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(retire)", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Remove  wipe contract admin(retire) without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(retire) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(retire) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.AdminRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract manager", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Remove  wipe contract manager without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract manager with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract manager permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.ManagerRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract wiper", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });

    it("Remove  wipe contract wiper without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract wiper with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract wiper permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaIdVerra,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Verify roles(wipe)", () => {
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
                    url: API.ApiServer + API.ListOfContracts + contractIdWVerra + "/" + API.ContractPermissions,
                    headers: {
                        authorization: accessToken
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body).eql("0");
                });
            })
        });
    });

    it("Verify roles(retire)", () => {
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
                    url: API.ApiServer + API.ListOfContracts + contractIdRVerra + "/" + API.ContractPermissions,
                    headers: {
                        authorization: accessToken
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body).eql("0");
                });
            })
        });
    });
})