import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Update role', { tags: ['permissions', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const roleName = 'Policy Manager';

    let roleId; let rolePerms; let roleDesc;

    before('Get role id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Permissions + API.Roles,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                //The role is renamed by the test below, and the rename outlives the run: it is
                //looked up under either name so a second run still finds it
                const role = response.body.find(item =>
                    item.name === roleName || item.name === roleName + 'Edited');
                expect(role, `the "${roleName}" role`).to.not.be.undefined;
                roleId = role.id;
                roleDesc = role.description;
                rolePerms = role.permissions;
            });
        })
    })

    //The role is shared with the rest of the instance, so its name is put back as it was
    after('Restore the role name', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Permissions + API.Roles + roleId,
                body: {
                    'name': roleName,
                    'description': roleDesc,
                    'permissions': rolePerms
                },
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            });
        })
    })

    it('Update role', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Permissions + API.Roles + roleId,
                body: {
                    'name': roleName + 'Edited',
                    'description': roleDesc,
                    'permissions': rolePerms
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property('createDate');
                expect(response.body).to.have.property('default');
                expect(response.body).to.have.property('id');
                expect(response.body).to.have.property('name');
                expect(response.body).to.have.property('owner');
                expect(response.body).to.have.property('permissions');
                expect(response.body).to.have.property('readonly');
                expect(response.body).to.have.property('uuid');
                expect(response.body).to.have.property('updateDate');
                expect(response.body.name).eql(roleName + 'Edited');
                expect(response.body.description).eql(roleDesc);
                expect(response.body.permissions).to.include.members(rolePerms)
            });
        })
    });

    it('Update role without auth - Negative', () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            body: {
                'id': null,
                'name': roleName + 'Edited',
                'description': roleDesc,
                'permissions': rolePerms
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Update role with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            body: {
                'id': null,
                'name': roleName + 'Edited',
                'description': roleDesc,
                'permissions': rolePerms
            },
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Update role with empty auth - Negative', () => {
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.Permissions + API.Roles + roleId,
            body: {
                'id': null,
                'name': roleName + 'Edited',
                'description': roleDesc,
                'permissions': rolePerms
            },
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
