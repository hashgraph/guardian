import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", { tags: "@tokens" }, () => {
    const authorization = Cypress.env("authorization");
    const user = Cypress.env("root_user");

    it("Push set the KYC flag for the user", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfTokens,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);

            const tokenId = response.body[0].tokenId;

            cy.request({
                method: METHOD.PUT,
                url:
                    API.ApiServer +
                    API.ListOfTokens +
                    "push/" +
                    tokenId +
                    "/" +
                    user +
                    "/grant-kyc",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
            });
        });
    });

    it("Push unset the KYC flag for the user", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfTokens,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);

            const tokenId = response.body[0].tokenId;

            cy.request({
                method: METHOD.PUT,
                url:
                    API.ApiServer +
                    API.ListOfTokens +
                    "push/" +
                    tokenId +
                    "/" +
                    user +
                    "/revoke-kyc",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
            });
        });
    });
});
