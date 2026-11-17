import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Policies', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
	const SRUsername = Cypress.env('SRUser');

	let policyId;
	const tag = 'approve_registrant_btn';

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

	it('Get block data by tag', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url:
					API.ApiServer + 'policies/' + policyId + '/tag/' + tag + '/blocks',
				headers: {
					authorization,
				},
				timeout: TIMEOUTS.backend
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
			});
		});
	})
});
