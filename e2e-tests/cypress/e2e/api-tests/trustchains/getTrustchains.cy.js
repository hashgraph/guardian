// import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
// import API from "../../../support/ApiUrls";

// context("Schemas", () => {
//     const authorization = Cypress.env("authorization");

//     it("Requests all VP documents", () => {
//         cy.sendRequest(METHOD.GET, API.Trustchains, { authorization }).then(
//             (resp) => {
//                 expect(resp.status).eql(STATUS_CODE.OK);
//                 expect(resp.body[0]).to.have.property("id");
//             }
//         );
//     });
// });
