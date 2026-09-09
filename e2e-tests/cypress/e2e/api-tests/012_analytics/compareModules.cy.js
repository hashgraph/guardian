
import { randomInt } from '../../../support/random';

import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Analytics', { tags: ['analytics', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'FirstAPIModule';
    const compareBlockTag = 'APIBlockModuleCompare';

    const URLS = {
        modules: `${API.ApiServer}${API.ListOfAllModules}`,
        importFile: `${API.ApiServer}${API.ListOfAllModules}${API.ImportFile}`,
        compare: `${API.ApiServer}${API.ModuleCompare}`,
        compareExport: `${API.ApiServer}${API.ModuleCompare}${API.ExportCSV}`,
    };

    const DEFAULT_COMPARE_PARAMS = Object.freeze({
        eventsLvl: 1,
        propLvl: 2,
        childrenLvl: 2,
        idLvl: 0,
    });

    const compareBody = (overrides) => ({
        ...DEFAULT_COMPARE_PARAMS,
        ...overrides,
    });

    const getModulesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: URLS.modules,
            headers: { authorization },
        });

    const getModuleWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.GET,
            url: URLS.modules + uuid,
            headers: { authorization },
        });

    const createModuleWithAuth = (authorization) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.modules,
            headers: { authorization },
            body: {
                name: moduleName,
                description: `${moduleName} desc`,
                config: { blockType: 'module' },
            },
        });

    const putModuleWithAuth = (authorization, uuid, body) =>
        cy.request({
            method: METHOD.PUT,
            url: URLS.modules + uuid,
            headers: { authorization },
            body,
        });

    const exportModuleFileWithAuth = (authorization, uuid) =>
        cy.request({
            method: METHOD.GET,
            url: `${URLS.modules}${uuid}/${API.ExportFile}`,
            encoding: null,
            headers: { authorization },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            return Cypress.Blob.binaryStringToBlob(Cypress.Blob.arrayBufferToBinaryString(response.body));
        });

    const importModuleFileWithAuth = (authorization, file) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.importFile,
            body: file,
            headers: {
                'content-type': 'binary/octet-stream',
                authorization,
            },
            timeout: 180000,
        });

    const postCompareWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compare,
            headers: { authorization },
            body,
        });

    const postCompareWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compare,
            headers,
            body,
            failOnStatusCode: false,
        });

    const postCompareExportWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compareExport,
            headers: { authorization },
            body,
        });

    const postCompareExportWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.compareExport,
            headers,
            body,
            failOnStatusCode: false,
        });

    // The import response is returned as a binary payload because the request body is a Blob.
    // The buffer comes from another realm, so instanceof cannot be used to detect it.
    const parseImportedModule = (body) => {
        if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
            return JSON.parse(Cypress.Blob.arrayBufferToBinaryString(body));
        }
        return typeof body === 'string' ? JSON.parse(body) : body;
    };

    // Reuse the module created by the modules suite, or create it when this spec runs on its own
    const resolveBaseModule = (authorization) =>
        getModulesWithAuth(authorization).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            const existing = response.body.find((item) => item.name === moduleName);
            if (existing) {
                return existing;
            }
            return createModuleWithAuth(authorization).then((res) => {
                expect(res.status).to.eq(STATUS_CODE.SUCCESS);
                return res.body;
            });
        });

    // Replace the children of an imported copy: everything else stays identical to the
    // base module, which is what makes the two modules partly (and not fully) equal
    const makeModulePartlyEqual = (authorization, uuid) =>
        getModuleWithAuth(authorization, uuid).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            const module = response.body;
            delete module.configFileId;
            delete module.type;
            delete module.updateDate;
            delete module._id;
            module.config.children = [
                {
                    artifacts: [],
                    blockType: 'interfaceActionBlock',
                    children: [],
                    defaultActive: true,
                    events: [],
                    id: randomInt(99999),
                    permissions: [],
                    tag: compareBlockTag,
                },
            ];
            return putModuleWithAuth(authorization, uuid, module).then((res) => {
                expect(res.status).to.eq(STATUS_CODE.SUCCESS);
            });
        });

    let lastModule; let prelastModule;
    let moduleId; let moduleId2;
    let moduleIdClone;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            // Both counterparts are built here instead of being picked up from the modules
            // left by previous runs: a leftover copy is an exact clone, so the "partly equal"
            // comparison would report FULL depending on the state of the database.
            resolveBaseModule(authorization).then((baseModule) => {
                moduleId = baseModule.id;

                exportModuleFileWithAuth(authorization, baseModule.uuid).then((file) => {
                    // Untouched copy of the base module -> fully equal
                    importModuleFileWithAuth(authorization, file).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        moduleIdClone = parseImportedModule(response.body).id;
                    });

                    // Copy with different children only -> partly equal
                    importModuleFileWithAuth(authorization, file).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        const imported = parseImportedModule(response.body);
                        moduleId2 = imported.id;
                        makeModulePartlyEqual(authorization, imported.uuid);
                    });
                });
            });

            // Read the list last: the copies imported above guarantee at least two modules exist
            getModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                lastModule = response.body.at(0).id;
                prelastModule = response.body.at(1).id;
            });
        });
    });

    it('Compare any modules', { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(authorization, compareBody({
                moduleId1: lastModule,
                moduleId2: prelastModule,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);

                expect(response.body.left.id).to.eq(lastModule);
                expect(response.body.right.id).to.eq(prelastModule);
                expect(response.body.total).to.match(new RegExp('^([0-9][0-9])|100$'));
            });
        });
    });

    it('Compare partly equal modules', () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(authorization, compareBody({
                moduleId1: moduleId,
                moduleId2,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);

                expect(response.body.left).eql({
                    id: moduleId,
                    name: moduleName,
                    description: moduleName + ' desc'
                });

                expect(response.body.right.id).to.eq(moduleId2);
                expect(response.body.right.description).to.eq(moduleName + ' desc');
                expect(response.body.right.name).to.match(new RegExp('^' + moduleName + '_\\d+$', 'g'));

                expect(response.body.blocks.report.at(0).total_rate).eql('100%');
                expect(response.body.blocks.report.at(0).type).eql('PARTLY');
                expect(response.body.total).to.match(new RegExp('^([0-9][0-9])$'));
            });
        });
    });

    it('Compare full equal modules', () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(authorization, compareBody({
                moduleId1: moduleId,
                moduleId2: moduleIdClone,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);

                expect(response.body.left.id).to.eq(moduleId);
                expect(response.body.left.description).to.eq(moduleName + ' desc');
                expect(response.body.left.name).to.match(new RegExp('^' + moduleName, 'g'));

                expect(response.body.right.id).to.eq(moduleIdClone);
                expect(response.body.right.description).to.eq(moduleName + ' desc');
                expect(response.body.right.name).to.match(new RegExp('^' + moduleName + '_\\d+$', 'g'));

                expect(response.body.total).eql(100);
            });
        });
    });

    it('Compare modules without auth - Negative', () => {
        postCompareWithoutAuth(compareBody({
            moduleId1: '6419853a31fe4fd0e741b3a9',
            moduleId2: '641983a931fe4fd0e741b399',
        })).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare modules with empty auth - Negative', () => {
        postCompareWithoutAuth(compareBody({
            moduleId1: '6419853a31fe4fd0e741b3a9',
            moduleId2: '641983a931fe4fd0e741b399',
        }), { authorization: '' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare modules with invalid auth - Negative', () => {
        postCompareWithoutAuth(compareBody({
            moduleId1: '6419853a31fe4fd0e741b3a9',
            moduleId2: '641983a931fe4fd0e741b399',
        }), { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare modules(Export)', () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareExportWithAuth(authorization, compareBody({
                moduleId1: moduleIdClone,
                moduleId2: lastModule,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.include('data:text/csv');
            });
        });
    });

    it('Compare modules(Export) without auth - Negative', () => {
        postCompareExportWithoutAuth(compareBody({
            moduleId1: '6419853a31fe4fd0e741b3a9',
            moduleId2: '641983a931fe4fd0e741b399',
        })).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare modules(Export) with empty auth - Negative', () => {
        postCompareExportWithoutAuth(compareBody({
            moduleId1: '6419853a31fe4fd0e741b3a9',
            moduleId2: '641983a931fe4fd0e741b399',
        }), { authorization: '' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Compare modules(Export) with invalid auth - Negative', () => {
        postCompareExportWithoutAuth(compareBody({
            moduleId1: '6419853a31fe4fd0e741b3a9',
            moduleId2: '641983a931fe4fd0e741b399',
        }), { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
