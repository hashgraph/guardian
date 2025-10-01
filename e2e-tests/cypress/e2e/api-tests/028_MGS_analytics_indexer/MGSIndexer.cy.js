import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Indexer MGS. Comparing", { tags: ['mgs-comparing', 'all'] }, () => {

    const MGSIndexerAPIToken = Cypress.env('MGSIndexerAPIToken');

    it("Get list of registries", () => {
        cy.request({
            method: METHOD.GET,
            url: "https://indexer.guardianservice.app/api/v1/testnet/landing/analytics",
            headers: {
                authorization: "Bearer " + MGSIndexerAPIToken,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            let current = response.body.at(0);
            cy.request({
                method: METHOD.GET,
                url: "https://indexer.guardianservice.app/api/v1/testnet/entities/tokens",
                headers: {
                    authorization: "Bearer " + MGSIndexerAPIToken,
                },
            }).then((response) => {
                cy.fixture("indexerMGSStat.json").then((prev) => {
                    expect(parseInt(response.body.total)).to.be.at.least(parseInt(prev.tokens));
                    expect(parseInt(current.methodologies)).to.be.at.least(parseInt(prev.methodologies));
                    expect(parseInt(current.projects)).to.be.at.least(parseInt(prev.projects));
                    expect(parseInt(current.registries)).to.be.at.least(parseInt(prev.registries));
                    expect(parseInt(current.totalFungible)).to.be.at.least(parseInt(prev.totalFungible));
                    expect(parseInt(current.totalIssuance)).to.be.at.least(parseInt(prev.totalIssuance));
                    expect(parseInt(current.totalSerialized)).to.be.at.least(parseInt(prev.totalSerialized));
                })
                current.tokens = response.body.total;
                cy.writeFile("cypress/fixtures/indexerMGSStat.json", JSON.stringify(current))
            });
        })
    });
});
