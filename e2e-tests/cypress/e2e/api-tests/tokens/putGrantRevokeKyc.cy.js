import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", { tags: "@tokens" }, () => {
    const authorization = Cypress.env("authorization");
    const user = "Installer";
    let tokenId

    it("sets the KYC flag for the user", () => {
        //associate token
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
                }).then((response) => {
                    tokenId = response.body[-1].tokenId
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                        headers: {
                            authorization: accessToken
                        }
                    })
                })
            })
        })
        //grant kyc
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfTokens,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
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
});
