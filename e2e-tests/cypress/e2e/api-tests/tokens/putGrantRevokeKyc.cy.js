import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens",{ tags: '@tokens' }, () => {
    const authorization = Cypress.env("authorization");
    const user = Cypress.env("root_user");

    it("sets the KYC flag for the user", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.ListOfTokens,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);

            const tokenId = resp.body[0].tokenId;

            cy.request({
                method: METHOD.PUT,
                url:
                    Cypress.env("api_server") +
                    API.ListOfTokens +
                    tokenId +
                    "/" +
                    user +
                    "/grantKyc",
                headers: {
                    authorization,
                },
            }).then((resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);

                let token = resp.body.tokenId;
                let kyc = resp.body.kyc;

                expect(token).to.deep.equal(tokenId);
                expect(kyc).to.be.true;

                cy.request({
                    method: METHOD.PUT,
                    url:
                        Cypress.env("api_server") +
                        API.ListOfTokens +
                        tokenId +
                        "/" +
                        user +
                        "/revokeKyc",
                    headers: {
                        authorization,
                    },
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);

                    let token = resp.body.tokenId;
                    let kyc = resp.body.kyc;

                    expect(token).to.deep.equal(tokenId);
                    expect(kyc).to.be.false;
                });
            });
        });
    });
});
