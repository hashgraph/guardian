import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Artifacts", { tags: ['artifacts', 'secondPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let artifactId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("remoteWorkGHGPolicy.policy", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicisImportFile,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                        timeout: 300000,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.Artifacts,
                            headers: {
                                authorization,
                            },
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                            artifactId = response.body.at(0).id;
                        })
                    });
                })
        })
    });

    it("Delete artifact", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                url: API.ApiServer + API.Artifacts + artifactId,
                method: METHOD.DELETE,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        })
    });

    it("Delete already deleted artifact - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                url: API.ApiServer + API.Artifacts + artifactId,
                method: METHOD.DELETE,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Cannot read properties of null (reading 'policyId')");
            });
        })
    });

    it("Delete artifact with invalid artifact id - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                url: API.ApiServer + API.Artifacts + "21231231321321321",
                method: METHOD.DELETE,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Cannot read properties of null (reading 'policyId')");
            });
        })
    });

    it("Delete artifact by user - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Artifacts,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                artifactId = response.body.at(0).id;
                Authorization.getAccessToken(UserUsername).then((authorization) => {
                    cy.request({
                        url: API.ApiServer + API.Artifacts + artifactId,
                        method: METHOD.DELETE,
                        headers: {
                            authorization
                        },
                        failOnStatusCode: false,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                    });
                })
            });
        });
    });
    
    it("Delete artifact without auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + artifactId,
            method: METHOD.DELETE,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete artifact with invalid auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + artifactId,
            method: METHOD.DELETE,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete artifact with empty auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + artifactId,
            method: METHOD.DELETE,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
