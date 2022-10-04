import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens", () => {
    const authorization = Cypress.env("authorization");
    const user = Cypress.env("root_user");

    it("get token info", () => {
        cy.sendRequest(METHOD.GET,Cypress.env("api_server") + API.ListOfTokens, { authorization }).then(
            (resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
                expect(resp.body[0]).to.have.property("_id");
                expect(resp.body[0]).to.have.property("tokenId");
                expect(resp.body[0]).to.have.property("tokenName");

                const topicUid = resp.body[0].tokenId;

                cy.sendRequest(
                    METHOD.GET,
                    Cypress.env("api_server") + API.ListOfTokens + topicUid + "/" + user + "/info",
                    { authorization }
                ).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);
                    expect(resp.body).to.not.be.oneOf([null, ""]);
                });
            }
        );
    });
});
