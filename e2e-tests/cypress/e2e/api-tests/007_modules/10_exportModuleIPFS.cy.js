
import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Modules', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const draftModuleName = Modules.uniqueModuleName('APIModuleForExportMessage');
    const publishedModuleName = Modules.uniqueModuleName('APIModuleForExportMessagePublished');

    let publishedModule; let draftModule;

    // Both modules used to be picked from the list, which made the spec depend on another spec
    // having published something. The draft is created here; an already published module is
    // reused when there is one, because publishing costs HBAR and cannot be undone.
    const resolvePublishedModule = (authorization) =>
        Modules.listModules(authorization).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            const existing = response.body.find((item) => item.status === 'PUBLISHED');
            if (existing) {
                return existing;
            }
            return Modules.createModule(authorization, Modules.moduleBody(publishedModuleName)).then((res) => {
                expect(res.status).eql(STATUS_CODE.SUCCESS);
                return Modules.publishModule(authorization, res.body.uuid).then((published) => {
                    expect(published.status).eql(STATUS_CODE.OK);
                    expect(published.body.isValid).eql(true);
                    return published.body.module;
                });
            });
        });

    before('Get published and draft modules', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            resolvePublishedModule(authorization).then((resolved) => {
                publishedModule = resolved;
            });
            Modules.createModule(authorization, Modules.moduleBody(draftModuleName)).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                draftModule = response.body;
            });
        });
    });

    after('Remove the draft module created by this spec', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.deleteModule(authorization, draftModule.uuid, { failOnStatusCode: false });
        });
    });

    it('Returns the Hedera message ID for the specified module published onto IPFS', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.exportModuleMessage(authorization, publishedModule.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property('uuid');
                expect(response.body).to.have.property('name');
                expect(response.body).to.have.property('description');
                expect(response.body).to.have.property('owner');
                expect(response.body.messageId).to.match(new RegExp('^\\d+\\.\\d+$', 'g'));
            });
        });
    });

    it('Returns the Hedera message ID for the specified module not published onto IPFS', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.exportModuleMessage(authorization, draftModule.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property('uuid');
                expect(response.body).to.have.property('name');
                expect(response.body).to.have.property('description');
                expect(response.body).to.have.property('owner');
                expect(response.body).to.not.have.property('messageId');
            });
        });
    });

    it('Returns the Hedera message ID for the specified module published onto IPFS as User - Negative', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            Modules.exportModuleMessage(authorization, publishedModule.uuid, { failOnStatusCode: false }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it('Returns the Hedera message ID for the specified module published onto IPFS without auth token - Negative', () => {
        Modules.exportModuleMessage(undefined, publishedModule.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns the Hedera message ID for the specified module published onto IPFS with invalid auth token - Negative', () => {
        Modules.exportModuleMessage('Bearer wqe', publishedModule.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns the Hedera message ID for the specified module published onto IPFS with empty auth token - Negative', () => {
        Modules.exportModuleMessage('', publishedModule.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
