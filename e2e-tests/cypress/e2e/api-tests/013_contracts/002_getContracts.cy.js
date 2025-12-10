import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/checkingMethods";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    it("Get list of retire contracts", () => {
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
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(-1)).to.have.property("_id");
                expect(response.body.at(-1)).to.have.property("contractId");
                expect(response.body.at(-1)).to.have.property("type");
                expect(response.body.at(-1).type).eql("RETIRE");
                expect(response.body.at(-1)).to.have.property("description");
                expect(response.body.at(-1)).to.have.property("owner");
            });
        })
    });

    it("Get list of wipe contracts", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                qs: {
                    type: "WIPE"
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(-1)).to.have.property("_id");
                expect(response.body.at(-1)).to.have.property("contractId");
                expect(response.body.at(-1)).to.have.property("type");
                expect(response.body.at(-1).type).eql("WIPE");
                expect(response.body.at(-1)).to.have.property("description");
                expect(response.body.at(-1)).to.have.property("owner");
            });
        })
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

    it("Get list of contracts as User", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(-1)).to.have.property("_id");
                expect(response.body.at(-1)).to.have.property("contractId");
                expect(response.body.at(-1)).to.have.property("type");
                expect(response.body.at(-1).type).eql("RETIRE");
                expect(response.body.at(-1)).to.have.property("description");
                expect(response.body.at(-1)).to.have.property("owner");
            });
        });
    })
});
