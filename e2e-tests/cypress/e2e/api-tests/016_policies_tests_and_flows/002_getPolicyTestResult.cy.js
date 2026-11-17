import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Get policy test result', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
	const SRUsername = Cypress.env('SRUser');
	let policyId;

	before('Get test id', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies,
				headers: {
					authorization,
				},
				timeout: TIMEOUTS.backend
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				//The same copy the import spec works on: iterating and keeping the last match
				//picks a different one as soon as the instance holds more than one
				const policy = response.body.find((element) => element.name === 'iRecDRF');
				expect(policy, 'the iRecDRF policy').to.not.be.undefined;
				policyId = policy.id;
				cy.request({
					method: METHOD.GET,
					url: API.ApiServer + API.Policies + policyId,
					headers: {
						authorization,
					}
				}).then((response) => {
					expect(response.status).to.eq(STATUS_CODE.OK)
					expect(response.body.id).to.equal(policyId)
					expect(response.body.tests).to.have.length.greaterThan(0)
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
