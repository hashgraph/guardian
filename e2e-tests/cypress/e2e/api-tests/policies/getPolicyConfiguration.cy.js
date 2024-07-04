import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context('Policies', { tags: ['policies', 'secondPool'] }, () => {
    const authorization = Cypress.env('authorization');
    let policyId;

    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: (Cypress.env('irec_policy')) },
            headers: {
                authorization,
            },
            timeout: 180000
        }).then((response) => {
            policyId = response.body.at(0).id;
        })
    })

    it('Retrieves policy configuration for the specified policy ID', () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId,
            headers: {
                authorization,
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            expect(response.body.description).to.eq("iRec Description");
            expect(response.body.status).to.eq("DRAFT");
        })
    })

    it("Retrieves policy configuration for the specified policy ID without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Retrieves policy configuration for the specified policy ID with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Retrieves policy configuration for the specified policy ID with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
