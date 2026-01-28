
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Export Module from File", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    const modulesUrl = `${API.ApiServer}${API.ListOfAllModules}`;
    const importUrl = `${modulesUrl}${API.ImportFile}`;

    let modules, lastModule, importedModule;

    const getModulesWithAuth = (authorization) =>
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

    const postImportWithAuth = (authorization, file) =>
        cy.request({
            method: METHOD.POST,
            url: importUrl,
            body: file,
            headers: {
                "content-type": "binary/octet-stream",
                authorization,
            },
            timeout: 180000,
        });

    const postImportWithoutAuth = (file, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: importUrl,
            body: file,
            headers: {
                "content-type": "binary/octet-stream",
                ...headers,
            },
            failOnStatusCode: false,
        });

    const readExportedModuleBlob = () =>
        cy.fixture("exportedModule.module", "binary")
            .then((binary) => Cypress.Blob.binaryStringToBlob(binary));

    it("Import module from IPFS", { tags: ['smoke', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            readExportedModuleBlob().then((file) => {
                postImportWithAuth(authorization, file).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                });
            });
        });
    });

    it("Verify import module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                modules = response.body;

                getModuleWithAuth(authorization, modules.at(0).uuid).then((res0) => {
                    expect(res0.status).eql(STATUS_CODE.OK);
                    importedModule = res0.body;

                    getModuleWithAuth(authorization, modules.at(1).uuid).then((res1) => {
                        expect(res1.status).eql(STATUS_CODE.OK);
                        lastModule = res1.body;

                        expect(importedModule._id).not.eql(lastModule._id);
                        delete importedModule._id;
                        delete lastModule._id;

                        expect(importedModule.configFileId).not.eql(lastModule.configFileId);
                        delete importedModule.configFileId;
                        delete lastModule.configFileId;

                        expect(importedModule.id).not.eql(lastModule.id);
                        delete importedModule.id;
                        delete lastModule.id;

                        expect(importedModule.uuid).not.eql(lastModule.uuid);
                        delete importedModule.uuid;
                        delete lastModule.uuid;

                        expect(importedModule.name).to.match(new RegExp("^" + lastModule.name + "_\\d+$", "g"));
                        delete importedModule.name;
                        delete lastModule.name;

                        delete importedModule.createDate;
                        delete lastModule.createDate;
                        delete importedModule.updateDate;
                        delete lastModule.updateDate;

                        expect(importedModule).eql(lastModule);
                    });
                });
            });
        });
    });

    it("Import module from IPFS without auth token - Negative", () => {
        readExportedModuleBlob().then((file) => {
            postImportWithoutAuth(file).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it("Import module from IPFS with invalid auth token - Negative", () => {
        readExportedModuleBlob().then((file) => {
            postImportWithoutAuth(file, { authorization: "Bearer wqe" }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it("Import module from IPFS with empty auth token - Negative", () => {
        readExportedModuleBlob().then((file) => {
            postImportWithoutAuth(file, { authorization: "" }).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

});
