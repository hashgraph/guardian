import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/checkingMethods";

context("Contracts", { tags: ['contracts', 'firstPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    let contractIdW, contractIdR, contractIdW2, contractIdR2, idW, idR, idW2, idR2, hederaIdSR2, tokenId;
    const contractNameR = "FirstAPIContractR";
    const contractNameW = "FirstAPIContractW";
    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "WIPE"
                }
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.description == contractNameW) {
                        contractIdW = element.contractId
                        idW = element.id
                    }
                });
            });
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "RETIRE"
                }
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.description == contractNameR) {
                        contractIdR = element.contractId
                        idR = element.id
                    }
                });
            });
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.draftToken == false) {
                        tokenId = element.tokenId
                    }
                });
            });
        })
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Profiles + SR2Username,
                headers: {
                    authorization,
                }
            }).then((response) => {
                hederaIdSR2 = response.body.hederaAccountId
            });
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "WIPE"
                }
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.description == contractNameW) {
                        contractIdW2 = element.contractId
                        idW2 = element.id
                        console.log(contractIdW2)
                        console.log(idW2)
                    }
                });
            });
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "RETIRE"
                }
            }).then((response) => {
                response.body.forEach(element => {
                    if (element.description == contractNameR) {
                        contractIdR2 = element.contractId
                        idR2 = element.id
                        console.log(contractIdR2)
                        console.log(idR2)
                    }
                });
            });
        })
    })

    //Retire
    it("Add wipe contract admin(retire)", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(true);
            });
        });
    })

    it("Add wipe contract admin(retire) without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(retire) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
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
            url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(true);
            });
        })
    });

    it("Add wipe contract manager without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
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
            url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    // it("Add wipe contract wiper", () => {
    //     Authorization.getAccessToken(SRUsername).then((authorization) => {
    //         cy.request({
    //             method: METHOD.POST,
    //             url: API.ApiServer + API.WipeContract + idW + "/" + API.WiperRole + hederaIdSR2 + "/" + tokenId,
    //             headers: {
    //                 authorization,
    //             }
    //         }).then((response) => {
    //             expect(response.status).eql(STATUS_CODE.OK);
    //             expect(response.body).eql(true);
    //         });
    //     })
    // });

    // it("Add wipe contract wiper without auth token - Negative", () => {
    //     cy.request({
    //         method: METHOD.POST,
    //         url: API.ApiServer + API.WipeContract + idW + "/" + API.AdminRole + hederaIdSR2,
    //         failOnStatusCode: false,
    //     }).then((response) => {
    //         expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    //     });
    // });

    // it("Add wipe contract wiper with invalid auth token - Negative", () => {
    //     cy.request({
    //         method: METHOD.POST,
    //         url: API.ApiServer + API.WipeContract + idW + "/" + API.AdminRole + hederaIdSR2,
    //         headers: {
    //             authorization: "Bearer wqe",
    //         },
    //         failOnStatusCode: false,
    //     }).then((response) => {
    //         expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    //     });
    // });

    // it("Add wipe contract wiper permissions with empty auth token - Negative", () => {
    //     cy.request({
    //         method: METHOD.POST,
    //         url: API.ApiServer + API.WipeContract + idW + "/" + API.AdminRole + hederaIdSR2,
    //         headers: {
    //             authorization: "",
    //         },
    //         failOnStatusCode: false,
    //     }).then((response) => {
    //         expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    //     });
    // });

    it("Verify roles(wipe)", () => {
        cy.wait(120000)
        console.log(idW2)
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + idW2 + "/" + API.ContractPermissions,
                headers: {
                    authorization
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(6);
            });
        })
    });

    it("Verify roles(retire)", () => {
        cy.wait(120000)
        console.log(idR2)
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + idR2 + "/" + API.ContractPermissions,
                headers: {
                    authorization
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(2);
            });
        })
    });

    it("Remove  wipe contract admin(wipe)", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + idW + "/" + API.AdminRole + hederaIdSR2,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(true);
            });
        })
    });

    it("Remove  wipe contract admin(wipe) without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + idW + "/" + API.AdminRole + hederaIdSR2,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(wipe) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + idW + "/" + API.AdminRole + hederaIdSR2,
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
            url: API.ApiServer + API.WipeContract + idW + "/" + API.AdminRole + hederaIdSR2,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(retire)", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(true);
            });
        });
    })

    it("Remove  wipe contract admin(retire) without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(retire) with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
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
            url: API.ApiServer + API.RetireContract + idR + "/" + API.AdminRole + hederaIdSR2,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract manager", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(true);
            });
        });
    })

    it("Remove  wipe contract manager without auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract manager with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
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
            url: API.ApiServer + API.WipeContract + idW + "/" + API.ManagerRole + hederaIdSR2,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Verify roles(wipe)", () => {
        cy.wait(200000)
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + idW2 + "/" + API.ContractPermissions,
                headers: {
                    authorization
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(0);
            });
        })
    });

    it("Verify roles(retire)", () => {
        cy.wait(20000)
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + idR2 + "/" + API.ContractPermissions,
                headers: {
                    authorization
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(0);
            });
        })
    });
})