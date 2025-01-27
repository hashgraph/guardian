import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";
import * as Checks from "../../../support/checkingMethods";


context('Get policy test result', { tags: ['policies', 'secondPool', 'all'] }, () => {
	const SRUsername = Cypress.env('SRUser');
	let policyId, testId;

	before('Get test id', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies,
				headers: {
					authorization,
				},
				timeout: 180000
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				response.body.forEach(element => {
					if (element.name == "iRec_2") {
						policyId = element.id
					}
				})
				cy.request({
					method: METHOD.GET,
					url: API.ApiServer + API.Policies + policyId,
					headers: {
						authorization,
					}
				}).then((response) => {
					expect(response.status).to.eq(STATUS_CODE.OK)
					expect(response.body.id).to.equal(policyId)
					testId = response.body.tests.at(0).id
				})
			})
		})
	});

	it('Get policy test result', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			let requestForGettingPolicyTestResult = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId,
				headers: {
					authorization
				}
			}

			Checks.whilePolicyTestExecuting(requestForGettingPolicyTestResult)

			cy.request(requestForGettingPolicyTestResult).then((response) => { 
				expect(response.status).to.eq(STATUS_CODE.OK)
				expect(response.body.tests.at(0).result.total).to.eq(100)
			})
		})
	})
})
