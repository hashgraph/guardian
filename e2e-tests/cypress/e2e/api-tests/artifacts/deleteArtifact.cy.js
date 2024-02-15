import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: "@artifacts" }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: (Cypress.env('irec_policy')) }, //Remote Work GHG Policy changed to iRec 3
            headers: {
                authorization,
            },
            timeout: 300000,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);
        });

        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;
            const url = {
                method: "GET",
                url:
                API.ApiServer + "policies/" + policyId + "/export/file",
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
