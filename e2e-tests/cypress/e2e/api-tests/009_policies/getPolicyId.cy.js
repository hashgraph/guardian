import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context('Policies', { tags: ['policies', 'secondPool'] }, () => {
	const SRUsername = Cypress.env('SRUser');

	let policyId;

	before(() => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies,
				headers: {
					authorization,
				},
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				policyId = response.body.at(0).id;
			});
		})
	});

	it('Get policy configuration for the specified policy ID', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: 'GET',
				url: API.ApiServer + 'policies/' + policyId,
				headers: {
					authorization,
				}
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK)
				expect(response.body.id).to.equal(policyId)
			})
		})
	})
})
