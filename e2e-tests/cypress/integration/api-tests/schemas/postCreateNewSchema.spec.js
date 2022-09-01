import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("create new schema", () => {
    
            cy.sendRequest(METHOD.GET, API.Schemas, { authorization }).then(
                (resp) => {
                    const topicUid = resp.body[0].topicId;
                    cy.sendRequest(METHOD.POST, API.Schemas + topicUid, { authorization },
                        {
                            "id": "string",
                            "iri": "string",
                            "uuid": "string",
                            "name": "string",
                            "description": "string",
                            "entity": "string",
                            "hash": "string",
                            "status": "string",
                            "document": "string",
                            "topicId": "string",
                            "version": "string",
                            "owner": "string",
                            "messageId": "string"
                        }
                        ).then(
                        (resp) => {
                            expect(resp.status).eql(STATUS_CODE.SUCCESS);
                        }
                    );
                });
                }
            );
    
});
