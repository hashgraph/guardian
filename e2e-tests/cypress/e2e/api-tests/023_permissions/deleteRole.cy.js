import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Delete role", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const roleName = "TestRole";

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

    it("Delete role", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.Permissions + API.Roles + roleId,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Permissions + API.Roles,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    response.body.forEach(item => {
                        if (item.id == roleId)
                            throw new Error("Role still exists")
                    });
                });
            });
        })
    });

    it("Delete role without auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete role with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete role with empty auth - Negative", () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
