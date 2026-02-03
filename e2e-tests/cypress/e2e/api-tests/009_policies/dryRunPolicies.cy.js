
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const importMsgUrl = `${API.ApiServer}${API.PolicisImportMsg}`;
    const policiesUrl = `${API.ApiServer}${API.Policies}`;
    const dryRunBase = (policyId) => `${policiesUrl}${policyId}/${API.DryRun}`;

    let policyId;

    const postWithAuth = (authorization, url, body = undefined, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url,
            headers: { authorization },
            ...(body ? { body } : {}),
            ...(opts.timeout ? { timeout: opts.timeout } : {}),
            ...(opts.failOnStatusCode !== undefined ? { failOnStatusCode: opts.failOnStatusCode } : {}),
        });

    const putWithAuth = (authorization, url, opts = {}) =>
        cy.request({
            method: METHOD.PUT,
            url,
            headers: { authorization },
            ...(opts.timeout ? { timeout: opts.timeout } : {}),
            ...(opts.failOnStatusCode !== undefined ? { failOnStatusCode: opts.failOnStatusCode } : {}),
        });

    const getWithAuth = (authorization, url, opts = {}) =>
        cy.request({
            method: METHOD.GET,
            url,
            headers: { authorization },
            ...(opts.timeout ? { timeout: opts.timeout } : {}),
            ...(opts.failOnStatusCode !== undefined ? { failOnStatusCode: opts.failOnStatusCode } : {}),
        });

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postWithAuth(authorization, importMsgUrl, { messageId: "1707125414.999819805" }, { timeout: 600000 })
                .then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                    policyId = response.body.at(0).id;
                });
        });
    });

    it("Run policy without making any persistent changes or executing transaction", { tags: ['analytics', 'schema', 'tokens', 'smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            putWithAuth(authorization, dryRunBase(policyId), { timeout: 180000 }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get all virtual users", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWithAuth(authorization, `${dryRunBase(policyId)}${API.Users}`).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get lists of virtual transactions", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWithAuth(authorization, `${policiesUrl}${policyId}/dry-run/transactions`).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get lists of virtual artifacts", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWithAuth(authorization, `${policiesUrl}${policyId}/dry-run/artifacts`).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Get lists of virtual ipfs", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getWithAuth(authorization, `${dryRunBase(policyId)}${API.IPFS}`).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

    it("Create a new virtual account and login", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postWithAuth(authorization, `${policiesUrl}${policyId}/dry-run/user`).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                const did = response.body[0].did;

                postWithAuth(authorization, `${policiesUrl}${policyId}/dry-run/login`, { did }).then((loginRes) => {
                    expect(loginRes.status).to.eq(STATUS_CODE.OK);
                });
            });
        });
    });

    it("should restarts the execution of the policy and clear data in database", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postWithAuth(authorization, `${policiesUrl}${policyId}/dry-run/restart`).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});
