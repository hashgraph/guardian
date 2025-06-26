import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Logs", { tags: ['logs', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let workerName, workersNumber;

    it("Returns logs attributes", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
        })
    });


    it("Returns logs attributes without auth token - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Logs,
            failOnStatusCode: false,
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
            failOnStatusCode: false,
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
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs with name", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
                let wn = 0;
                response.body.forEach(element => {
                    if (element.startsWith("WORKER"))
                        wn++;
                });
                cy.task('log', response.body.length);
                cy.task('log', response.body);
                cy.task('log', wn);
                workersNumber = wn - 1;
                cy.task('log', workersNumber);
            });
        })
    });

    it("Returns logs with name exclude someone", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.LogsAttributes,
                headers: {
                    authorization,
                },
                qs: {
                    name: "WORKER",
                    existingAttributes: workerName
                },
                failOnStatusCode: true
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                cy.task('log', workerName);
                cy.task('log', workersNumber);
                cy.task('log', response.body.length);
                //expect(workersNumber).eql(response.body.length);
            });
        })
    });

    it("Returns logs without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.LogsAttributes,
            failOnStatusCode: false,
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
            failOnStatusCode: false,
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
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
