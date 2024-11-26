import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Trustchains", { tags: ['trustchains', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;

    before("Get contract ids for import", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                }
            }).then((response) => {
                policyId = response.body.at(0).id;
                expect(response.status).to.eq(STATUS_CODE.OK)
            })
        })
    })

    it('Get all VP documents and hash', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + policyId + "/" + API.TrustChainBlock,
                headers: {
                    authorization
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("hash");
            })
        })
    })
});

