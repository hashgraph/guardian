
import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Publish Module', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // A published module stays in the list, so the name must be unique per run
    const moduleName = Modules.uniqueModuleName('APIModuleForPublish');
    const invalidModuleName = Modules.uniqueModuleName('APIModuleForPublishInvalid');

    let createdModule; let invalidModule;

    // Both modules are created here: the invalid one used to be taken by position (at(1)),
    // which is a module owned by another spec and not necessarily invalid. When it happened
    // to be valid this test failed and, as a side effect, published somebody else's module.
    before('Create valid and invalid modules for publish', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.createModule(authorization, Modules.moduleBody(moduleName)).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                createdModule = response.body;
            });
            Modules.createInvalidModule(authorization, invalidModuleName).then((module) => {
                invalidModule = module;
            });
        });
    });

    after('Remove the invalid module created by this spec', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.deleteModule(authorization, invalidModule.uuid, { failOnStatusCode: false });
        });
    });

    it('Publish the module', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.publishModule(authorization, createdModule.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.errors.isValid).eql(true);
                expect(response.body.isValid).eql(true);

                expect(response.body.module.id).eql(createdModule.id);
                expect(response.body.module.codeVersion).eql(createdModule.codeVersion);
                expect(response.body.module.config).eql(createdModule.config);
                expect(response.body.module.configFileId).not.eql(createdModule.configFileId);
                expect(response.body.module.createDate).eql(createdModule.createDate);
                expect(response.body.module.creator).eql(createdModule.creator);
                expect(response.body.module.description).eql(createdModule.description);
                expect(response.body.module.id).eql(createdModule.id);
                expect(response.body.module.messageId).to.match(new RegExp('^\\d+\\.\\d+$', 'g'));
                expect(response.body.module.name).eql(createdModule.name);
                expect(response.body.module.owner).eql(createdModule.owner);
                expect(response.body.module.status).eql('PUBLISHED');
                expect(response.body.module.topicId).to.match(new RegExp('^0\\.0\\.\\d+$', 'g'));
                expect(response.body.module.type).eql(createdModule.type);
                expect(response.body.module.updateDate).not.eql(createdModule.updateDate);
                expect(response.body.module.uuid).eql(createdModule.uuid);
            });
        });
    });

    it('Publish the invalid module', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.publishModule(authorization, invalidModule.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.errors.isValid).eql(false);
                expect(response.body.isValid).eql(false);
            });
        });
    });

    it('Verify publish process', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.listModules(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                // Looked up by uuid: the two modules are not necessarily the newest ones in the list
                const published = response.body.find((item) => item.uuid === createdModule.uuid);
                const notPublished = response.body.find((item) => item.uuid === invalidModule.uuid);

                expect(published.status).eql('PUBLISHED');
                expect(notPublished.status).eql('DRAFT');
            });
        });
    });

    it('Publish the module without auth token - Negative', () => {
        Modules.publishModule(undefined, createdModule.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Publish the module with invalid auth token - Negative', () => {
        Modules.publishModule('Bearer wqe', createdModule.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Publish the module with empty auth token - Negative', () => {
        Modules.publishModule('', createdModule.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
