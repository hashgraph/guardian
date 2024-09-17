import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const SR2Username = Cypress.env('SR2User');

    let contractIdR, contractIdW;
    let contractIdHedW;
    let contractIdRVerra;
    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const contractNameR = Math.floor(Math.random() * 999) + "RCon4GetPerms";
            const contractNameW = Math.floor(Math.random() * 999) + "WCon4GetPerms";
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
                contractIdR = response.body.id;
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
                contractIdHedW = response.body.contractId;
            });
        })
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ImportContracts,
                headers: {
                    authorization
                },
                body: {
                    "contractId": contractIdHedW,
                    "description": contractNameW
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                contractIdRVerra = response.body.id
                contractIdHedW = response.body.contractId
                Authorization.getAccessToken(SRUsername).then((authorization) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.WiperRole + hederaAccountId,
                        headers: {
                            authorization
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                })
            });
        })
    })

    it("Get smart-contract(retire) permissions", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql("3");
            });
        })
    });

    it("Get smart-contract(retire) permissions without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(retire) permissions with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(retire) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(retire) permissions as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + contractIdR + "/" + API.ContractPermissions,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Get smart-contract(wipe) permissions", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql("15");
            });
        })
    });

    it("Get smart-contract(wipe) permissions by Verra", () => {
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + contractIdRVerra + "/" + API.ContractPermissions,
                headers: {
                    authorization
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql("8");
            });
        })
    })

    it("Get smart-contract(wipe) permissions without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(wipe) permissions with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(wipe) permissions with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get smart-contract(wipe) permissions as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts + contractIdW + "/" + API.ContractPermissions,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });
});