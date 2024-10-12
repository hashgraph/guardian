import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", { tags: ['tokens', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");
    const user = "Installer";

    it("Freeze and unfreeze transfers of the specified token for the user", { tags: ['smoke'] }, () => {
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
                    let tokenId = response.body.at(-1).tokenId
                    cy.request({
                        method: 'PUT',
                        url: API.ApiServer + 'tokens/' + tokenId + '/associate',
                        headers: {
                            authorization: accessToken
                        }
                    }).then((response) => {
                        cy.request({
                            method: METHOD.PUT,
                            url:
                                API.ApiServer +
                                API.ListOfTokens +
                                tokenId +
                                "/" +
                                user +
                                "/freeze",
                            headers: {
                                authorization,
                            },
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.OK);

                            let token = response.body.tokenId;
                            let frozen = response.body.frozen;

                            expect(token).to.deep.equal(tokenId);
                            expect(frozen).to.be.true;

                            cy.request({
                                method: METHOD.PUT,
                                url:
                                    API.ApiServer +
                                    API.ListOfTokens +
                                    tokenId +
                                    "/" +
                                    user +
                                    "/unfreeze",
                                headers: {
                                    authorization,
                                },
                            }).then((response) => {
                                expect(response.status).eql(STATUS_CODE.OK);

                                let token = response.body.tokenId;
                                let frozen = response.body.frozen;

                                expect(token).to.deep.equal(tokenId);
                                expect(frozen).to.be.false;
                            });
                        });

                   })
                })
            })
        })
    });
});
