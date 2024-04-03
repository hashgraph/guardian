import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies", { tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: `${API.ApiServer}policies/import/message`,
            body: { messageId: "1707125414.999819805" }, //Verra REDD 4
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });

    it("export policy message", () => {
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
            const name = response.body.at(-1).name;
            const owner = response.body.at(-1).owner;
            const description = response.body.at(-1).description;
            const url = {
                method: "GET",
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
                expect(response.status).to.eq(200);
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
