import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context(" Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {
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

	it("Validate the policy", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId,
				headers: {
					authorization,
				}
			}).then((response) => {
				const config = response.body.config;
				const policyGroups = response.body.policyGroups;
				const policyRoles = response.body.policyRoles;
				const policyTokens = response.body.policyTokens;
				const policyTopics = response.body.policyTopics;
				const topicId = response.body.topicId;

				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + API.Validate,
					headers: {
						authorization
					},
					body:
					{
						config,
						policyGroups,
						policyRoles,
						policyTokens,
						policyTopics,
						topicId
					}
				}).then((response) => {
					expect(response.status).to.eq(STATUS_CODE.OK);
					expect(response.body.results.isValid).to.eq(true);
				});
			})
		});
	})
});

