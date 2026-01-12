import { STATUS_CODE } from "../../../support/api/api-const";
import * as Authorization from "../../../support/authorization";

context("Get tokens for policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    let policyLabel, tokenLabel;

    before("Get published policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getPolicyLabels(auth).then(({ body }) => {
                policyLabel = body.find(el => el.status === "PUBLISHED");
            });
        });
    });

    it("Get tokens for policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getTokensForLabel(auth, policyLabel.id).then(({ body, status }) => {
                expect(status).eql(STATUS_CODE.OK);
                tokenLabel = body.at(0);

                const expectedProps = [
                    "createDate", "document", "documentFields", "documentFileId",
                    "hash", "id", "messageId", "owner", "policyId",
                    "relationships", "signature", "status", "tag", "topicId", "type"
                ];

                expectedProps.forEach(prop => {
                    expect(tokenLabel).to.have.property(prop);
                });
            });
        });
    });

    it("Get tokens for policy label - Negative Checks", () => {
        const invalidTokens = [null, "bearer 1111", ""];
        invalidTokens.forEach(token => {
            cy.getTokensForLabel(token, policyLabel.id)
                .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get tokens documents", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getTokenDocuments(auth, policyLabel.id, tokenLabel.id).then(({ body, status }) => {
                expect(status).eql(STATUS_CODE.OK);
                expect(body).to.have.all.keys("relatedDocuments", "targetDocument", "unrelatedDocuments");
            });
        });
    });

    it("Get tokens documents - Negative Checks", () => {
        const invalidTokens = [null, "bearer 1111", ""];
        invalidTokens.forEach(token => {
            cy.getTokenDocuments(token, policyLabel.id, tokenLabel.id)
                .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
        });
    });

});