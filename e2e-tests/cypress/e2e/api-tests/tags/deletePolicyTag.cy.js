import {STATUS_CODE} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Tags", {tags: '@tags'}, () => {
    const policyTag = "Tag_16850108144002" + Math.floor(Math.random() * 999999);
    const tagName = "policyTagAPI" + Math.floor(Math.random() * 999999);
    const policyName = "policyNameAPI" + Math.floor(Math.random() * 999999);
    const authorization = Cypress.env("authorization");
    let tagId;
    let policyId;

    before(() => {
        //create policy and tag for tag deletion
        cy.request({
            method: "POST",
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            body: {
                name: policyName,
                description: policyName,
                topicDescription: policyTag,
                policyTag: policyTag,
            },
            timeout: 200000
        }).then((response) => {
            policyId = response.body.at(-1).id;
            cy.request({
                method: 'POST',
                url: API.ApiServer + API.Tags,
                body: {
                    name: tagName,
                    description: tagName,
                    entity: "Policy",
                    target: policyId,
                },
                headers: {
                    authorization,
                }
            }).then((response) => {
                tagId = response.body.uuid;
            })
        });
    });


    it("Delete tag(policy)", () => {
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
