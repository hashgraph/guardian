import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Set role as default", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const roleName = "Policy User";

    let roleId;

    before("Get role id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Permissions + API.Roles,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    if (item.name == roleName)
                        roleId = item.id
                });
            });
        })
    })

    it("Set role as default", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Permissions + API.Roles + API.Default,
                body: {
                    id: roleId,
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Permissions + API.Roles,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    response.body.forEach(item => {
                        if (item.name == roleName)
                            expect(item.default).eql(true);
                    });
                });
            });
        })
    });

    it("Set role as default without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Permissions + API.Roles + API.Default,
            body: {
                id: roleId,
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Set role as default with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Permissions + API.Roles + API.Default,
            body: {
                id: roleId,
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Set role as default with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Permissions + API.Roles + API.Default,
            body: {
                id: roleId,
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
