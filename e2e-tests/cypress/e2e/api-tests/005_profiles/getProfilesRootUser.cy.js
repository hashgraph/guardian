import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Profiles', { tags: ['profiles', 'thirdPool'] }, () => {
	const SRUsername = Cypress.env('SRUser');

	it('Get user account information', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + 'profiles/' + SRUsername,
				headers: {
					authorization,
				}
			}).should((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK)
				expect(response.body).to.have.property('confirmed')
				expect(response.body).to.have.property('failed')
				expect(response.body).to.have.property('username', SRUsername)
				expect(response.body).to.have.property('role', 'STANDARD_REGISTRY')
				expect(response.body).to.have.property('hederaAccountId')
				expect(response.body).to.have.property('did')
				expect(response.body).to.have.property('didDocument')
				expect(response.body).to.have.property('vcDocument')
			})
		})
	})
})
