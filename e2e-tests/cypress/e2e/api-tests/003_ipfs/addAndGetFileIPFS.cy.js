import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";
import * as Checks from "../../../support/checkingMethods";

context("IPFS", { tags: ['ipfs', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    let cid;
    let firstRandom = Math.floor(Math.random() * 99999);
    let secondRandom = Math.floor(Math.random() * 99999);
    let thirdRandom = Math.floor(Math.random() * 99999);

    it("Add file to ipfs", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.IPFSFile,
                body: {
                    randTest1: firstRandom,
                    randTest2: secondRandom,
                    randTest3: thirdRandom
                },
                headers: {
                    "content-type": "binary/octet-stream",
                    authorization,
                },
                timeout: 200000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                cid = response.body;
            });
        })
    });

    it("Add file to ipfs without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file to ipfs with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Add file to ipfs with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });


    it("Get file from ipfs", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const waitForFile = {
                method: METHOD.GET,
                url: API.ApiServer + API.IPFSFile + cid,
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }
            Checks.whileIPFSProcessingFile(waitForFile)
            cy.request(waitForFile).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let body = JSON.parse(response.body)
                expect(body.randTest1).eql(firstRandom);
                expect(body.randTest2).eql(secondRandom);
                expect(body.randTest3).eql(thirdRandom);
            });
        })
    })

    it("Get file from ipfs without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.IPFSFile + cid,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.IPFSFile + cid,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get file from ipfs with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.IPFSFile + cid,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});