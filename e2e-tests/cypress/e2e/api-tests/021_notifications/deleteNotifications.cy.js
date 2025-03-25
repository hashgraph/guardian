import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Delete notifications", { tags: ['notifications', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let notificationId, notificationNumber;

    before("Get notification id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.NewNotifications,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                notificationNumber = response.body.length;
                notificationId = response.body.at(2).id;
            });
        })
    });

    it("Delete notifications without auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.DeleteNotification + notificationId,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete notifications with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.DeleteNotification + notificationId,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete notifications with empty auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.DeleteNotification + notificationId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete notifications", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.DeleteNotification + notificationId,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).eql(notificationNumber - 2);
            });
        })
    });
});
