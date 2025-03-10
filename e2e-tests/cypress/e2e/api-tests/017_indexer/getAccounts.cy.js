import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Indexer. Get accounts", { tags: ['indexer', 'firstPool', 'all'] }, () => {

    it("Get list of registries", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerRegistries,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("Init");
            expect(response.body.items.at(0).type).eq("Standard Registry");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("did");
            expect(response.body.items.at(0).options).to.have.property("registrantTopicId");
        });
    });

    it("Get list of users", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerUsers,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-did-document");
            expect(response.body.items.at(0).type).eq("DID-Document");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("did");
            expect(response.body.items.at(0).options).to.have.property("relationships");
        });
    });
});
