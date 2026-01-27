import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get tokens for policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    let policyLabel, tokenLabel;

    const getPolicyLabels = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}`,
            headers,
            failOnStatusCode: false,
        });

    const getTokensForLabel = (labelId, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}${labelId}/${API.ListOfTokens}`,
            headers,
            failOnStatusCode: false,
        });

    const getTokenDocuments = (labelId, tokenId, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}${labelId}/${API.ListOfTokens}${tokenId}`,
            headers,
            failOnStatusCode: false,
        });

    before("Get published policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            getPolicyLabels({ authorization: auth }).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);
                expect(body).to.be.an("array");

                policyLabel = body.find((el) => el.status === "PUBLISHED");
                if (!policyLabel) {
                    throw new Error('No policy label with status "PUBLISHED" was found. Prepare test data first.');
                }
            });
        });
    });

    it("Get tokens for policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            getTokensForLabel(policyLabel.id, { authorization: auth }).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);
                expect(body).to.be.an("array").and.not.be.empty;

                tokenLabel = body.at(0);

                const expectedProps = [
                    "createDate",
                    "document",
                    "documentFields",
                    "documentFileId",
                    "hash",
                    "id",
                    "messageId",
                    "owner",
                    "policyId",
                    "relationships",
                    "signature",
                    "status",
                    "tag",
                    "topicId",
                    "type",
                ];

                expectedProps.forEach((prop) => {
                    expect(tokenLabel).to.have.property(prop);
                });
            });
        });
    });

    it("Get tokens for policy label - Negative Checks", () => {
        const invalidTokens = [null, "bearer 1111", ""];
        invalidTokens.forEach((badToken) => {
            const headers = badToken ? { authorization: badToken } : {};
            getTokensForLabel(policyLabel.id, headers)
                .its("status")
                .should("eq", STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get tokens documents", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            getTokenDocuments(policyLabel.id, tokenLabel.id, { authorization: auth }).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);
                expect(body).to.have.all.keys("relatedDocuments", "targetDocument", "unrelatedDocuments");
            });
        });
    });

    it("Get tokens documents - Negative Checks", () => {
        const invalidTokens = [null, "bearer 1111", ""];
        invalidTokens.forEach((badToken) => {
            const headers = badToken ? { authorization: badToken } : {};
            getTokenDocuments(policyLabel.id, tokenLabel.id, headers)
                .its("status")
                .should("eq", STATUS_CODE.UNAUTHORIZED);
        });
    });
});
