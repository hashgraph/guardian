import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' },() => {
    const authorization = Cypress.env("authorization");

    it("create contract", () => {
        const contractName = Math.floor(Math.random() * 999) + "APIContract";
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractName,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body).to.have.property("_id");
            expect(resp.body).to.have.property("description", contractName);
            expect(resp.body).to.have.property("contractId");
            expect(resp.body).to.have.property("owner");
            expect(resp.body).to.have.property("status", "APPROVED");
            expect(resp.body).to.have.property("isOwnerCreator", true);
        });
    });
});
