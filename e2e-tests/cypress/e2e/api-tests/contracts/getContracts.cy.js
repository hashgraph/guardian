import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' },() => {
    const authorization = Cypress.env("authorization");
    it("get all contracts", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            if (resp.body.length != 0) {
                expect(resp.body.at(-1)).to.have.property("_id");
                expect(resp.body.at(-1)).to.have.property("contractId");
                expect(resp.body.at(-1)).to.have.property("status");
                expect(resp.body.at(-1)).to.have.property("isOwnerCreator");
                expect(resp.body.at(-1)).to.have.property("status");
            }
        });
    });
});
