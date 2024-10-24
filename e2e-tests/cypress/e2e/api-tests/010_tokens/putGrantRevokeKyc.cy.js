import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Tokens", { tags: ['tokens', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it("Set and unset the KYC flag for the user", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            //grant kyc
            cy.request({
                method: 'GET',
                url: API.ApiServer + 'tokens',
                headers: {
                    authorization
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let tokenId = response.body.at(-1).tokenId
                Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        let token = response.body.tokenId;
                        let kyc = response.body.kyc;
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
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.OK);
                            let token = response.body.tokenId;
                            let kyc = response.body.kyc;
                            expect(token).to.deep.equal(tokenId);
                            expect(kyc).to.be.false;
                        });
                    });
                });
            });
        })
    })
});
