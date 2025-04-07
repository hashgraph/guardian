import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let schemaId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Tags + "schemas",
                headers: {
                    authorization,
                }
            }).then((response) => {
                schemaId = response.body.at(0).id;    
            })
        })
    });

    it("Publish the schema with the provided (internal) schema ID without auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Tags + "schemas/" + schemaId + "/publish",
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Tags + "schemas/" + schemaId + "/publish",
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Tags + "schemas/" + schemaId + "/publish",
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish the schema with the provided (internal) schema ID", () => {
        //publish tag schema
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Tags + "schemas/" + schemaId + "/publish",
                headers: {
                    authorization,
                },
                timeout: 200000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        })
    });
})
