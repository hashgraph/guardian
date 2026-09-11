import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Get policy label relationships', { tags: ['policy_labels', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const UserUsername = Cypress.env('User');
    let policyLabel; let policy;

    const getPolicyLabels = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}`,
            headers,
            failOnStatusCode: false,
        });

    const getPolicies = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.Policies}`,
            headers,
            failOnStatusCode: false,
        });

    const getPolicyLabelRelationships = (labelId, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}${labelId}/${API.Relationships}`,
            headers,
            failOnStatusCode: false,
        });

    before('Get policy label and policy', () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            const headers = { authorization: auth };

            // Get the first available label
            getPolicyLabels(headers).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);
                expect(body).to.be.an('array').and.not.be.empty;
                policyLabel = body.at(0);
                expect(policyLabel).to.have.property('id');

                // Resolve the policy the label actually points at, rather than any policy
                // sharing its name: several iRec_4 copies can coexist, and only the one the
                // label was created against will have matching roles/topic ids.
                getPolicies(headers).then(({ body: policies, status: policiesStatus }) => {
                    expect(policiesStatus).to.eq(STATUS_CODE.OK);
                    policy = policies.find((p) => p.id === policyLabel.policyId);
                    expect(policy, `the policy backing label ${policyLabel.id}`).to.not.be.undefined;
                });
            });
        });
    });

    it('Get policy label relationships', () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            getPolicyLabelRelationships(policyLabel.id, { authorization: auth }).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);

                // Core expectations
                expect(body).to.have.property('policySchemas');
                expect(body.policySchemas).to.be.an('array');
                expect(body.policySchemas.length).to.eq(8);

                // Grouped policy assertions
                const resPolicy = body.policy;
                expect(resPolicy).to.be.an('object');
                expect(resPolicy.id).to.eq(policy.id);
                expect(resPolicy.name).to.eq(policy.name);
                expect(resPolicy.instanceTopicId).to.eq(policy.instanceTopicId);
                expect(resPolicy.messageId).to.eq(policy.messageId);
                expect(resPolicy.owner).to.eq(policy.owner);
                expect(resPolicy.status).to.eq(policy.status);
                expect(resPolicy.topicId).to.eq(policy.topicId);
                expect(resPolicy.policyRoles).to.eql(policy.userRoles);
                expect(resPolicy.uuid).to.eq(policy.uuid);
                expect(resPolicy.version).to.eq(policy.version);
            });
        });
    });

    it('Get policy label relationships without auth - Negative', () => {
        getPolicyLabelRelationships(policyLabel.id, {})
            .its('status')
            .should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it('Get policy label relationships with incorrect auth - Negative', () => {
        getPolicyLabelRelationships(policyLabel.id, { authorization: 'bearer invalid_token' })
            .its('status')
            .should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it('Get policy label relationships with empty auth - Negative', () => {
        getPolicyLabelRelationships(policyLabel.id, { authorization: '' })
            .its('status')
            .should('eq', STATUS_CODE.UNAUTHORIZED);
    });
});
