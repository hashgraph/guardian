import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "contractTagAPI" + Math.floor(Math.random() * 999999);
    const contactName = "contractNameAPI" + Math.floor(Math.random() * 999999);
    let contractId;
    let tagId;

    before(() => {
        //create a contract for tag searching
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
                    method: METHOD.POST,
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
                });
            });
        })
    });


    it("Search tags", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Tags + "search",
                body: {
                    entity: "Contract",
                    targets: [contractId],
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.body[contractId].entity).to.eq("Contract");
                expect(response.body[contractId].target).to.eq(contractId);
                expect(response.body[contractId].tags.at(0).uuid).to.eq(tagId);
                expect(response.status).to.eq(STATUS_CODE.OK);
            })
        })
    })
})
