
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Logs", { tags: ['logs', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let workerName, workersNumber;

    const logsUrl = `${API.ApiServer}${API.Logs}`;
    const logsAttributesUrl = `${API.ApiServer}${API.LogsAttributes}`;

    const postLogsWithAuth = (authorization) =>
        cy.request({
            method: METHOD.POST,
            url: logsUrl,
            headers: { authorization },
        });

    const postLogsWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: logsUrl,
            headers,
            failOnStatusCode: false,
        });

    const getLogsAttributesWithAuth = (authorization, qs = {}, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: logsAttributesUrl,
            headers: { authorization },
            qs,
            failOnStatusCode,
        });

    const getLogsAttributesWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: logsAttributesUrl,
            headers,
            failOnStatusCode: false,
        });

    it("Returns logs attributes", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postLogsWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.logs.at(0)).to.have.property("id");
                expect(response.body.logs.at(0)).to.have.property("attributes");
            });
        });
    });

    it("Returns logs attributes without auth token - Negative", () => {
        postLogsWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs attributes with invalid auth token - Negative", () => {
        postLogsWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs attributes with empty auth token - Negative", () => {
        postLogsWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs with name", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getLogsAttributesWithAuth(authorization, { name: "WORKER" }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                workersNumber = response.body.length;
                workerName = response.body.at(-1);
            });
        });
    });

    it("Returns logs with name exclude someone", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getLogsAttributesWithAuth(
                authorization,
                { name: "WORKER", existingAttributes: workerName },
                true
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(workersNumber - 1).eql(response.body.length);
            });
        });
    });

    it("Returns logs without auth token - Negative", () => {
        getLogsAttributesWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs with invalid auth token - Negative", () => {
        getLogsAttributesWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Returns logs with empty auth token - Negative", () => {
        getLogsAttributesWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
