
import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Get Modules', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'FirstAPIModule';

    let module;

    before('Get the module to look for in the list', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.resolveDraftModule(authorization, moduleName).then((resolved) => {
                module = resolved;
            });
        });
    });

    it('Get list of modules', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.listModules(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                // Looked up by uuid: the module is not necessarily the newest one in the list
                const listed = response.body.find((item) => item.uuid === module.uuid);
                expect(listed.name).eql(moduleName);
                expect(listed.description).eql(`${moduleName} desc`);
                expect(listed.status).eql('DRAFT');

                response.body.forEach(item => {
                    expect(item).to.have.property('_id');
                    expect(item).to.have.property('id');
                    expect(item).to.have.property('uuid');
                });
            });
        });
    });

    it('Get list of modules without auth token - Negative', () => {
        Modules.listModules(undefined, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get list of modules with invalid auth token - Negative', () => {
        Modules.listModules('Bearer wqe', { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get list of modules with empty auth token - Negative', () => {
        Modules.listModules('', { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
