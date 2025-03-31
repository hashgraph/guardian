import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Indexer. Get documents", { tags: ['indexer', 'firstPool'] }, () => {

    it("Get list of DIDs", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerDIDs,
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

    it("Get list of VCs", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerVCs,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-vc-document");
            expect(response.body.items.at(0).type).eq("VC-Document");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("issuer");
            expect(response.body.items.at(0).options).to.have.property("documentStatus");
            expect(response.body.items.at(0).options).to.have.property("relationships");
        });
    });

    it("Get list of VPs", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerVPs,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-vp-document");
            expect(response.body.items.at(0).type).eq("VP-Document");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("issuer");
            expect(response.body.items.at(0).options).to.have.property("relationships");
        });
    });

    it("Get list of VCs(Statistic)", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerStatisticVCs,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-assessment-document");
            expect(response.body.items.at(0).type).eq("VC-Document");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("issuer");
            expect(response.body.items.at(0).options).to.have.property("documentStatus");
            expect(response.body.items.at(0).options).to.have.property("relationships");
        });
    });

    it("Get list of VPs(label)", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerLabelVPs,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-label-document");
            expect(response.body.items.at(0).type).eq("VP-Document");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("issuer");
            expect(response.body.items.at(0).options).to.have.property("definition");
            expect(response.body.items.at(0).options).to.have.property("target");
            expect(response.body.items.at(0).options).to.have.property("relationships");
        });
    });
});
