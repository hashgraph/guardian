import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Export policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    let policyLabel;

    const getPolicyLabels = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}`,
            headers,
            failOnStatusCode: false,
        });

    const exportPolicyLabel = (labelId, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.PolicyLabels}${labelId}/${API.ExportFile}`,
            encoding: null,
            headers,
            failOnStatusCode: false,
        });

    before("Get policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            getPolicyLabels({ authorization: auth }).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);
                expect(body).to.be.an("array").and.not.be.empty;

                // Pick the first label (or adjust selection logic if needed)
                policyLabel = body.at(0);
                expect(policyLabel).to.have.property("id");
            });
        });
    });

    it("Export policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            exportPolicyLabel(policyLabel.id, { authorization: auth }).then(({ body, status }) => {
                expect(status).to.eq(STATUS_CODE.OK);
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
        exportPolicyLabel(policyLabel.id, {})
            .its("status")
            .should("eq", STATUS_CODE.UNAUTHORIZED);
    });

    it("Export policy label with incorrect auth - Negative", () => {
        exportPolicyLabel(policyLabel.id, { authorization: "bearer invalid_token_123" })
            .its("status")
            .should("eq", STATUS_CODE.UNAUTHORIZED);
    });

    it("Export policy label with empty auth - Negative", () => {
        exportPolicyLabel(policyLabel.id, { authorization: "" })
            .its("status")
            .should("eq", STATUS_CODE.UNAUTHORIZED);
    });
});
