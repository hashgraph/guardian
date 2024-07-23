import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const authorization = Cypress.env("authorization");
    let policyId;

    before(() => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1707125414.999819805" }, //iRec2
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            policyId = response.body.at(0).id;
        });
    });

    it("Update policy configuration for the specified policy ID", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + "policies/" + policyId,
            headers: {
                authorization,
            },
            body: {
                id: policyId,
                uuid: "string",
                name: "string",
                version: "string",
                description: "string",
                topicDescription: "string",
                config: {},
                status: "string",
                owner: "string",
                policyRoles: ["string"],
                topicId: "string",
                policyTag: "string",
                policyTopics: [
                    {
                        name: "string",
                        description: "string",
                        type: "string",
                        static: true,
                    },
                ],
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
        });
    });
});
