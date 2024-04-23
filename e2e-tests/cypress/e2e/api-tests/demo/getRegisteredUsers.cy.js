import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Demo", { tags: '@demo' }, () => {
    
    it("Returns list of registered users", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.RegUsers,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.at(0)).to.have.property("username");
            expect(response.body.at(0)).to.have.property("role");
            expect(response.body.at(0)).to.have.property("policyRoles");
        });
    });
});
