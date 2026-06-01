
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/checkingMethods";

context("Contracts", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    const UserUsername = Cypress.env('User');

    const contractNameR = "FirstAPIContractR";
    const contractNameW = "FirstAPIContractW";

    const contractsUrl = `${API.ApiServer}${API.ListOfContracts}`;
    const importContractsUrl = `${API.ApiServer}${API.ImportContracts}`;

    let contractIdW, contractIdR;

    const listContractsWithAuth = (authorization, qs = {}) =>
        cy.request({
            method: METHOD.GET,
            url: contractsUrl,
            headers: { authorization },
            qs,
        });

    const importContractWithAuth = (authorization, body, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: importContractsUrl,
            headers: { authorization },
            body,
            timeout: opts.timeout ?? 180000,
            failOnStatusCode: opts.failOnStatusCode ?? true,
        });

    const importContractWithoutAuth = (body, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: importContractsUrl,
            headers,
            body,
            failOnStatusCode: false,
        });

    before("Get contract ids for import", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            listContractsWithAuth(authorization, { type: "WIPE" }).then((response) => {
                response.body.forEach((element) => {
                    if (element.description === contractNameW) contractIdW = element.contractId;
                });
            });
            listContractsWithAuth(authorization, { type: "RETIRE" }).then((response) => {
                response.body.forEach((element) => {
                    if (element.description === contractNameR) contractIdR = element.contractId;
                });
            });
        });
    });

    it("Import retire smart-contract", () => {
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            importContractWithAuth(authorization, {
                contractId: contractIdR,
                description: contractNameR,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.contractId).eq(contractIdR);
                expect(response.body.description).eq(contractNameR);
                expect(response.body.type).eq("RETIRE");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("owner");
            });
        });
    });

    it("Import retire smart-contract without auth token - Negative", () => {
        importContractWithoutAuth({
            contractId: contractIdR,
            description: contractNameR,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import retire smart-contract with invalid auth token - Negative", () => {
        importContractWithoutAuth(
            {
                contractId: contractIdR,
                description: contractNameR,
            },
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import retire smart-contract with empty auth token - Negative", () => {
        importContractWithoutAuth(
            {
                contractId: contractIdR,
                description: contractNameR,
            },
            { authorization: "" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import retire smart-contract as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            importContractWithAuth(
                authorization,
                {
                    contractId: contractIdR,
                    description: contractNameR,
                },
                { failOnStatusCode: false }
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Import wipe smart-contract", () => {
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            importContractWithAuth(authorization, {
                contractId: contractIdW,
                description: contractNameW,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.contractId).eq(contractIdW);
                expect(response.body.description).eq(contractNameW);
                expect(response.body.type).eq("WIPE");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("owner");
            });
        });
    });

    it("Import wipe smart-contract without auth token - Negative", () => {
        importContractWithoutAuth({
            contractId: contractIdW,
            description: contractNameW,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import wipe smart-contract with invalid auth token - Negative", () => {
        importContractWithoutAuth(
            {
                contractId: contractIdW,
                description: contractNameW,
            },
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import wipe smart-contract with empty auth token - Negative", () => {
        importContractWithoutAuth(
            {
                contractId: contractIdW,
                description: contractNameW,
            },
            { authorization: "" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Import wipe smart-contract as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            importContractWithAuth(
                authorization,
                {
                    contractId: contractIdW,
                    description: contractNameW,
                },
                { failOnStatusCode: false }
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

});
