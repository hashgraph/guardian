import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policies', { tags: '@policies' },() => {
    const authorization = Cypress.env('authorization');

    it('Make the group active', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            const policyId = response.body.at(0).id;
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.PolicyGroups,
                body: {},
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
            })
        })
    })
})
