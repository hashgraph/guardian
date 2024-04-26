import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Logs",  { tags: '@logs' }, () => {
    const authorization = Cypress.env("authorization");
    let workerName, workersNumber;

    it("Returns logs attributes", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Logs,
            headers: {
                authorization,
            },
        }).then((response) => {
            for (let i = 0; i < response.body.logs.length; i++) {
                if (response.body.logs.at(i).attributes.length === 2)
                        workerName = response.body.logs.at(i).attributes.at(0)
            }
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.logs.at(0)).to.have.property("id");
            expect(response.body.logs.at(0)).to.have.property("attributes");
        });
    });
    

    it("Returns logs attributes without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Logs,
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs attributes with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Logs,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs attributes with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Logs,
            headers: {
                authorization: "",
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs with name", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.LogsAttributes,
            headers: {
                authorization,
            },
            qs: {
                name: "WORKER"
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            workersNumber = response.body.length - 1;
        });
    });

    it("Returns logs with name exclude someone", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.LogsAttributes,
            headers: {
                authorization,
            },
            qs: {
                name: "WORKER",
                existingAttributes: workerName
            }
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(workersNumber).eql(response.body.length);
        });
    });

    it("Returns logs without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.LogsAttributes,
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.LogsAttributes,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.LogsAttributes,
            headers: {
                authorization: "",
            },
            failOnStatusCode:false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
