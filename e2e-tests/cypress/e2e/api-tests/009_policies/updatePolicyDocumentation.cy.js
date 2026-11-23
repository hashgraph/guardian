import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { publishOwnPolicyCopy } from '../../../support/CustomHelpers/ipfsSeeding';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';
import { randomInt } from '../../../support/random';

context('Update API documentation of a published policy', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
	const SRUsername = Cypress.expose('SRUser');
	const alias = `e2e-docs-${randomInt(1000000)}`;

	let policyId;

	const entry = (overrides = {}) => ({
		name: 'Apply',
		description: 'Documented after publish',
		target: 'create_application',
		method: 'POST',
		alias,
		...overrides,
	});

	const putDocumentation = (entries, failOnStatusCode = true) =>
		Authorization.getAccessToken(SRUsername).then((authorization) =>
			cy.request({
				method: METHOD.PUT,
				url: API.PolicyDocumentationUpdate(policyId),
				headers: { authorization },
				body: { entries },
				failOnStatusCode,
				timeout: TIMEOUTS.backend,
			}));

	const getDocumentation = () =>
		Authorization.getAccessToken(SRUsername).then((authorization) =>
			cy.request({
				method: METHOD.GET,
				url: API.PolicyDocumentation(policyId),
				headers: { authorization },
			}));

	// The policy is published, so its configuration is frozen: only the API documentation can still be saved.
	// A published policy cannot be deleted, so the copy stays; the documentation is cleared in the after hook.
	before('Publish a copy of the policy', () => {
		publishOwnPolicyCopy(SRUsername, 'iRec_4.policy').then((policy) => {
			expect(policy.status).to.eq('PUBLISH');
			policyId = policy.id;
		});
	});

	after('Clear the documentation', () => {
		if (policyId) {
			putDocumentation([]);
		}
	});

	it('Saves documentation entries of a published policy and generates their urls', () => {
		putDocumentation([entry()]).then((response) => {
			expect(response.status).to.eq(STATUS_CODE.OK);
			expect(response.body.status).to.eq('PUBLISH');
			expect(response.body.policyDocumentation).to.have.length(1);
		});
		getDocumentation().then((response) => {
			expect(response.status).to.eq(STATUS_CODE.OK);
			const saved = response.body.find((item) => item.alias === alias);
			expect(saved, 'the saved entry').to.exist;
			expect(saved.dmrvUrl).to.eq(`/api/v1/dmrv/${policyId}/${alias}`);
			expect(saved.url).to.eq(`/api/v1/policies/${policyId}/tag/create_application/blocks`);
		});
	});

	it('Serves the new alias without republishing', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.POST,
				url: API.DmrvByAlias(policyId, alias),
				headers: { authorization },
				body: {},
				failOnStatusCode: false,
				timeout: TIMEOUTS.backend,
			}).then((response) => {
				// the alias is resolved; the block itself may still answer with its own error
				expect(JSON.stringify(response.body)).to.not.include('No documented endpoint');
			});
		});
	});

	it('Rejects an entry for a block that does not exist', () => {
		putDocumentation([entry({ target: 'block_that_does_not_exist', alias: `${alias}-missing` })], false).then((response) => {
			expect(response.status).to.be.within(400, 599);
		});
		getDocumentation().then((response) => {
			expect(response.body.map((item) => item.alias)).to.deep.eq([alias]);
		});
	});

	it('Rejects the same alias and method twice', () => {
		putDocumentation([entry(), entry({ name: 'Apply again' })], false).then((response) => {
			expect(response.status).to.be.within(400, 599);
		});
	});

	it('Removes the documentation', () => {
		putDocumentation([]).then((response) => {
			expect(response.status).to.eq(STATUS_CODE.OK);
		});
		getDocumentation().then((response) => {
			expect(response.body).to.deep.eq([]);
		});
	});
});
