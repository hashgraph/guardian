import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Artifacts", { tags: "@artifacts" }, () => {
    const authorization = Cypress.env("authorization");
    let artifactId;

    beforeEach(() => {
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
                });
            })
    });

    it("Delete artifact", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Artifacts,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            artifactId = response.body.at(0).id;
            cy.request({
                url: API.ApiServer + API.Artifacts + artifactId,
                method: METHOD.DELETE,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.NO_CONTENT);
            });
        });
    });

    it("Delete already deleted artifact - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Artifacts,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            artifactId = response.body.at(0).id;
            cy.request({
                url: API.ApiServer + API.Artifacts + artifactId,
                method: METHOD.DELETE,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.NO_CONTENT);
            });
        });
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
    });

    it("Delete artifact with invalid artifact id - Negative", () => {
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
    });

    it("Delete artifact by user - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username: "Registrant",
                password: "test"
            }
        }).then((response) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                let accessToken = response.body.accessToken
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Artifacts,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    artifactId = response.body.at(0).id;
                    cy.request({
                        url: API.ApiServer + API.Artifacts + artifactId,
                        method: METHOD.DELETE,
                        headers: {
                            authorization: "Bearer " + accessToken,
                        },
                        failOnStatusCode: false,
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.FORBIDDEN);
                    });
                });
            });
        })
    });

    it("Delete artifact without auth token - Negative", () => {
        cy.request({
            url: API.ApiServer + API.Artifacts + artifactId,
            method: METHOD.DELETE,
            failOnStatusCode:false,
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
            failOnStatusCode:false,
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
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
