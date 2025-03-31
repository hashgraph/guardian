import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Read notifications", { tags: ['notifications', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Read all notifications", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ReadAll,
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
                    expect(item.read).eql(true);
                });
            });
        })
    });

    it("Read all notifications without auth - Negative", () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ReadAll,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Read all notifications with incorrect auth - Negative", () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ReadAll,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Read all notifications with empty auth - Negative", () => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ReadAll,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Verify that all notifications are ridden", () => {
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
                    expect(item.read).eql(true);
                });
            });
        })
    });
});
