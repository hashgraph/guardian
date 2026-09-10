import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const contractNameR = 'FirstAPIContractR';

    let contractIdR; let contractUuidR;

    const clearContractPools = (token, id) => {
        return cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.RetireContract + id + '/' + API.PoolContract,
            headers: token ? { authorization: token } : {},
            failOnStatusCode: false
        });
    };

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Contracts.getContractByDescription(authorization, 'RETIRE', contractNameR)
                .then((contract) => {
                    contractIdR = contract.id;
                    contractUuidR = contract.contractId;
                });
        });
    });

    it('Clear retire contract pools without auth token - Negative', () => {
        clearContractPools(null, contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Clear retire contract pools with invalid auth token - Negative', () => {
        clearContractPools('Bearer wqe', contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Clear retire contract pools with empty auth token - Negative', () => {
        clearContractPools('', contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Clear retire contract pools', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            clearContractPools(authorization, contractIdR).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });

            //Filtered by the Hedera id, which is what a pool record carries. Passing the database id
            //here - as this check used to - matches no pool whatever the state of the contract, so
            //the assertion held even when nothing had been cleared.
            //The rows go when the clear is synchronized back from the contract, so it is polled for.
            Contracts.pollUntil({
                request: {
                    method: METHOD.GET,
                    url: API.ApiServer + API.RetirePools,
                    headers: { authorization },
                    qs: { contractId: contractUuidR },
                },
                predicate: (response) => response.status === STATUS_CODE.OK &&
                    (response.body ?? []).length === 0,
                description: `every pool of contract ${contractUuidR} to be cleared`,
            });
        });
    });

});