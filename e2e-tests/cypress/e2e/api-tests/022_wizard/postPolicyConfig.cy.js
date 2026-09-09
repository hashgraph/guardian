import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Create Policy by Wizard', { tags: ['wizard', 'firstPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const policyName = 'wizardPolicyEdited';
    let policyId;

    before('Get policy id', () => {
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
                //The wizard spec names its policy after the run it was created in, so the most
                //recent of them is the one to configure here
                const policy = response.body
                    .filter((element) => String(element.name).startsWith('wizardPolicy_'))
                    .sort((a, b) => String(b.createDate).localeCompare(String(a.createDate)))
                    .at(0);
                expect(policy, 'a policy created by the wizard spec').to.not.be.undefined;
                policyId = policy.id;
            })
        })
    });

    it('Get policy config by wizard without auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Wizard + policyId + '/' + API.Config,
            body:
            {
                policy: {
                    name: policyName,
                    topicDescription: '',
                    description: ''
                },
                roles: [
                    'OWNER'
                ],
                schemas: [],
                trustChain: []
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy config by wizard with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Wizard + policyId + '/' + API.Config,
            body:
            {
                policy: {
                    name: policyName,
                    topicDescription: '',
                    description: ''
                },
                roles: [
                    'OWNER'
                ],
                schemas: [],
                trustChain: []
            },
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy config by wizard with empty auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Wizard + policyId + '/' + API.Config,
            body:
            {
                policy: {
                    name: policyName,
                    topicDescription: '',
                    description: ''
                },
                roles: [
                    'OWNER'
                ],
                schemas: [],
                trustChain: []
            },
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy config by wizard', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Wizard + policyId + '/' + API.Config,
                body:
                {
                    policy: {
                        name: policyName,
                        topicDescription: '',
                        description: ''
                    },
                    roles: [
                        'OWNER'
                    ],
                    schemas: [],
                    trustChain: []
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.wizardConfig.policy.name).eql(policyName);
            });
        })
    });
});
