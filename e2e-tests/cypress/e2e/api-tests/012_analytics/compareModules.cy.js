
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics", { tags: ['analytics', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = "FirstAPIModule";

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

    const importModuleFileWithAuth = (authorization, file) =>
        cy.request({
            method: METHOD.POST,
            url: URLS.importFile,
            body: file,
            headers: {
                "content-type": "binary/octet-stream",
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

    const readExportedModuleBlob = () =>
        cy.fixture("exportedModule.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary));

    let lastModule, prelastModule;
    let moduleId, moduleId2;
    let moduleIdClone;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            // Get modules and set ids
            getModulesWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                lastModule = response.body.at(0).id;
                prelastModule = response.body.at(1).id;
                response.body.forEach(element => {
                    if (element.name === moduleName) moduleId = element.id;
                    else if (new RegExp("^" + moduleName + "_\\d+$", "g").test(element.name)) moduleId2 = element.id;
                });
            });

            // Import module file to create a clone id
            readExportedModuleBlob().then((file) => {
                importModuleFileWithAuth(authorization, file).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    const moduleOnPreview = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body));
                    moduleIdClone = moduleOnPreview.id;
                });
            });
        });
    });

    it("Compare any modules", { tags: ['smoke'] }, () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(authorization, compareBody({
                moduleId1: lastModule,
                moduleId2: prelastModule,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);

                expect(response.body.left.id).to.eq(lastModule);
                expect(response.body.right.id).to.eq(prelastModule);
                expect(response.body.total).to.match(new RegExp("^([0-9][0-9])|100$"));
            });
        });
    });

    it("Compare partly equal modules", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(authorization, compareBody({
                moduleId1: moduleId,
                moduleId2: moduleId2,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);

                expect(response.body.left).eql({
                    id: moduleId,
                    name: moduleName,
                    description: moduleName + " desc"
                });

                expect(response.body.right.id).to.eq(moduleId2);
                expect(response.body.right.description).to.eq(moduleName + " desc");
                expect(response.body.right.name).to.match(new RegExp("^" + moduleName + "_\\d+$", "g"));

                expect(response.body.blocks.report.at(0).total_rate).eql("100%");
                expect(response.body.blocks.report.at(0).type).eql("PARTLY");
                expect(response.body.total).to.match(new RegExp("^([0-9][0-9])$"));
            });
        });
    });

    it("Compare full equal modules", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareWithAuth(authorization, compareBody({
                moduleId1: moduleId,
                moduleId2: moduleIdClone,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);

                expect(response.body.left.id).to.eq(moduleId);
                expect(response.body.left.description).to.eq(moduleName + " desc");
                expect(response.body.left.name).to.match(new RegExp("^" + moduleName, "g"));

                expect(response.body.right.id).to.eq(moduleIdClone);
                expect(response.body.right.description).to.eq(moduleName + " desc");
                expect(response.body.right.name).to.match(new RegExp("^" + moduleName + "_\\d+$", "g"));

                expect(response.body.total).eql(100);
            });
        });
    });

    it("Compare modules without auth - Negative", () => {
        postCompareWithoutAuth(compareBody({
            moduleId1: "6419853a31fe4fd0e741b3a9",
            moduleId2: "641983a931fe4fd0e741b399",
        })).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare modules with empty auth - Negative", () => {
        postCompareWithoutAuth(compareBody({
            moduleId1: "6419853a31fe4fd0e741b3a9",
            moduleId2: "641983a931fe4fd0e741b399",
        }), { authorization: "" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare modules with invalid auth - Negative", () => {
        postCompareWithoutAuth(compareBody({
            moduleId1: "6419853a31fe4fd0e741b3a9",
            moduleId2: "641983a931fe4fd0e741b399",
        }), { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare modules(Export)", () => {
        Authorization.getAccessTokenByRefreshToken().then((authorization) => {
            postCompareExportWithAuth(authorization, compareBody({
                moduleId1: moduleIdClone,
                moduleId2: lastModule,
            })).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.include("data:text/csv");
            });
        });
    });

    it("Compare modules(Export) without auth - Negative", () => {
        postCompareExportWithoutAuth(compareBody({
            moduleId1: "6419853a31fe4fd0e741b3a9",
            moduleId2: "641983a931fe4fd0e741b399",
        })).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare modules(Export) with empty auth - Negative", () => {
        postCompareExportWithoutAuth(compareBody({
            moduleId1: "6419853a31fe4fd0e741b3a9",
            moduleId2: "641983a931fe4fd0e741b399",
        }), { authorization: "" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Compare modules(Export) with invalid auth - Negative", () => {
        postCompareExportWithoutAuth(compareBody({
            moduleId1: "6419853a31fe4fd0e741b3a9",
            moduleId2: "641983a931fe4fd0e741b399",
        }), { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
