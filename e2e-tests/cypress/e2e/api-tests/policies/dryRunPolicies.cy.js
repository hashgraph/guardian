import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Dry Run Policies",  { tags: '@dry-run' }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: "1707125414.999819805" }, //iRec2
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });

    it("Run policy without making any persistent changes or executing transaction", () => {
        cy.request({
            method: "GET",
            url:  API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(0).id;

            cy.request({
                method: "PUT",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/dry-run",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });

    it("Get all virtual users", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(0).id;

            cy.request({
                method: "GET",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/dry-run/users",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });

    it("Get lists of virtual transactions", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(0).id;

            cy.request({
                method: "GET",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/dry-run/transactions",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });

    it("Get lists of virtual artifacts", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(0).id;

            cy.request({
                method: "GET",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/dry-run/artifacts",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });

    it("Get lists of virtual ipfs", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(0).id;

            cy.request({
                method: "GET",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/dry-run/ipfs",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });

    it("Create a new virtual account and login", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(0).id;

            cy.request({
                method: "POST",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/dry-run/user",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                const did = response.body[0].did;

                cy.request({
                    method: "POST",
                    url:
                        API.ApiServer +
                        "policies/" +
                        policyId +
                        "/dry-run/login",
                    body: {
                        did: did,
                    },
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).to.eq(200);
                });
            });
        });
    });

    it("should restarts the execution of the policy and clear data in database", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(0).id;

            cy.request({
                method: "POST",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/dry-run/restart",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });
});
