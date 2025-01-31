import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context('Start policy test', { tags: ['policies', 'secondPool', 'all'] }, () => {
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

	it('Start policy test', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.Policies + policyId + "/" + API.Test + testId + "/" + API.Start,
				headers: {
					authorization,
				},
				timeout: 180000,
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				expect(response.body.id).to.equal(testId);
				expect(response.body.progress).to.equal(0);
			});
		})
	})

    it("Start policy test without auth token - Negative", () => {
        cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.Policies + policyId + "/" + API.Test + testId + "/" + API.Start,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Start policy test with invalid auth token - Negative", () => {
        cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.Policies + policyId + "/" + API.Test + testId + "/" + API.Start,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Start policy test with empty auth token - Negative", () => {
        cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.Policies + policyId + "/" + API.Test + testId + "/" + API.Start,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
