import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics MGS. Comparing", { tags: ['mgs-comparing', 'all'] }, () => {
    
    it("Get list of registries", () => {
        cy.request({
            method: METHOD.GET,
            url: "https://dev.guardianservice.app/analytics/analytics/testnet/dashboards",
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            cy.request({
                method: METHOD.GET,
                url: "https://dev.guardianservice.app/analytics/analytics/testnet/dashboards/" + response.body.at(0).id,
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let current = response.body.report;
                cy.fixture("analyticsMGSStat.json").then((prev) => {
                    expect(parseInt(current.didDocuments)).to.be.at.least(parseInt(prev.didDocuments));
                    expect(parseInt(current.documents)).to.be.at.least(parseInt(prev.documents));
                    expect(parseInt(current.fTokens)).to.be.at.least(parseInt(prev.fTokens));
                    expect(parseInt(current.instances)).to.be.at.least(parseInt(prev.instances));
                    expect(parseInt(current.messages)).to.be.at.least(parseInt(prev.messages));
                    expect(parseInt(current.modules)).to.be.at.least(parseInt(prev.modules));
                    expect(parseInt(current.nfTokens)).to.be.at.least(parseInt(prev.nfTokens));
                    expect(parseInt(current.nfTotalBalances)).to.be.at.least(parseInt(prev.nfTotalBalances));
                    expect(parseInt(current.policies)).to.be.at.least(parseInt(prev.policies));
                    expect(parseInt(current.revokeDocuments)).to.be.at.least(parseInt(prev.revokeDocuments));
                    expect(parseInt(current.schemas)).to.be.at.least(parseInt(prev.schemas));
                    expect(parseInt(current.standardRegistries)).to.be.at.least(parseInt(prev.standardRegistries));
                    expect(parseInt(current.systemSchemas)).to.be.at.least(parseInt(prev.systemSchemas));
                    expect(parseInt(current.tags)).to.be.at.least(parseInt(prev.tags));
                    expect(parseInt(current.tokens)).to.be.at.least(parseInt(prev.tokens));
                    expect(parseInt(current.topics)).to.be.at.least(parseInt(prev.topics));
                    expect(parseInt(current.userTopic)).to.be.at.least(parseInt(prev.userTopic));
                    expect(parseInt(current.users)).to.be.at.least(parseInt(prev.users));
                    expect(parseInt(current.vcDocuments)).to.be.at.least(parseInt(prev.vcDocuments));
                    expect(parseInt(current.vpDocuments)).to.be.at.least(parseInt(prev.vpDocuments));
                })
                cy.writeFile("cypress/fixtures/analyticsMGSStat.json", JSON.stringify(current))
            });

        });
    });
});
