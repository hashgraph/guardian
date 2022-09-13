import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("get all schemas by schema entity", () => {
        const items = [
            "STANDARD_REGISTRY",
            "USER",
            "POLICY",
            "MINT_TOKEN",
            "WIPE_TOKEN",
            "MINT_NFTOKEN",
        ];
        let randomItem = items[Math.floor(Math.random() * items.length)];
        cy.sendRequest(METHOD.GET, API.SchemasSystemEntity + randomItem, {
            authorization,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
        });
    });
});
