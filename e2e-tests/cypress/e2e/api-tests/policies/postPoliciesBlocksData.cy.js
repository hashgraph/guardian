import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsg,
                body: { messageId: (Cypress.env('irec_policy')) },
                headers: {
                    authorization,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            });
        })
    });


    it("Send data to the specified block", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                const policyId = response.body.at(-1).id;
                const blockId = response.body.at(-1).uuid;

                cy.request({
                    method: METHOD.POST,
                    url:
                        API.ApiServer +
                        "policies/" +
                        policyId +
                        "/blocks/" +
                        blockId,
                    headers: {
                        authorization,
                    },
                    body: {},
                    timeout: 180000
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                });
            });
        });
    })
});

