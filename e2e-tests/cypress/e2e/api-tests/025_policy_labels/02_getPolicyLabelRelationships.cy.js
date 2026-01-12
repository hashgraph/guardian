import { STATUS_CODE } from "../../../support/api/api-const";
import * as Authorization from "../../../support/authorization";

context("Get policy label relationships", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    let policyLabel, policy;

    before("Get policy label and policy", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            // Get the first available label
            cy.getPolicyLabels(auth).then(({ body }) => {
                policyLabel = body.at(0);
            });

            // Get the target policy object
            cy.getPolicyByName(auth, "iRec_4").then((p) => {
                policy = p;
            });
        });
    });

    it("Get policy label relationships", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getPolicyLabelRelationships(auth, policyLabel.id).then(({ body, status }) => {
                expect(status).eql(STATUS_CODE.OK);
                expect(body.policySchemas.length).eql(8);

                // Grouped policy assertions
                const resPolicy = body.policy;
                expect(resPolicy.id).eql(policy.id);
                expect(resPolicy.name).eql(policy.name);
                expect(resPolicy.instanceTopicId).eql(policy.instanceTopicId);
                expect(resPolicy.messageId).eql(policy.messageId);
                expect(resPolicy.owner).eql(policy.owner);
                expect(resPolicy.status).eql(policy.status);
                expect(resPolicy.topicId).eql(policy.topicId);
                expect(resPolicy.policyRoles).eql(policy.userRoles);
                expect(resPolicy.uuid).eql(policy.uuid);
                expect(resPolicy.version).eql(policy.version);
            });
        });
    });

    it("Get policy label relationships without auth - Negative", () => {
        cy.getPolicyLabelRelationships(null, policyLabel.id)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Get policy label relationships with incorrect auth - Negative", () => {
        cy.getPolicyLabelRelationships("bearer invalid_token", policyLabel.id)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Get policy label relationships with empty auth - Negative", () => {
        cy.getPolicyLabelRelationships("", policyLabel.id)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

});