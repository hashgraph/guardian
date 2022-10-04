<<<<<<< HEAD
=======

>>>>>>> automation-api-tests
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Logs", () => {
    const authorization = Cypress.env("authorization");

    it("post request all logs as a StandardRegistry", () => {
<<<<<<< HEAD
        cy.request({
            method: METHOD.POST,
            url: Cypress.env("api_server") + API.Logs,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
        });
=======
        cy.sendRequest(METHOD.POST, Cypress.env("api_server") + API.Logs, { authorization }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
            }
        );
>>>>>>> automation-api-tests
    });
});
