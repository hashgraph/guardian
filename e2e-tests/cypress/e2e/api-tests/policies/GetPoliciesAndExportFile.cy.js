import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: `${API.ApiServer}policies/import/message`,
            body: { messageId: "1678448090.308458565" }, //Verra REDD 3
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });

    it("check returns of the blocks", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        }).then((response) => {
            let policyId = response.body.at(-1).id;

            const url = {
                method: "GET",
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
                expect(response.status).to.eq(200);
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
