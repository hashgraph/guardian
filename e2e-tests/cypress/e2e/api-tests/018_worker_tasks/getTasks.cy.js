import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Worker tasks', { tags: ['worker', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    //TBD: check failed tasks, auto-retry, manual retry
    it('Get all tasks', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.WorkerTasks,
                headers: {
                    authorization,
                },
                timeout: 60000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body.at(0)).to.have.property("createDate");
                expect(response.body.at(0)).to.have.property("done");
                expect(response.body.at(0)).to.have.property("isRetryableTask");
                expect(response.body.at(0)).to.have.property("processedTime");
                expect(response.body.at(0)).to.have.property("sent");
                expect(response.body.at(0)).to.have.property("taskId");
                expect(response.body.at(0)).to.have.property("type");
            });
        })
    });    

    it("Get all tasks without auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.WorkerTasks,
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all tasks with invalid auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.WorkerTasks,
            headers: {
                authorization: "Bearer wqe",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get all tasks with empty auth token - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.WorkerTasks,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
})
