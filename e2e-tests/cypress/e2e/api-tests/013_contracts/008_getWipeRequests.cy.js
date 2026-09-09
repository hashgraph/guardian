import { STATUS_CODE } from '../../../support/api/api-const';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const contractNameW = 'FirstAPIContractW';
    let contractUuidW;

    const getWipeRequests = Contracts.getWipeRequests;

    before('Wait request', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Contracts.getContractByDescription(authorization, 'WIPE', contractNameW).then((contract) => {
                contractUuidW = contract.contractId;
                //The pool the previous spec set raised the request on-chain; Guardian picks it up
                //from the mirror node on a once-a-minute synchronization task, so it is polled for
                //rather than read once
                Contracts.waitForWipeRequest(authorization, contractUuidW);
            });
        });
    });

    it('Get wipe request', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWipeRequests(authorization, { contractId: contractUuidW }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0).contractId).eql(contractUuidW);
            });
        });
    });

    it('Get all wipe contracts requests', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWipeRequests(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it('Get all wipe contracts requests without auth token - Negative', () => {
        getWipeRequests(null).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get all wipe contracts requests with invalid auth token - Negative', () => {
        getWipeRequests('Bearer wqe').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get all wipe contracts requests with empty auth token - Negative', () => {
        getWipeRequests('').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get wipe request without auth token - Negative', () => {
        getWipeRequests(null, { contractId: contractUuidW }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get wipe request with invalid auth token - Negative', () => {
        getWipeRequests('Bearer wqe', { contractId: contractUuidW }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get wipe request with empty auth token - Negative', () => {
        getWipeRequests('', { contractId: contractUuidW }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});