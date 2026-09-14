
import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Validate Invalid Module', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = Modules.uniqueModuleName('APIModuleInvalid');

    let invalidModule;

    // The spec builds the module it validates: taking the newest module in the list (at(0))
    // means validating whichever copy an earlier spec happened to leave behind, and that
    // module is not necessarily invalid
    before('Create invalid module', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.createInvalidModule(authorization, moduleName).then((module) => {
                invalidModule = module;
            });
        });
    });

    after('Remove the module created by this spec', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.deleteModule(authorization, invalidModule.uuid, { failOnStatusCode: false });
        });
    });

    it('Validate the module', { tags: ['analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.validateModule(authorization, invalidModule).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.module).eql(invalidModule);
                expect(response.body.results.isValid).eql(false);
            });
        });
    });

    it('Validate the module without auth token - Negative', () => {
        Modules.validateModule(undefined, invalidModule, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Validate the module with invalid auth token - Negative', () => {
        Modules.validateModule('Bearer wqe', invalidModule, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Validate the module with empty auth token - Negative', () => {
        Modules.validateModule('', invalidModule, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
