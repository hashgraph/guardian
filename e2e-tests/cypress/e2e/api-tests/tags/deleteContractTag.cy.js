import {STATUS_CODE} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Tags", {tags: '@tags'}, () => {
    const tagName = "contractTagAPI" + Math.floor(Math.random() * 999999);
    const contactName = "contractNameAPI" + Math.floor(Math.random() * 999999);
    const authorization = Cypress.env("authorization");
    let tagId;
    let contractId;

    before(() => {
        cy.request({
            method: "POST",
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

    it("Delete tag", () => {
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
