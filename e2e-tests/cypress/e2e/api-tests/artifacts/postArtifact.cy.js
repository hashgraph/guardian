import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: "@artifacts" }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {

        cy.request({
            method: "POST",
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: (Cypress.env('irec_policy')) }, //Remote Work GHG Policy
            headers: {
                authorization,
            },
            timeout: 300000,
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

        cy.request(urlPolicies).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            const url = {
                method: "GET",
                url:
                API.ApiServer+
                    "policies/" +
                    policyId +
                    "/export/file",
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

    it("Upload artifact", () => {
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

            cy.fixture("exportedPolicy.policy", 'binary')
            .then((file) => Cypress.Blob.binaryStringToBlob(file))
            .then((blob) => {

                var formdata = new FormData();
                formdata.append("file", blob, "exportedPolicy.policy");

                cy.request({
                    url: API.ApiServer + API.Artifacts + policyId,
                    method: "POST",
                    headers: {
                        Authorization: authorization,
                        'content-type': 'multipart/form-data'
                    },
                    body: formdata
                }).its('status').should('be.equal', 201)
            })
        });
    });
});
