import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Update role", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const roleName = "Policy Manager";

    let roleId, rolePerms, roleDesc;

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
                    if (item.name == roleName) {
                        roleId = item.id;
                        roleDesc = item.description;
                        rolePerms = item.permissions;
                    }
                });
            });
        })
    })

    it("Update role", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Permissions + API.Roles + roleId,
                body: {
                    "name": roleName + "Edited",
                    "description": roleDesc,
                    "permissions": rolePerms
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("createDate");
                expect(response.body).to.have.property("default");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("name");
                expect(response.body).to.have.property("owner");
                expect(response.body).to.have.property("permissions");
                expect(response.body).to.have.property("readonly");
                expect(response.body).to.have.property("uuid");
                expect(response.body).to.have.property("updateDate");
                expect(response.body.name).eql(roleName + "Edited");
                expect(response.body.description).eql(roleDesc);
                expect(response.body.permissions).to.include.members(rolePerms)
            });
        })
    });

    it("Update role without auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            body: {
                "id": null,
                "name": roleName + "Edited",
                "description": roleDesc,
                "permissions": rolePerms
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Update role with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            body: {
                "id": null,
                "name": roleName + "Edited",
                "description": roleDesc,
                "permissions": rolePerms
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Update role with empty auth - Negative", () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            body: {
                "id": null,
                "name": roleName + "Edited",
                "description": roleDesc,
                "permissions": rolePerms
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
