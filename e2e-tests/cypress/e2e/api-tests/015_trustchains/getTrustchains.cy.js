import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Trustchains', { tags: ['trustchains', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;

    const getTrustChain = (headers = {}, policyId) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.Policies}${policyId}/${API.TrustChainBlock}`,
            headers,
            failOnStatusCode: false,
        });

    before('Get policy id for trustchain', () => {
        cy.getOrCreateIRec4Policy(SRUsername).then((policy) => {
            policyId = policy.id;
        });
    });

    it('Get all VP documents and hash', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getTrustChain({ authorization }, policyId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.have.property('hash');
            });
        });
    });

    it('Get all VP documents and hash without auth token - Negative', () => {
        getTrustChain({}, policyId).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get all VP documents and hash with invalid auth token - Negative', () => {
        getTrustChain({ authorization: 'Bearer wqe' }, policyId).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get all VP documents and hash with empty auth token - Negative', () => {
        getTrustChain({ authorization: '' }, policyId).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
