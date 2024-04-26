import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1707125414.999819805" },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
        });
    });

    it("Get the Hedera message ID for the specified policy", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            let policyId = response.body.at(-1).id;

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
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, ""]);
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
});
