import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Contracts2", { tags: ['contracts', 'firstPool', 'all'] }, () => {
    const SR2Username = Cypress.env('SR2User');
    const UserUsername = Cypress.env('User');

    let contractIdR, contractIdW;

    const deleteContract = (token, contractId) => {
        return cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.ListOfContracts + contractId,
            headers: token ? { authorization: token } : {},
            failOnStatusCode: false
        });
    };

    const verifyContractDeleted = (token, type, contractId) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfContracts,
            headers: { authorization: token },
            qs: { type }
        }).then((response) => {
            response.body.forEach(element => {
                expect(element.id).to.not.equal(contractId);
            });
        });
    };

    before(() => {
        Authorization.getAccessToken(SR2Username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: { authorization },
                qs: { "type": "RETIRE" },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                contractIdR = response.body.at(0).id;
            });

            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfContracts,
                headers: { authorization },
                qs: { "type": "WIPE" },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                contractIdW = response.body.at(0).id;
            });
        });
    });

    it("Remove smart-contract(retire)", () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            deleteContract(token, contractIdR).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                verifyContractDeleted(token, "RETIRE", contractIdR);
            });
        });
    });

    it("Remove removed smart-contract(retire) - Negative", () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            deleteContract(token, contractIdR).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
            });
        });
    });

    it("Remove smart-contract(retire) without auth token - Negative", () => {
        deleteContract(null, contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(retire) with invalid auth token - Negative", () => {
        deleteContract("Bearer wqe", contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(retire) permissions with empty auth token - Negative", () => {
        deleteContract("", contractIdR).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(retire) permissions as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((token) => {
            deleteContract(token, contractIdR).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Remove smart-contract(wipe)", () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            deleteContract(token, contractIdW).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it("Remove removed smart-contract(wipe) - Negative", () => {
        Authorization.getAccessToken(SR2Username).then((token) => {
            deleteContract(token, contractIdW).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                verifyContractDeleted(token, "WIPE", contractIdW);
            });
        });
    });

    it("Remove smart-contract(wipe) without auth token - Negative", () => {
        deleteContract(null, contractIdW).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(wipe) with invalid auth token - Negative", () => {
        deleteContract("Bearer wqe", contractIdW).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(wipe) with empty auth token - Negative", () => {
        deleteContract("", contractIdW).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Remove smart-contract(wipe) as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((token) => {
            deleteContract(token, contractIdW).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

});