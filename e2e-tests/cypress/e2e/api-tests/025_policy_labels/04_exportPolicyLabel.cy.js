import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Export policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
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

    it("Export policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ExportFile,
                encoding: null,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, ""]);
                cy.writeFile(
                    "cypress/fixtures/exportedLabel.label",
                    Cypress.Blob.arrayBufferToBinaryString(response.body),
                    "binary"
                );
            });
        })
    });

    it("Export policy label without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ExportFile,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Export policy label with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ExportFile,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Export policy label with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ExportFile,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
