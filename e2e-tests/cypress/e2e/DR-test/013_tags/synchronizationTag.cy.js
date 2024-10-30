import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "contractTagAPI" + Math.floor(Math.random() * 999999);
    const contactName = "contractNameAPI" + Math.floor(Math.random() * 999999);
    let contractId;

    before(() => {
        //create a contract for tag synchronization
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
            });
        })
    });


    it("Synchronization a tag", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Tags + "synchronization",
                body: {
                    entity: "Contract",
                    target: contractId,
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            })
        })
    })
})
