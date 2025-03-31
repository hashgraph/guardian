import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Set branding", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    it("Set branding", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Branding,
                body: {
                    headerColor: "#ffffff",
                    primaryColor: "#999999",
                    companyName: "TestAPI",
                    companyLogoUrl: "",
                    loginBannerUrl: "",
                    faviconUrl: "favicon.ico",
                    headerColor1: "#000000",
                  },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.NO_CONTENT);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Branding,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body.companyName).eql("TestAPI");
                    expect(response.body.headerColor).eql("#ffffff");
                    expect(response.body.headerColor1).eql("#000000");
                    expect(response.body.primaryColor).eql("#999999");
                });
            });
        });
    });
})
