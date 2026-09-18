
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Modules', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'APIModuleForPreview';

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const previewUrl = `${modulesUrl}${API.ImportFile}${API.Preview}`;
    const exportUrl = (uuid) => `${modulesUrl}${uuid}/${API.ExportFile}`;

    // The module is created and exported by this spec, so the preview can be
    // compared against a known module instead of relying on other specs or on
    // a checked-in fixture (block ids are regenerated on every run).
    let createdModule; let exportedModuleFile;

    const listModulesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl,
            headers: { authorization },
        });

    const getModuleWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.GET,
            url: modulesUrl + uuid,
            headers: { authorization },
        });

    const postModuleWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: modulesUrl,
            headers: { authorization },
            body,
        });

    const deleteModuleWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.DELETE,
            url: modulesUrl + uuid,
            headers: { authorization },
            failOnStatusCode: false,
        });

    const getExportWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.GET,
            url: exportUrl(uuid),
            headers: { authorization },
            encoding: null,
            timeout: 180000,
        });

    const postPreviewWithAuth = (authorization, file) =>
        cy.request({
            method: METHOD.POST,
            url: previewUrl,
            body: file,
            headers: {
                'content-type': 'binary/octet-stream',
                authorization,
            },
            timeout: 180000,
            encoding: null,
        });

    const postPreviewWithoutAuth = (file, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: previewUrl,
            body: file,
            headers: {
                'content-type': 'binary/octet-stream',
                ...headers,
            },
            encoding: null,
            failOnStatusCode: false,
        });

    const moduleBody = () => ({
        name: moduleName,
        description: `${moduleName} desc`,
        config: {
            blockType: 'module',
            children: [
                {
                    artifacts: [],
                    blockType: 'interfaceActionBlock',
                    children: [],
                    defaultActive: true,
                    events: [],
                    id: randomInt(99999),
                    permissions: [],
                    tag: 'APIBlockModulePreview1',
                },
                {
                    artifacts: [],
                    blockType: 'interfaceActionBlock',
                    children: [],
                    defaultActive: true,
                    events: [],
                    id: randomInt(99999),
                    permissions: [],
                    tag: 'APIBlockModulePreview2',
                },
            ],
        },
    });

    const deleteModulesByName = (authorization) =>
        listModulesWithAuth(authorization).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            response.body
                .filter(item => item.name === moduleName)
                .forEach(item => deleteModuleWithAuth(authorization, item.uuid));
        });

    before('Create and export the module to preview', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteModulesByName(authorization);
            postModuleWithAuth(authorization, moduleBody()).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                getModuleWithAuth(authorization, response.body.uuid).then((res) => {
                    expect(res.status).eql(STATUS_CODE.OK);
                    createdModule = res.body;
                    getExportWithAuth(authorization, createdModule.uuid).then((exported) => {
                        expect(exported.status).eql(STATUS_CODE.OK);
                        exportedModuleFile = Cypress.Blob.binaryStringToBlob(
                            Cypress.Blob.arrayBufferToBinaryString(exported.body)
                        );
                    });
                });
            });
        });
    });

    after('Remove the created module', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteModulesByName(authorization);
        });
    });

    it('Preview the module from file', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postPreviewWithAuth(authorization, exportedModuleFile).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                const moduleOnPreview = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body));

                expect(moduleOnPreview.module).to.have.property('configFileId');
                expect(moduleOnPreview.module).to.have.property('updateDate');

                expect(moduleOnPreview.module.codeVersion).eql(createdModule.codeVersion);
                expect(moduleOnPreview.module.config).eql(createdModule.config);
                expect(moduleOnPreview.module.creator).eql(createdModule.creator);
                expect(moduleOnPreview.module.description).eql(createdModule.description);
                expect(moduleOnPreview.module.name).eql(createdModule.name);
                expect(moduleOnPreview.module.owner).eql(createdModule.owner);
                expect(moduleOnPreview.module.type).eql(createdModule.type);
            });
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative', () => {
        postPreviewWithoutAuth(exportedModuleFile).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative', () => {
        postPreviewWithoutAuth(exportedModuleFile, { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative', () => {
        postPreviewWithoutAuth(exportedModuleFile, { authorization: '' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
