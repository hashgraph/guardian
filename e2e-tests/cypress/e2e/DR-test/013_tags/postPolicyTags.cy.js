import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const policyTag = "Tag_16850108144002" + Math.floor(Math.random() * 999999);
    const tagName = "policyTagAPI" + Math.floor(Math.random() * 999999);
    const policyName = "policyNameAPI" + Math.floor(Math.random() * 999999);
    let tagId;
    let policyId;

    before(() => {
        //create a policy for tag addition
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
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
            });
        })
    });


    it("Create new tag(policy)", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
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
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            })
        })
    })
})
