import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    const contractNameR = 'FirstAPIContractR';
    const contractNameW = 'FirstAPIContractW';

    let idW; let idR; let idW2; let idR2; let hederaIdSR2;
    let contractUuidW; let contractUuidR;

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
            Contracts.getContractByDescription(token, 'WIPE', contractNameW).then((contract) => {
                idW = contract.id;
                contractUuidW = contract.contractId;
            });
            Contracts.getContractByDescription(token, 'RETIRE', contractNameR).then((contract) => {
                idR = contract.id;
                contractUuidR = contract.contractId;
            });
        });

        Authorization.getAccessToken(SR2Username).then((token) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Profiles + SR2Username,
                headers: { authorization: token }
            }).then(res => hederaIdSR2 = res.body.hederaAccountId);

            Contracts.getContractByContractId(token, 'WIPE', contractUuidW).then(c => idW2 = c.id);
            Contracts.getContractByContractId(token, 'RETIRE', contractUuidR).then(c => idR2 = c.id);
        });
    });

    it('Add wipe contract admin(retire)', () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it('Add wipe contract admin(retire) without auth token - Negative', () => {
        manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract admin(retire) with invalid auth token - Negative', () => {
        manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2, 'Bearer wqe').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract admin(retire) permissions with empty auth token - Negative', () => {
        manageRole(METHOD.POST, API.RetireContract, idR, API.AdminRole, hederaIdSR2, '').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract manager', () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it('Add wipe contract manager without auth token - Negative', () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract manager with invalid auth token - Negative', () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, 'Bearer wqe').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract manager permissions with empty auth token - Negative', () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, '').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract admin(wipe)', () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it('Add wipe contract admin(wipe) without auth token - Negative', () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract admin(wipe) with invalid auth token - Negative', () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2, 'Bearer wqe').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Add wipe contract admin(wipe) with empty auth token - Negative', () => {
        manageRole(METHOD.POST, API.WipeContract, idW, API.AdminRole, hederaIdSR2, '').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Verify roles(wipe)', () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            //The grants above reach the contract through Hedera, so the permissions are polled
            //until they show up rather than read once after a fixed wait
            Checks.waitForResponseBody({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idW2}/${API.Permissions}`,
                headers: { authorization: token },
            }, 6);
        });
    });

    it('Verify roles(retire)', () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            Checks.waitForResponseBody({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idR2}/${API.Permissions}`,
                headers: { authorization: token },
            }, 2);
        });
    });

    it('Remove wipe contract admin(retire)', () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it('Remove wipe contract admin(retire) without auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove wipe contract admin(retire) with invalid auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2, 'Bearer wqe').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove wipe contract admin(retire) permissions with empty auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.RetireContract, idR, API.AdminRole, hederaIdSR2, '').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove wipe contract manager', () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it('Remove wipe contract manager without auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove wipe contract manager with invalid auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, 'Bearer wqe').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove wipe contract manager permissions with empty auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.ManagerRole, hederaIdSR2, '').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove wipe contract admin(wipe)', () => {
        Authorization.getAccessToken(SRUsername).then((token) => {
            manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2, token).then((res) => {
                expect(res.status).eql(STATUS_CODE.OK);
                expect(res.body).eql(true);
            });
        });
    });

    it('Remove  wipe contract admin(wipe) without auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2).then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove  wipe contract admin(wipe) with invalid auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2, 'Bearer wqe').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Remove  wipe contract admin(wipe) permissions with empty auth token - Negative', () => {
        manageRole(METHOD.DELETE, API.WipeContract, idW, API.AdminRole, hederaIdSR2, '').then((res) => {
            expect(res.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Verify roles removed(wipe)', () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            //The revocations above travel through Hedera exactly like the grants did, so the
            //permissions are polled down to zero rather than read once after a fixed wait
            Checks.waitForResponseBody({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idW2}/${API.Permissions}`,
                headers: { authorization: token },
            }, 0);
        });
    });

    it('Verify roles removed(retire)', () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            Checks.waitForResponseBody({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idR2}/${API.Permissions}`,
                headers: { authorization: token },
            }, 0);
        });
    });

});