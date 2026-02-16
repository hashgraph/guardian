import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Indexer. Search token mints (carbon credits)", { tags: ['indexer', 'firstPool'] }, () => {

    it("Search token mints - default (no filters)", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("totalAmount");
            expect(response.body).to.have.property("pageIndex");
            expect(response.body).to.have.property("pageSize");
            expect(response.body).to.have.property("items");
            expect(response.body.items).to.be.an("array");
            if (response.body.items.length > 0) {
                const item = response.body.items[0];
                expect(item).to.have.property("consensusTimestamp");
                expect(item).to.have.property("topicId");
                expect(item).to.have.property("tokenId");
                expect(item).to.have.property("tokenAmount");
                expect(item).to.have.property("tokenAmountNumeric");
                expect(item.tokenAmountNumeric).to.be.a("number");
            }
        });
    });

    it("Search token mints - with pagination", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: {
                pageIndex: 0,
                pageSize: 5,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.pageSize).to.be.at.most(5);
            expect(response.body.pageIndex).to.eq(0);
            expect(response.body.items.length).to.be.at.most(5);
        });
    });

    it("Search token mints - with ordering by tokenAmount", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: {
                orderField: "analytics.tokenAmount",
                orderDir: "DESC",
                pageSize: 10,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.items).to.be.an("array");
        });
    });

    it("Search token mints - filter by minAmount", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: {
                minAmount: "1",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.items).to.be.an("array");
            for (const item of response.body.items) {
                expect(item.tokenAmountNumeric).to.be.at.least(1);
            }
        });
    });

    it("Search token mints - filter by maxAmount", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: {
                maxAmount: "999999999",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.items).to.be.an("array");
            for (const item of response.body.items) {
                expect(item.tokenAmountNumeric).to.be.at.most(999999999);
            }
        });
    });

    it("Search token mints - filter by amount range", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: {
                minAmount: "1",
                maxAmount: "100000",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.items).to.be.an("array");
            for (const item of response.body.items) {
                expect(item.tokenAmountNumeric).to.be.at.least(1);
                expect(item.tokenAmountNumeric).to.be.at.most(100000);
            }
        });
    });

    it("Search token mints - filter by date range", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: {
                startDate: "2020-01-01T00:00:00Z",
                endDate: "2030-12-31T23:59:59Z",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.items).to.be.an("array");
        });
    });

    it("Search token mints - filter by policyId", () => {
        // First get any token mint to extract policyId
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: { pageSize: 1 },
        }).then((response) => {
            if (response.body.items.length > 0 && response.body.items[0].policyId) {
                const policyId = response.body.items[0].policyId;
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiIndexer + API.IndexerTokenMints,
                    qs: { policyId },
                }).then((filteredResponse) => {
                    expect(filteredResponse.status).eql(STATUS_CODE.OK);
                    for (const item of filteredResponse.body.items) {
                        expect(item.policyId).to.eq(policyId);
                    }
                });
            }
        });
    });

    it("Search token mints - filter by tokenId", () => {
        // First get any token mint to extract tokenId
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: { pageSize: 1 },
        }).then((response) => {
            if (response.body.items.length > 0) {
                const tokenId = response.body.items[0].tokenId;
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiIndexer + API.IndexerTokenMints,
                    qs: { tokenId },
                }).then((filteredResponse) => {
                    expect(filteredResponse.status).eql(STATUS_CODE.OK);
                    for (const item of filteredResponse.body.items) {
                        expect(item.tokenId).to.eq(tokenId);
                    }
                });
            }
        });
    });

    it("Search token mints - enriched data includes token info", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: { pageSize: 10 },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.items).to.be.an("array");
            // Verify structure of enriched items
            for (const item of response.body.items) {
                expect(item).to.have.property("consensusTimestamp");
                expect(item).to.have.property("topicId");
                expect(item).to.have.property("tokenId");
                expect(item).to.have.property("tokenAmount");
                expect(item).to.have.property("tokenAmountNumeric");
                // Optional enriched fields should be present if available
                if (item.tokenName !== undefined) {
                    expect(item.tokenName).to.be.a("string");
                }
                if (item.policyDescription !== undefined) {
                    expect(item.policyDescription).to.be.a("string");
                }
                if (item.mintDate !== undefined) {
                    expect(item.mintDate).to.be.a("string");
                }
            }
        });
    });

    it("Search token mints - combined filters (amount + date)", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokenMints,
            qs: {
                minAmount: "1",
                startDate: "2020-01-01T00:00:00Z",
                endDate: "2030-12-31T23:59:59Z",
                pageSize: 10,
                orderField: "analytics.tokenAmount",
                orderDir: "DESC",
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body.items).to.be.an("array");
            for (const item of response.body.items) {
                expect(item.tokenAmountNumeric).to.be.at.least(1);
            }
        });
    });
});
