import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "contractTagAPI" + Math.floor(Math.random() * 999999);
    const contactName = "contractNameAPI" + Math.floor(Math.random() * 999999);
    let contractId;

    before(() => {
        //create a contract for tag synchronization
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "RETIRE"
                }
            }).then((response) => {
                contractId = response.body.at(0).id;
            })
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

    it("Synchronization a tag without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Tags + "synchronization",
            body: {
                entity: "Contract",
                target: contractId,
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Synchronization a tag with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Tags + "synchronization",
            body: {
                entity: "Contract",
                target: contractId,
            },
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Synchronization a tag with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Tags + "synchronization",
            body: {
                entity: "Contract",
                target: contractId,
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
