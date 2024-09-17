import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tokens", { tags: ['tokens', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env("User");

    it("Get user information for the token", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body[0]).to.have.property("_id");
                expect(response.body[0]).to.have.property("tokenId");
                expect(response.body[0]).to.have.property("tokenName");

                const topicUid = response.body[0].tokenId;

                cy.request({
                    method: METHOD.GET,
                    url:
                        API.ApiServer +
                        API.ListOfTokens +
                        topicUid +
                        "/" +
                        UserUsername +
                        "/info",
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body).to.not.be.oneOf([null, ""]);
                });
            })
        });
    });
});
