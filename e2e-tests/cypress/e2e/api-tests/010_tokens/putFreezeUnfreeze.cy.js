import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tokens", { tags: ['tokens', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it("Freeze and unfreeze transfers of the specified token for the user", { tags: ['smoke'] }, () => {
        //associate token
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: 'GET',
                url: API.ApiServer + 'tokens',
                headers: {
                    authorization
                }
            }).then((response) => {
                let tokenId = response.body.at(-1).tokenId
                Authorization.getAccessToken(SRUsername).then((authorization) => {
                    cy.request({
                        method: METHOD.PUT,
                        url:
                            API.ApiServer +
                            API.ListOfTokens +
                            tokenId +
                            "/" +
                            UserUsername +
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
                                UserUsername +
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
