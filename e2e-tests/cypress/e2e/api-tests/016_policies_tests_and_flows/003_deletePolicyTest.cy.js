import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Delete policy test', { tags: ['policies', 'secondPool', 'all', 'all-no-mgs'] }, () => {
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
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                //The same copy the import spec works on: iterating and keeping the last match
                //picks a different one as soon as the instance holds more than one
                const policy = response.body.find((element) => element.name === 'iRecDRF');
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
