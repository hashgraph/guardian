context("Dry Run Policies",  { tags: '@dry-run' }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: `${Cypress.env("api_server")}policies/import/message`,
            body: { messageId: "1650282926.728623821" },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });

    it("should run policy without making any persistent changes or executing transaction", () => {
        cy.request({
            method: "GET",
            url: `${Cypress.env("api_server")}policies/`,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            cy.request({
                method: "PUT",
                url:
                    Cypress.env("api_server") +
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

    it("should returns all virtual users", () => {
        cy.request({
            method: "GET",
            url: `${Cypress.env("api_server")}policies/`,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            cy.request({
                method: "GET",
                url:
                    Cypress.env("api_server") +
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

    it("should returns lists of virtual transactions", () => {
        cy.request({
            method: "GET",
            url: `${Cypress.env("api_server")}policies/`,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            cy.request({
                method: "GET",
                url:
                    Cypress.env("api_server") +
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

    it("should returns lists of virtual artifacts", () => {
        cy.request({
            method: "GET",
            url: `${Cypress.env("api_server")}policies/`,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            cy.request({
                method: "GET",
                url:
                    Cypress.env("api_server") +
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

    it("should returns lists of virtual ipfs", () => {
        cy.request({
            method: "GET",
            url: `${Cypress.env("api_server")}policies/`,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            cy.request({
                method: "GET",
                url:
                    Cypress.env("api_server") +
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

    it("should create a new virtual account and login", () => {
        cy.request({
            method: "GET",
            url: `${Cypress.env("api_server")}policies/`,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            cy.request({
                method: "POST",
                url:
                    Cypress.env("api_server") +
                    "policies/" +
                    policyId +
                    "/dry-run/user",
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
                const did = response.body[0].did;

                cy.request({
                    method: "POST",
                    url:
                        Cypress.env("api_server") +
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
            url: `${Cypress.env("api_server")}policies/`,
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            cy.request({
                method: "POST",
                url:
                    Cypress.env("api_server") +
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
