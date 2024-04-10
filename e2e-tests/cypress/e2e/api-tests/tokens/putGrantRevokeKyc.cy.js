import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", { tags: "@tokens" }, () => {
    const authorization = Cypress.env("authorization");
    const user = "Installer";

    it("Set and unset the KYC flag for the user", () => {
        //grant kyc
        cy.request({
            method: 'POST',
            url: API.ApiServer + 'accounts/login',
            body: {
                username: user,
                password: "test",
            }
        }).then((response) => {
            cy.request({
                method: 'POST',
                url: API.ApiServer + 'accounts/access-token',
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = "Bearer " + response.body.accessToken
                cy.request({
                    method: 'GET',
                    url: API.ApiServer + 'tokens',
                    headers: {
                        authorization: accessToken
                    }
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);
                    let tokenId = resp.body.at(-1).tokenId
                    cy.request({
                        method: METHOD.PUT,
                        url:
                            API.ApiServer +
                            API.ListOfTokens +
                            tokenId +
                            "/" +
                            user +
                            "/grant-kyc",
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
                                API.ApiServer +
                                API.ListOfTokens +
                                tokenId +
                                "/" +
                                user +
                                "/revoke-kyc",
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
        })
    })
});
