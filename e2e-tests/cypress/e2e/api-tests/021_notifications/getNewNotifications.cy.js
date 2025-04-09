import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get new notifications", { tags: ['notifications', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get list of new notifications", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.NewNotifications,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("message");
                    expect(item).to.have.property("old");
                    expect(item).to.have.property("read");
                    expect(item).to.have.property("title");
                    expect(item).to.have.property("type");
                    expect(item).to.have.property("userId");
                    expect(item.old).eql(false);
                });
            });
        })
    });

    it("Get list of new notifications without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.NewNotifications,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of new notifications with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.NewNotifications,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of new notifications with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.NewNotifications,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
