import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let publishedModule, draftModule;

    before("Get published module", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(item => {
                    if (item.status === "PUBLISHED")
                        publishedModule = item;
                    else
                        draftModule = item;
                })
            })
        })
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + publishedModule.uuid + "/" + API.ExportMessage,
                headers: {
                    authorization,
                },
                timeout: 600000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("uuid");
                expect(response.body).to.have.property("name");
                expect(response.body).to.have.property("description");
                expect(response.body).to.have.property("owner");
                expect(response.body.messageId).to.match(new RegExp("^\\d+\.\\d+$", "g"));
            });
        })
    });

    it("Returns the Hedera message ID for the specified module not published onto IPFS", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + draftModule.uuid + "/" + API.ExportMessage,
                headers: {
                    authorization,
                },
                timeout: 600000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("uuid");
                expect(response.body).to.have.property("name");
                expect(response.body).to.have.property("description");
                expect(response.body).to.have.property("owner");
                expect(response.body).to.not.have.property("messageId");
            });
        })
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules + publishedModule.uuid + "/" + API.ExportMessage,
                headers: {
                    authorization
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + publishedModule.uuid + "/" + API.ExportMessage,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + publishedModule.uuid + "/" + API.ExportMessage,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns the Hedera message ID for the specified module published onto IPFS with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfAllModules + publishedModule.uuid + "/" + API.ExportMessage,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
