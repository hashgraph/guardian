import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Delete Module', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const moduleName = Modules.uniqueModuleName('APIModule');

    let moduleId;

    before('Create module for delete', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.createModule(authorization, Modules.moduleBody(moduleName)).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                moduleId = response.body.uuid;
            });
        });
    });

    it('Deletes the module with the provided module ID with invalid artifact id - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.deleteModule(authorization, '21231231321321321', { failOnStatusCode: false }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql('Invalid module');
            });
        });
    });

    it('Deletes the module with the provided module ID without auth token - Negative', () => {
        Modules.deleteModule(undefined, moduleId, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Deletes the module with the provided module ID with invalid auth token - Negative', () => {
        Modules.deleteModule('Bearer wqe', moduleId, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Deletes the module with the provided module ID with empty auth token - Negative', () => {
        Modules.deleteModule('', moduleId, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Deletes the module with the provided module ID by user', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            Modules.deleteModule(authorization, moduleId, { failOnStatusCode: false }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it('Deletes the module with the provided module ID', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.deleteModule(authorization, moduleId).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it('Verify deletion', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.listModules(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    if (item.name === moduleName) {throw new Error('Deleted module exist!');}
                });
            });
        });
    });

    it('Deletes already deleted module - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.deleteModule(authorization, moduleId, { failOnStatusCode: false }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql('Invalid module');
            });
        });
    });

});
