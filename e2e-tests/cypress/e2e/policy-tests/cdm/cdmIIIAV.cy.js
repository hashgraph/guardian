import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Policy autotest", { tags: ['policyAT'] }, () => {
    const authorization = Cypress.env("authorization");
    var policyId, testId;

    it("Run test for CDM AMS-III.AV", () => {
        //import policy with tests
        cy.readFile("../Methodology Library/CDM/CDM AMS-III.AV/CDM AMS-III.AV Policy.policy", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + 'policies/import/file?demo=true',
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 180000,
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                });
            })

        //get policy id and test id
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            policyId = response.body.at(0).id;
            testId = response.body.at(0).tests.at(0).id;
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/test/" + testId + "/start",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            })

            cy.wait(90000);
            
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.at(0).tests.at(0).status).to.eq("Success");
            })
        })
        
    })
});
