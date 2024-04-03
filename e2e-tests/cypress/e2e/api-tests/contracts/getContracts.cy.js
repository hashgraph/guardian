import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Contracts", { tags: '@contracts' },() => {
    const authorization = Cypress.env("authorization");
    before(() => {
        const contractNameR = Math.floor(Math.random() * 999) + "RCon4RequestsTests";
        const contractNameW = Math.floor(Math.random() * 999) + "WCon4RequestsTests";
        let policyid
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractNameR,
                "type": "RETIRE",
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.SUCCESS);
        });
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
            body: {
                "description": contractNameW,
                "type": "WIPE",
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.SUCCESS);
        });
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: {
                "messageId": Cypress.env('policy_for_compare1')//iRec 4
            },
            headers: {
                authorization,
            },
            timeout: 180000
        })
            .then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                policyid = response.body.at(-1).id;
            })
    })

    it("Get list of contracts", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body.at(-1)).to.have.property("_id");
            expect(resp.body.at(-1)).to.have.property("contractId");
            expect(resp.body.at(-1)).to.have.property("type");
            expect(resp.body.at(-1)).to.have.property("description");
            expect(resp.body.at(-1)).to.have.property("owner");
        });
    });


    it("Get list of contracts without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of contracts with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
