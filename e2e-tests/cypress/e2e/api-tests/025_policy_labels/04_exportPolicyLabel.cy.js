import { STATUS_CODE } from "../../../support/api/api-const";
import * as Authorization from "../../../support/authorization";

context("Export policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    let policyLabel;

    before("Get policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getPolicyLabels(auth).then(({ body }) => {
                policyLabel = body.at(0);
            });
        });
    });

    it("Export policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.exportPolicyLabel(auth, policyLabel.id).then(({ body, status }) => {
                expect(status).eql(STATUS_CODE.OK);
                expect(body).to.not.be.oneOf([null, ""]);

                cy.writeFile(
                    "cypress/fixtures/exportedLabel.label",
                    Cypress.Blob.arrayBufferToBinaryString(body),
                    "binary"
                );
            });
        });
    });

    it("Export policy label without auth - Negative", () => {
        cy.exportPolicyLabel(null, policyLabel.id)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Export policy label with incorrect auth - Negative", () => {
        cy.exportPolicyLabel("bearer invalid_token_123", policyLabel.id)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Export policy label with empty auth - Negative", () => {
        cy.exportPolicyLabel("", policyLabel.id)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

});