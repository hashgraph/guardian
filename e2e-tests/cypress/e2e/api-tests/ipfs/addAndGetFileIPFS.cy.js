import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("IPFS", { tags: '@ipfs' }, () => {
    const authorization = Cypress.env("authorization");
    let cid

    it("Add file to ipfs", () => {
        cy.fixture("testJson.json")
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.IPFSFile,
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 200000
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    cy.writeFile(
                        "cypress/fixtures/testJsonCid",
                        response.body
                    );

                });
            });
    });

    it("Add file to ipfs without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.IPFSFile,
            failOnStatusCode:false,
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
            failOnStatusCode:false,
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
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
    

    it("Get file from ipfs", () => {
        cy.fixture("testJsonCid")
            .then((cid) => {
                cid = cid
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.IPFSFile + cid,
                    headers: {
                        authorization,
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    let body = JSON.parse(response.body)
                    expect(body.yellow).eql("sun");
                    expect(body.green).eql("grass");
                });
            })
    });
    

    it("Get file from ipfs without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.IPFSFile + cid,
            failOnStatusCode:false,
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
            failOnStatusCode:false,
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
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});