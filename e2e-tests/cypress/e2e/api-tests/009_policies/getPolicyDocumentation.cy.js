import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policy Documentation", { tags: ['policies', 'secondPool', 'all'] }, () => {
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
				expect(response.body.length).to.be.greaterThan(0);
				policyId = response.body.at(0).id;
			});
		});
	});

	it("Get policy documentation - GET /policies/{policyId}/about", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.PolicyDocumentation(policyId),
				headers: {
					authorization,
				},
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				expect(response.body).to.be.an("array");
			});
		});
	});

	it("Documentation entries have required fields", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.PolicyDocumentation(policyId),
				headers: {
					authorization,
				},
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				if (response.body.length > 0) {
					response.body.forEach((entry) => {
						expect(entry).to.have.property("name");
						expect(entry).to.have.property("description");
						expect(entry).to.have.property("method");
						expect(entry).to.have.property("url");
						expect(entry).to.have.property("alias");
						expect(entry).to.have.property("dmrvUrl");
						expect(["GET", "POST"]).to.include(entry.method);
					});
				}
			});
		});
	});

	it("POST entries have correct URL pattern", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.PolicyDocumentation(policyId),
				headers: {
					authorization,
				},
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				const postEntries = response.body.filter((e) => e.method === "POST");
				postEntries.forEach((entry) => {
					expect(entry.url).to.include("/api/v1/policies/");
					expect(entry.url).to.include("/tag/");
					expect(entry.dmrvUrl).to.include("/api/v1/dmrv/");
					expect(entry.dmrvUrl).to.include(entry.alias);
				});
			});
		});
	});

	it("GET entries have correct URL pattern", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.PolicyDocumentation(policyId),
				headers: {
					authorization,
				},
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				const getEntries = response.body.filter((e) => e.method === "GET");
				getEntries.forEach((entry) => {
					expect(entry.url).to.include("/api/v1/policies/");
					expect(entry.url).to.include("/tag/");
					expect(entry.dmrvUrl).to.include("/api/v1/dmrv/");
					expect(entry.dmrvUrl).to.include(entry.alias);
				});
			});
		});
	});

	it("URLs are relative (no domain/host)", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.PolicyDocumentation(policyId),
				headers: {
					authorization,
				},
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				response.body.forEach((entry) => {
					expect(entry.url).to.match(/^\/api\/v1\//);
					expect(entry.url).to.not.match(/^https?:\/\//);
					expect(entry.dmrvUrl).to.match(/^\/api\/v1\/dmrv\//);
				});
			});
		});
	});

	it("DMRV proxy with invalid alias returns 404", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + `dmrv/${policyId}/nonexistent-alias`,
				headers: {
					authorization,
				},
				failOnStatusCode: false,
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.NOT_FOUND);
			});
		});
	});

	it("Documentation without authorization returns 401", () => {
		cy.request({
			method: METHOD.GET,
			url: API.PolicyDocumentation(policyId),
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("DMRV proxy without authorization returns 401", () => {
		cy.request({
			method: METHOD.GET,
			url: API.ApiServer + `dmrv/${policyId}/some-alias`,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
		});
	});
});
