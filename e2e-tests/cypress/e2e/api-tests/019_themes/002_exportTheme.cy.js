import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Export Policy Themes', { tags: ['themes', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const themeName = "ThemeAPI";

    let themeId;

    before('Get theme id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Themes,
                headers: {
                    authorization,
                },
                timeout: 60000,
            }).then((response) => {
                themeId = response.body.at(0).id;
            });
        })
    })

    it('Export theme', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Themes + themeId + "/" + API.ExportFile,
                headers: {
                    authorization,
                },
                timeout: 60000,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.headers).to.have.property("content-type","application/zip");
                expect(response.body).not.eql(null);
            })
        });
    });

    it("Export theme without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes + themeId + "/" + API.ExportFile,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Export theme with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes + themeId + "/" + API.ExportFile,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Export theme with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Themes + themeId + "/" + API.ExportFile,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
