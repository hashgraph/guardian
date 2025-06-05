import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get progresses", { tags: ['notifications', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    before("Import policy for check progresses", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsgPush,
                body: {
                    messageId: (Cypress.env('policy_with_artifacts')),
                    metadata: {
                        "tools": {}
                    }
                },
                headers: {
                    authorization,
                },
                timeout: 180000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.ACCEPTED);
            });
        })
    });

    it("Get list of progresses", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Progresses,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    expect(item).to.have.property("action");
                    expect(item).to.have.property("createDate");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("message");
                    expect(item).to.have.property("progress");
                    expect(item).to.have.property("taskId");
                    expect(item).to.have.property("userId");
                    expect(item).to.have.property("updateDate");
                });
            });
        })
    });

    it("Get list of progresses without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Progresses,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of progresses with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Progresses,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of progresses with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Progresses,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
