import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1707125414.999819805" }, //Verra REDD 4
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
        });
    });

    it("export policy message", () => {
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
            const name = response.body.at(-1).name;
            const owner = response.body.at(-1).owner;
            const description = response.body.at(-1).description;
            const url = {
                method: METHOD.GET,
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/export/message",
                headers: {
                    authorization,
                },
            };
            cy.request(url).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.have.property("id", policyId);
                expect(response.body).to.have.property("name", name);
                expect(response.body).to.have.property(
                    "description",
                    description
                );
                expect(response.body).to.have.property("owner", owner);
            });
        });
    });
});
