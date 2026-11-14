import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { newestPolicyCopy } from '../../../support/cdmTools';
import { deleteDryRunPolicy } from '../../../support/CustomHelpers/policyTests';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Delete policy test', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    let policyId; let testId;

    before('Get test id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                timeout: TIMEOUTS.backend
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                //The copy 000_importPolicyTest imported and put in dry run: the newest one
                const policy = newestPolicyCopy(response.body, 'iRecDRF');
                expect(policy, 'the iRecDRF policy').to.not.be.undefined;
                policyId = policy.id;
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK)
                    expect(response.body.id).to.equal(policyId)
                    testId = response.body.tests.at(0).id
                })
            })
        })
    });

    // The last spec of the folder that uses the copy 000_importPolicyTest imported
    after('Delete the copy of the policy', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => deleteDryRunPolicy(authorization, policyId));
    });

    it('Deletes the policy with the provided ID by user - Negative', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
				url: API.ApiServer + API.Policies + policyId + '/' + API.Test + testId,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it('Deletes the policy with the provided ID without auth token - Negative', () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Test + testId,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Deletes the policy with the provided ID with invalid auth token - Negative', () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Test + testId,
            headers: {
                authorization: 'Bearer wqe',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Deletes the policy with the provided ID with empty auth token - Negative', () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Policies + policyId + '/' + API.Test + testId,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Deletes the policy test', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
				url: API.ApiServer + API.Policies + policyId + '/' + API.Test + testId,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });
});
