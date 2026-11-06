import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Policies', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
	const SRUsername = Cypress.env('SRUser');

	let policyId; let blockId;

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
				cy.request({
					method: METHOD.GET,
					url: API.ApiServer + API.Policies + policyId,
					headers: {
						authorization,
					},
				}).then((response) => {
					blockId = response.body.config.id;
				})
			});
		})
	});

	it('Get block data', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request;
			const url = {
				method: METHOD.GET,
				url:
					API.ApiServer + 'policies/' + policyId + '/blocks/' + blockId,
				headers: {
					authorization,
				},
				timeout: TIMEOUTS.backend
			};
			cy.request(url).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
			});
		});
	})
});
