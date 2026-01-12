
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";
import * as Checks from "../../../support/checkingMethods";

context("IPFS", { tags: ['ipfs', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const ipfsFileUrl = `${API.ApiServer}${API.IPFSFile}`;

    let cid;
    let firstRandom = Math.floor(Math.random() * 99999);
    let secondRandom = Math.floor(Math.random() * 99999);
    let thirdRandom = Math.floor(Math.random() * 99999);

    const addFileWithAuth = (authorization, body) =>
        cy.request({
            method: METHOD.POST,
            url: ipfsFileUrl,
            body,
            headers: {
                "content-type": "binary/octet-stream",
                authorization,
            },
            timeout: 200000,
        });

    const addFileWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: ipfsFileUrl,
            headers,
            failOnStatusCode: false,
        });

    const getFileWithAuth = (authorization, cid) =>
        cy.request({
            method: METHOD.GET,
            url: ipfsFileUrl + cid,
            headers: { authorization },
            failOnStatusCode: false,
        });

    const getFileWithoutAuth = (cid, headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: ipfsFileUrl + cid,
            headers,
            failOnStatusCode: false,
        });

    it("Add file to ipfs", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            addFileWithAuth(authorization, {
                randTest1: firstRandom,
                randTest2: secondRandom,
                randTest3: thirdRandom,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                cid = response.body;
            });
        });
    });

    it("Add file to ipfs without auth token - Negative", () => {
        addFileWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file to ipfs with invalid auth token - Negative", () => {
        addFileWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file to ipfs with empty auth token - Negative", () => {
        addFileWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const waitForFile = {
                method: METHOD.GET,
                url: ipfsFileUrl + cid,
                headers: { authorization },
                failOnStatusCode: false,
            };
            Checks.whileIPFSProcessingFile(waitForFile);
            cy.request(waitForFile).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let body = JSON.parse(response.body);
                expect(body.randTest1).eql(firstRandom);
                expect(body.randTest2).eql(secondRandom);
                expect(body.randTest3).eql(thirdRandom);
            });
        });
    });

    it("Get file from ipfs without auth token - Negative", () => {
        getFileWithoutAuth(cid).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs with invalid auth token - Negative", () => {
        getFileWithoutAuth(cid, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs with empty auth token - Negative", () => {
        getFileWithoutAuth(cid, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
