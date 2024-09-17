import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool'] }, () => {
    const tagName = "contractTagAPI" + Math.floor(Math.random() * 999999);
    const contactName = "contractNameAPI" + Math.floor(Math.random() * 999999);
    const SRUsername = Cypress.env('SRUser');
    let tagId;
    let contractId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                body: {
                    description: contactName,
                    type: "RETIRE",
                },
                timeout: 200000
            }).then((response) => {
                contractId = response.body.id;
                cy.request({
                    method: 'POST',
                    url: API.ApiServer + API.Tags,
                    body: {
                        name: tagName,
                        description: tagName,
                        entity: "Contract",
                        target: contractId,
                    },
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    tagId = response.body.uuid;
                })
            });
        });
    })

    it("Delete tag", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: 'DELETE',
                url: API.ApiServer + API.Tags + tagId,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
            })
        })
    })
})
