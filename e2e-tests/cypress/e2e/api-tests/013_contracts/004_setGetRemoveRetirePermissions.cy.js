import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    const contractNameR = "FirstAPIContractR";
    const contractNameW = "FirstAPIContractW";

    let idW, idR, idW2, idR2, hederaIdSR2;

    const getContractId = (token, type, description) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: { authorization: token },
            qs: { type }
        }).then((response) => {
            const contract = response.body.find(c => c.description === description);
            return contract ? contract.id : null;
        });
    };

    const manageRole = (method, baseUrl, contractId, role, targetHederaId, token = null) => {
        return cy.request({
            method,
            url: `${API.ApiServer}${baseUrl}${contractId}/${role}${targetHederaId}`,
            headers: token ? { authorization: token } : {},
            failOnStatusCode: false
        });
    };

    before(() => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            getContractId(token, "WIPE", contractNameW).then(id => idW = id);
            getContractId(token, "RETIRE", contractNameR).then(id => idR = id);
        });

        Authorization.getAccessToken(SR2Username).then((token) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Profiles + SR2Username,
                headers: { authorization: token }
            }).then(res => hederaIdSR2 = res.body.hederaAccountId);

            getContractId(token, "WIPE", contractNameW).then(id => idW2 = id);
            getContractId(token, "RETIRE", contractNameR).then(id => idR2 = id);
        });
    });

    it("Add wipe contract admin(retire)", () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it("Add wipe contract admin(retire) without auth token - Negative", () => {
        manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(retire) with invalid auth token - Negative", () => {
        manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2, "Bearer wqe").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(retire) permissions with empty auth token - Negative", () => {
        manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2, "").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager", () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it("Add wipe contract manager without auth token - Negative", () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager with invalid auth token - Negative", () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, "Bearer wqe").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract manager permissions with empty auth token - Negative", () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, "").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(wipe)", () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it("Add wipe contract admin(wipe) without auth token - Negative", () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(wipe) with invalid auth token - Negative", () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2, "Bearer wqe").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add wipe contract admin(wipe) with empty auth token - Negative", () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2, "").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Verify roles(wipe)", () => {
        cy.wait(60000);
        Authorization.getAccessToken(SR2Username).then((token) => {
            cy.request({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idW2}/${API.Permissions}`,
                headers: { authorization: token },
            }).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(6);
            });
        });
    });

    it("Verify roles(retire)", () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            cy.request({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idR2}/${API.Permissions}`,
                headers: { authorization: token },
            }).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(2);
            });
        });
    });

    it("Remove wipe contract admin(retire)", () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it("Remove wipe contract admin(retire) without auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove wipe contract admin(retire) with invalid auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2, "Bearer wqe").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove wipe contract admin(retire) permissions with empty auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2, "").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove wipe contract manager", () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it("Remove wipe contract manager without auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove wipe contract manager with invalid auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, "Bearer wqe").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove wipe contract manager permissions with empty auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, "").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove wipe contract admin(wipe)", () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it("Remove  wipe contract admin(wipe) without auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(wipe) with invalid auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2, "Bearer wqe").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove  wipe contract admin(wipe) permissions with empty auth token - Negative", () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2, "").then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it.skip("Verify roles(wipe)", () => {
        cy.clearCookies();
        cy.wait(240000);
        Authorization.getAccessToken(SR2Username).then((token) => {
            cy.request({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idW2}/${API.Permissions}`,
                headers: { authorization: token }
            }).then(res => expect(res.body).eql(0));
        });
    });

    it.skip("Verify roles(retire)", () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            cy.request({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idR2}/${API.Permissions}`,
                headers: { authorization: token }
            }).then(res => expect(res.body).eql(0));
        });
    });

});