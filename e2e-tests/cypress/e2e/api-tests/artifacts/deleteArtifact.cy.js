import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: "@artifacts" }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: (Cypress.env('policy_with_artifacts')) }, //Remote Work GHG Policy
            headers: {
                authorization,
            },
            timeout: 300000,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
        });
    });

    it("Delete artifact", () => {
        const urlArtifact = {
            method: METHOD.GET,
            url: API.ApiServer + API.Artifacts,
            headers: {
                authorization,
            },
        };

        cy.request(urlArtifact).then((response) => {
            expect(response.status).to.eq(200);
            const artifactId = response.body.at(0).id;

            cy.request({
                url: API.ApiServer + API.Artifacts + artifactId,
                method: "DELETE",
                headers: {
                authorization,
            },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.NO_CONTENT);
            });
        });
    });
});
