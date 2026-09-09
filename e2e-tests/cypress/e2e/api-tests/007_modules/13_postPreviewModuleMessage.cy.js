
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Modules', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // Published modules cannot be deleted, so the name must be unique per run
    const moduleName = randomInt(999999) + 'APIModuleForPreview';
    const moduleDescription = `${moduleName} desc`;

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const profilesUrl = `${API.ApiServer}${API.Profiles}`;
    const previewUrl = `${modulesUrl}${API.ImportMessage}${API.Preview}`;
    const publishUrl = (uuid) => `${modulesUrl}${uuid}/${API.Publish}`;

    // The module is created and published by this spec, so the preview can be
    // compared against a known module instead of relying on other specs or on
    // a message published by another environment
    let did; let createdModule; let messageId;

    const getProfileWithAuth = (authorization, username) =>
        cy.request({
            method: METHOD.GET,
            url: profilesUrl + username,
            headers: { authorization },
        });

    const postModuleWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: modulesUrl,
            headers: { authorization },
            body,
        });

    const putPublishWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.PUT,
            url: publishUrl(uuid),
            headers: { authorization },
            timeout: 180000,
        });

    const postPreviewWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: previewUrl,
            headers: { authorization },
            body,
            timeout: 180000,
        });

    const postPreviewWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: previewUrl,
            headers,
            failOnStatusCode: false,
        });

    before('Create and publish the module to preview', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getProfileWithAuth(authorization, SRUsername).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                did = response.body.did;
            });
            postModuleWithAuth(authorization, {
                name: moduleName,
                description: moduleDescription,
                config: { blockType: 'module' },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                createdModule = response.body;
                putPublishWithAuth(authorization, createdModule.uuid).then((res) => {
                    expect(res.status).eql(STATUS_CODE.OK);
                    expect(res.body.isValid).eql(true);
                    messageId = res.body.module.messageId;
                });
            });
        });
    });

    it('Preview the module from IPFS', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postPreviewWithAuth(authorization, { messageId }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.module).to.have.property('configFileId');
                expect(response.body.module).to.have.property('updateDate');

                expect(response.body.module.codeVersion).eql(createdModule.codeVersion);
                expect(response.body.module.config).eql(createdModule.config);
                expect(response.body.module.creator).eql(did);
                expect(response.body.module.description).eql(moduleDescription);
                expect(response.body.module.name).eql(moduleName);
                expect(response.body.module.owner).eql(did);
                expect(response.body.module.type).eql(createdModule.type);
            });
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative', () => {
        postPreviewWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative', () => {
        postPreviewWithoutAuth({ authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative', () => {
        postPreviewWithoutAuth({ authorization: '' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
