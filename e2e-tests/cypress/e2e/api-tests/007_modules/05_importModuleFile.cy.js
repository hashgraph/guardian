
import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Export Module from File', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'FirstAPIModule';

    let originalModule; let exportedModuleFile; let importedModule;

    // The archive is exported here instead of being read from the exportedModule.module
    // fixture: that file is written by 04_exportModuleFile, so the spec used to depend on
    // another spec having run, and the fixture is not in the repository
    before('Get module and export it', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.resolveDraftModule(authorization, moduleName).then((resolved) => {
                Modules.getModule(authorization, resolved.uuid).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    originalModule = response.body;
                });
                Modules.exportModuleFile(authorization, resolved.uuid).then((file) => {
                    exportedModuleFile = file;
                });
            });
        });
    });

    after('Remove the imported copy', () => {
        if (!importedModule) {
            return;
        }
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.deleteModule(authorization, importedModule.uuid, { failOnStatusCode: false });
        });
    });

    it('Import module from IPFS', { tags: ['smoke', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.importModuleFile(authorization, exportedModuleFile).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                importedModule = Modules.parseBinaryJson(response.body);
                expect(importedModule.uuid).to.not.eql(originalModule.uuid);
            });
        });
    });

    it('Verify import module', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.getModule(authorization, importedModule.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                const imported = response.body;
                const original = JSON.parse(JSON.stringify(originalModule));

                expect(imported._id).not.eql(original._id);
                delete imported._id;
                delete original._id;

                expect(imported.configFileId).not.eql(original.configFileId);
                delete imported.configFileId;
                delete original.configFileId;

                expect(imported.id).not.eql(original.id);
                delete imported.id;
                delete original.id;

                expect(imported.uuid).not.eql(original.uuid);
                delete imported.uuid;
                delete original.uuid;

                expect(imported.name).to.match(new RegExp('^' + original.name + '_\\d+$', 'g'));
                delete imported.name;
                delete original.name;

                delete imported.createDate;
                delete original.createDate;
                delete imported.updateDate;
                delete original.updateDate;

                expect(imported).eql(original);
            });
        });
    });

    it('Import module from IPFS without auth token - Negative', () => {
        Modules.importModuleFile(undefined, exportedModuleFile, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Import module from IPFS with invalid auth token - Negative', () => {
        Modules.importModuleFile('Bearer wqe', exportedModuleFile, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Import module from IPFS with empty auth token - Negative', () => {
        Modules.importModuleFile('', exportedModuleFile, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
