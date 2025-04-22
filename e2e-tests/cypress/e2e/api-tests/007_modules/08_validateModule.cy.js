import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let invalidModule;

    before("Get and prepare module for validate", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.ListOfAllModules + response.body.at(1).uuid,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    invalidModule = response.body;

                    delete invalidModule.configFileId;
                    delete invalidModule.type;
                    delete invalidModule.updateDate;
                    delete invalidModule._id;
                    invalidModule.config.children = []

                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfAllModules + invalidModule.uuid,
                        body: invalidModule,
                        headers: {
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);

                        expect(response.body.codeVersion).eql(invalidModule.codeVersion);
                        expect(response.body.createDate).eql(invalidModule.createDate);
                        expect(response.body.creator).eql(invalidModule.creator);
                        expect(response.body.description).eql(invalidModule.description);
                        expect(response.body.id).eql(invalidModule.id);
                        expect(response.body.name).eql(invalidModule.name);
                        expect(response.body.owner).eql(invalidModule.owner);
                        expect(response.body.status).eql(invalidModule.status);
                        expect(response.body.uuid).eql(invalidModule.uuid);

                        expect(response.body.config).eql(invalidModule.config);
                    })
                })
            })
        })
    });

    it("Validates selected module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfAllModules + API.Validate,
                body: invalidModule,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.results.isValid).eql(true);
                expect(response.body.module).eql(invalidModule);
            });
        })
    });

    it("Validates selected module without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.Validate,
            body: invalidModule,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Validates selected module with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.Validate,
            body: invalidModule,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Validates selected module with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.Validate,
            body: invalidModule,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
