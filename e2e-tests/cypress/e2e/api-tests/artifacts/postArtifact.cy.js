import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: "@artifacts" }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {

        cy.request({
            method: "POST",
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1674827265.374101003" }, //Remote Work GHG Policy
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
                url:
                API.ApiServer+
                    "policies/" +
                    policyId +
                    "/export/file",
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

    it("check returns of all policies", () => {
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
