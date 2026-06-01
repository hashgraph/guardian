
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("IPFS", { tags: ['ipfs', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let cid, policyId;

    const policiesUrl = `${API.ApiServer}${API.Policies}`;
    const ipfsFileUrl = `${API.ApiServer}${API.IPFSFile}`;
    const dryRunUrl = (policyId) => `${ipfsFileUrl}${API.DryRun}${policyId}`;
    const dryRunGetUrl = (cid) => `${ipfsFileUrl}${cid}/${API.DryRun}`;

    const getPoliciesWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: policiesUrl,
            headers: { authorization },
        });

    const putPolicyStateWithAuth = (authorization, policyId, statePath) =>
        cy.request({
            method: METHOD.PUT,
            url: `${policiesUrl}${policyId}/${statePath}`,
            headers: { authorization },
        });

    const postIpfsDryRunWithAuth = (authorization, policyId, body, timeout = 200000) =>
        cy.request({
            method: METHOD.POST,
            url: dryRunUrl(policyId),
            body,
            headers: {
                "content-type": "binary/octet-stream",
                authorization,
            },
            timeout,
        });

    const getIpfsDryRunWithAuth = (authorization, cid) =>
        cy.request({
            method: METHOD.GET,
            url: dryRunGetUrl(cid),
            headers: { authorization },
        });

    const postIpfsDryRunWithoutAuth = (policyId, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: dryRunUrl(policyId),
            headers,
            failOnStatusCode: false,
        });

    const getIpfsWithoutAuth = (cid, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: `${ipfsFileUrl}${cid}`,
            headers,
            failOnStatusCode: false,
        });

    before("Import and dry-run policy", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getPoliciesWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                policyId = response.body.at(0).id;
                putPolicyStateWithAuth(authorization, policyId, API.DryRun).then((res) => {
                    expect(res.status).to.eq(STATUS_CODE.OK);
                });
            });
        });
    });

    it("Add file from ipfs for dry run mode", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("testJsonDR.json").then((file) => {
                postIpfsDryRunWithAuth(authorization, policyId, file).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    cy.writeFile("cypress/fixtures/testJsonDRCid", response.body);
                });
            });
        });
    });

    it("Add file from ipfs for dry run mode without auth token - Negative", () => {
        postIpfsDryRunWithoutAuth(policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file from ipfs for dry run mode with invalid auth token - Negative", () => {
        postIpfsDryRunWithoutAuth(policyId, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file from ipfs for dry run mode with empty auth token - Negative", () => {
        postIpfsDryRunWithoutAuth(policyId, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs for dry run mode", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("testJsonDRCid").then((cidFromFile) => {
                cid = cidFromFile;
                getIpfsDryRunWithAuth(authorization, cid).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    let body = JSON.parse(response.body);
                    expect(body.red).eql("rose");
                    expect(body.blue).eql("sky");
                });
            });
        });
    });

    it("Get file from ipfs for dry run mode without auth token - Negative", () => {
        getIpfsWithoutAuth(cid).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs for dry run mode with invalid auth token - Negative", () => {
        getIpfsWithoutAuth(cid, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs for dry run mode with empty auth token - Negative", () => {
        getIpfsWithoutAuth(cid, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    after("Stop dry-run policy", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            putPolicyStateWithAuth(authorization, policyId, API.Draft).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});
