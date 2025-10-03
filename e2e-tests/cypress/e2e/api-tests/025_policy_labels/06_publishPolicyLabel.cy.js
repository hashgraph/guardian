import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Publish policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');

    let policyLabel;

    before("Get policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                policyLabel = response.body.at(0);
            })
        });
    })

    it("Publish policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Publish,
                headers: {
                    authorization,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.id).eql(policyLabel.id);
                expect(response.body.creator).eql(policyLabel.creator);
                expect(response.body.owner).eql(policyLabel.owner);
                expect(response.body.name).eql(policyLabel.name);
                expect(response.body.description).eql(policyLabel.description);
                expect(response.body.policyId).eql(policyLabel.policyId);
                expect(response.body.status).eql("PUBLISHED");
            });
        })
    });

    it("Publish policy label without auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Publish,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Publish policy label with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Publish,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    })

    it("Publish policy label with empty auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Publish,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    })
});
