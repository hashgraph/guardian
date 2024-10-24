import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context('Profiles', { tags: ['profiles', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Get Hedera account balance', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const options = {
                method: 'GET',
                url: API.ApiServer + 'profiles/' + SRUsername + '/balance',
                headers: {
                    authorization
                }
            };
            cy.request(options)
                .should((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK)
                })
        })
    })
})
