import { STATUS_CODE } from "../../../support/api/api-const";
import * as Authorization from "../../../support/authorization";

context("Get policy labels", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    const labelName = "testPolicyLabelAPI";

    let policy, did, SRDid;

    before("Get policy ids and did", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getPolicyByName(auth, "iRec_4").then((p) => {
                policy = p;
            });

            cy.getUserProfile(auth, UserUsername).then((profile) => {
                did = profile.did;
                SRDid = profile.parent;
            });
        });
    });

    it("Get policy labels", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getPolicyLabels(auth).then(({ body, status }) => {
                expect(status).eql(STATUS_CODE.OK);

                // Assertions on the first item
                const firstLabel = body.at(0);
                expect(firstLabel.creator).eql(did);
                expect(firstLabel.description).eql(`${labelName} desc`);
                expect(firstLabel.name).eql(labelName);
                expect(firstLabel.policyId).eql(policy.id);
                expect(firstLabel.owner).eql(SRDid);
                expect(firstLabel.status).eql("DRAFT");
                expect(firstLabel.config.children).to.be.an('array').that.is.empty;

                // Bulk property checks
                body.forEach(item => {
                    const properties = ["config", "creator", "description", "id", "name", "owner", "policyId", "status"];
                    properties.forEach(prop => expect(item).to.have.property(prop));
                });
            });
        });
    });

    it("Get policy labels without auth - Negative", () => {
        cy.getPolicyLabels(null).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Get policy labels with incorrect auth - Negative", () => {
        cy.getPolicyLabels("bearer invalid_token_123").its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Get policy labels with empty auth - Negative", () => {
        cy.getPolicyLabels("").its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

});