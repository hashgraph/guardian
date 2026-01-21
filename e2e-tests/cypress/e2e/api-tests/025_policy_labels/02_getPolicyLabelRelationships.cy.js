import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get policy label relationships", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    let policyLabel, policy;

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

    const getPolicyByName = (name, headers = {}) =>
        getPolicies(headers).then(({ body, status }) => {
            expect(status).to.eq(STATUS_CODE.OK);
            expect(body).to.be.an("array");
            const found = body.find(p => p.name === name);
            if (!found) {
                throw new Error(`Policy with name "${name}" not found. Available: ${body.map(p => p.name).join(", ")}`);
            }
            return found;
        });

    const getPolicyLabelRelationships = (labelId, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}${labelId}/${API.Relationships}`,
            headers,
            failOnStatusCode: false,
        });

    before("Get policy label and policy", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            const headers = { authorization: auth };

            // Get the first available label
            getPolicyLabels(headers).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);
                expect(body).to.be.an("array").and.not.be.empty;
                policyLabel = body.at(0);
                expect(policyLabel).to.have.property("id");
            });

            // Get the target policy object by name
            getPolicyByName("iRec_4", headers).then((p) => {
                policy = p;
                // Basic shape checks (optional but helpful)
                expect(policy).to.include.all.keys("id", "name", "uuid", "version");
            });
        });
    });

    it("Get policy label relationships", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            getPolicyLabelRelationships(policyLabel.id, { authorization: auth }).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);

                // Core expectations
                expect(body).to.have.property("policySchemas");
                expect(body.policySchemas).to.be.an("array");
                expect(body.policySchemas.length).to.eq(8);

                // Grouped policy assertions
                const resPolicy = body.policy;
                expect(resPolicy).to.be.an("object");
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

    it("Get policy label relationships without auth - Negative", () => {
        getPolicyLabelRelationships(policyLabel.id, {})
            .its('status')
            .should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Get policy label relationships with incorrect auth - Negative", () => {
        getPolicyLabelRelationships(policyLabel.id, { authorization: "bearer invalid_token" })
            .its('status')
            .should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Get policy label relationships with empty auth - Negative", () => {
        getPolicyLabelRelationships(policyLabel.id, { authorization: "" })
            .its('status')
            .should('eq', STATUS_CODE.UNAUTHORIZED);
    });
});
