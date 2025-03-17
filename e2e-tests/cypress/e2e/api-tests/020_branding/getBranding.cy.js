import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Get branding", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    it("Get branding", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Branding,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("companyLogoUrl");
            expect(response.body).to.have.property("companyName");
            expect(response.body).to.have.property("faviconUrl");
            expect(response.body).to.have.property("headerColor");
            expect(response.body).to.have.property("headerColor1");
            expect(response.body).to.have.property("loginBannerUrl");
            expect(response.body).to.have.property("primaryColor");
        });
    });
});
