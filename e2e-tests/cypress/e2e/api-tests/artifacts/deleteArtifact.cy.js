import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: "@artifacts" }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1650282926.728623821" },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });

        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            const url = {
                method: "GET",
                url: API.ApiServer + "policies/" + policyId + "/export/file",
                encoding: null,
                headers: {
                    authorization,
                },
            };
            cy.request(url).then((response) => {
                let policy = Cypress.Blob.arrayBufferToBinaryString(
                    response.body
                );
                cy.writeFile(
                    "cypress/fixtures/exportedPolicy.policy",
                    policy,
                    "binary"
                );
            });
        });
    });

    it("should delete artifact", () => {
        const urlArtifact = {
            method: METHOD.GET,
            url: API.ApiServer + API.Artifacts,
            headers: {
                authorization,
            },
        };

        cy.request(urlArtifact).should((response) => {
            expect(response.status).to.eq(200);
            const artifactId = response.body.at(-1).id;

            cy.request({
                url: API.ApiServer + API.Artifacts + artifactId,
                method: "DELETE",
                headers: {
                    Authorization: authorization,
                },
            })
                .its("status")
                .should("be.equal", 201);
        });
    });
});
