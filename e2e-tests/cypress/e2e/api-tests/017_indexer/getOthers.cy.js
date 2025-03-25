import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Indexer. Get other", { tags: ['indexer', 'firstPool'] }, () => {

    it("Get list of NFTs", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerNFTs,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0)).to.have.property("serialNumber");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("metadata");
            expect(response.body.items.at(0)).to.have.property("tokenId");
            expect(response.body.items.at(0)).to.have.property("_id");
        });
    });

    it("Get list of Topics", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTopics,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-topic");
            expect(response.body.items.at(0).type).eq("Topic");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("name");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("messageType");
            expect(response.body.items.at(0).options).to.have.property("parentId");
            expect(response.body.items.at(0).options).to.have.property("childId");
        });
    });

    it("Get list of Contracts", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerContracts,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-contract");
            expect(response.body.items.at(0).type).eq("Contract");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("contractId");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("contractType");
        });
    });
});
