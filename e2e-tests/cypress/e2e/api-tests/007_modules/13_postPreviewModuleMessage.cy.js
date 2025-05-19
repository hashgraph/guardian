import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let lastModule;

    before("Get module", () => {
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
                    url: API.ApiServer + API.ListOfAllModules + response.body.at(0).uuid,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    lastModule = response.body;
                })
            })
        })
    });

    it("Preview the module from IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ListOfAllModules + API.ImportMessage + API.Preview,
                headers: {
                    authorization,
                },
                body: {
                    "messageId": Cypress.env('module_for_import')
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.module).to.have.property("configFileId");
                expect(response.body.module).to.have.property("updateDate");

                expect(response.body.module.codeVersion).eql(lastModule.codeVersion);
                expect(response.body.module.config).eql(lastModule.config);
                expect(response.body.module.creator).eql("did:hedera:testnet:DgQk4zL49WXtJfhbLCVQdLvtPV15At29VcpA7HAkCXPc_0.0.4899577");
                expect(response.body.module.description).eql(lastModule.description);
                expect(response.body.module.name).eql(lastModule.name);
                expect(response.body.module.owner).eql("did:hedera:testnet:DgQk4zL49WXtJfhbLCVQdLvtPV15At29VcpA7HAkCXPc_0.0.4899577");
                expect(response.body.module.type).eql(lastModule.type);
            });
        });
    })

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage + API.Preview,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage + API.Preview,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Returns a zip file containing the published module and all associated artifacts, i.e. schemas and VCs with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage + API.Preview,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        })
    })
});
