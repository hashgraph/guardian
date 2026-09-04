import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';

context('Contracts', { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    const contractNameR = 'FirstAPIContractR';
    const contractNameW = 'FirstAPIContractW';

    let idW; let idR; let idW2; let idR2; let hederaIdSR2;
    let contractUuidW; let contractUuidR;

    //Contracts of earlier runs carry the same description, so the last match is the one the current
    //run created, in step with how the import spec picks the contract it imports
    const getContract = (token, type, description) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: { authorization: token },
            qs: { type }
        }).then((response) => {
            const contract = response.body.filter(c => c.description === description).at(-1);
            expect(contract, `${type} contract "${description}"`).to.not.be.undefined;
            return cy.wrap(contract, { log: false });
        });
    };

    //The importing registry keeps its own record of the contract, and the on-chain id is what ties
    //the two records together: matching on the description alone can pair up contracts of two
    //different runs, and the roles then get granted on one contract and read back from the other
    const getImportedContractId = (token, type, contractId) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: { authorization: token },
            qs: { type }
        }).then((response) => {
            const contract = response.body.find(c => c.contractId === contractId);
            expect(contract, `imported ${type} contract ${contractId}`).to.not.be.undefined;
            return cy.wrap(contract.id, { log: false });
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
            getContract(token, 'WIPE', contractNameW).then((contract) => {
                idW = contract.id;
                contractUuidW = contract.contractId;
            });
            getContract(token, 'RETIRE', contractNameR).then((contract) => {
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

            getImportedContractId(token, 'WIPE', contractUuidW).then(id => idW2 = id);
            getImportedContractId(token, 'RETIRE', contractUuidR).then(id => idR2 = id);
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

    it.skip('Verify roles(wipe)', () => {
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

    it.skip('Verify roles(retire)', () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            cy.request({
                method: METHOD.GET,
                url: `${API.ApiServer}${API.ListOfContracts}${idR2}/${API.Permissions}`,
                headers: { authorization: token }
            }).then(res => expect(res.body).eql(0));
        });
    });

});