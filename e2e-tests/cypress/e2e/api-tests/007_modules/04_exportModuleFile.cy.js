
import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Export Module as File', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'FirstAPIModule';

    let module;

    // The module is resolved by name: exporting the newest one (at(0)) means exporting
    // whichever copy an earlier spec happened to leave behind
    before('Get module', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.resolveDraftModule(authorization, moduleName).then((resolved) => {
                module = resolved;
            });
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs', { tags: ['smoke', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.exportModuleFileResponse(authorization, module.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.not.be.oneOf([null, '']);
            });
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative', () => {
        Modules.exportModuleFileResponse(undefined, module.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative', () => {
        Modules.exportModuleFileResponse('Bearer wqe', module.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative', () => {
        Modules.exportModuleFileResponse('', module.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
