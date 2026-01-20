
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const previewUrl = `${modulesUrl}${API.ImportFile}${API.Preview}`;

    let firstModule;

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

    const postPreviewWithAuth = (authorization, file, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: previewUrl,
            body: file,
            headers: {
                "content-type": "binary/octet-stream",
                authorization,
            },
            timeout: opts.timeout ?? 180000,
            encoding: opts.encoding ?? null,
            failOnStatusCode: opts.failOnStatusCode ?? true,
        });

    const postPreviewWithoutAuth = (file, headers = {}, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: previewUrl,
            body: file,
            headers: {
                "content-type": "binary/octet-stream",
                ...headers,
            },
            timeout: opts.timeout,
            encoding: opts.encoding ?? null,
            failOnStatusCode: opts.failOnStatusCode ?? false,
        });

    const readExportedModuleBlob = () =>
        cy.fixture("exportedModule.module", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary));

    before("Get module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            listModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                const uuid = response.body.at(-1).uuid;
                getModuleWithAuth(authorization, uuid).then((res) => {
                    firstModule = res.body;
                });
            });
        });
    });

    it("Preview the module from IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            readExportedModuleBlob().then((file) => {
                postPreviewWithAuth(authorization, file, { encoding: null }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    const moduleOnPreview = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body));

                    expect(moduleOnPreview.module).to.have.property("configFileId");
                    expect(moduleOnPreview.module).to.have.property("updateDate");

                    expect(moduleOnPreview.module.codeVersion).eql(firstModule.codeVersion);
                    expect(moduleOnPreview.module.config).eql(firstModule.config);
                    expect(moduleOnPreview.module.creator).eql(firstModule.creator);
                    expect(moduleOnPreview.module.description).eql(firstModule.description);
                    expect(moduleOnPreview.module.name).eql(firstModule.name);
                    expect(moduleOnPreview.module.owner).eql(firstModule.owner);
                    expect(moduleOnPreview.module.type).eql(firstModule.type);
                });
            });
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative", () => {
        readExportedModuleBlob().then((file) => {
            postPreviewWithoutAuth(file).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative", () => {
        readExportedModuleBlob().then((file) => {
            postPreviewWithoutAuth(file, { authorization: "Bearer wqe" }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative", () => {
        readExportedModuleBlob().then((file) => {
            postPreviewWithoutAuth(file, { authorization: "" }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

});
