import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        const urlPolicies = {
            method: METHOD.GET,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            const policyId = response.body.at(-1).id;

            const url = {
                method: METHOD.GET,
                url:
                    API.ApiServer +
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

    it("Push import new policy and all associated artifacts", () => {
        cy.fixture("exportedPolicy.policy", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + 'policies/push/import/file',
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 180000,
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
                });
            });
    });
});
