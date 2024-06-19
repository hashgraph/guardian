import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policies', { tags: '@policies' }, () => {
    const authorization = Cypress.env('authorization');

    it('Imports new policy and all associated artifacts from file', { tags: ['smoke'] }, () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: {messageId: (Cypress.env('policy_with_artifacts'))}, //Remote Work GHG Policy
            headers: {
                authorization,
            },
            timeout: 300000
        })
            .then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            })
    })
})
