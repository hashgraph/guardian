import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Indexer. Get methodologies", { tags: ['indexer', 'firstPool', 'all'] }, () => {

    it("Get list of Policies", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerPolicies,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("publish-policy");
            expect(response.body.items.at(0).type).eq("Instance-Policy");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("instanceTopicId");
            expect(response.body.items.at(0).options).to.have.property("name");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("policyTag");
            expect(response.body.items.at(0).options).to.have.property("policyTopicId");
            expect(response.body.items.at(0).options).to.have.property("uuid");
        });
    });

    it("Get list of Tools", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTools,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("publish-tool");
            expect(response.body.items.at(0).type).eq("Tool");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("hash");
            expect(response.body.items.at(0).options).to.have.property("name");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("toolTopicId");
            expect(response.body.items.at(0).options).to.have.property("uuid");
        });
    });

    it("Get list of Modules", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerModules,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("publish-module");
            expect(response.body.items.at(0).type).eq("Module");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("name");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("moduleTopicId");
            expect(response.body.items.at(0).options).to.have.property("uuid");
        });
    });

    it("Get list of Schemas", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerSchemas,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("publish-system-schema");
            expect(response.body.items.at(0).type).eq("Schema");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("name");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("codeVersion");
            expect(response.body.items.at(0).options).to.have.property("entity");
        });
    });

    it("Get list of Tokens", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerTokens,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).type).to.be.oneOf(["FUNGIBLE_COMMON", "NON_FUNGIBLE_UNIQUE"]);
            expect(response.body.items.at(0)).to.have.property("createdTimestamp");
            expect(response.body.items.at(0)).to.have.property("modifiedTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("memo");
            expect(response.body.items.at(0)).to.have.property("tokenId");
            expect(response.body.items.at(0)).to.have.property("serialNumber");
        });
    });

    it("Get list of Roles", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerRoles,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("create-vc-document");
            expect(response.body.items.at(0).type).eq("Role-Document");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("group");
            expect(response.body.items.at(0).options).to.have.property("issuer");
            expect(response.body.items.at(0).options).to.have.property("role");
        });
    });

    it("Get list of Statistics", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerStatistics,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("publish-policy-statistic");
            expect(response.body.items.at(0).type).eq("Policy-Statistic");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("name");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("uuid");
            expect(response.body.items.at(0).options).to.have.property("policyTopicId");
        });
    });

    it("Get list of Labels", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerLabels,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("publish-policy-label");
            expect(response.body.items.at(0).type).eq("Policy-Label");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("uuid");
            expect(response.body.items.at(0).options).to.have.property("policyTopicId");
        });
    });

    it("Get list of Formulas", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiIndexer + API.IndexerFormulas,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).to.have.property("total");
            expect(response.body).to.have.property("order");
            expect(response.body).to.have.property("items");
            expect(response.body.items.at(0).action).eq("publish-formula");
            expect(response.body.items.at(0).type).eq("Formula");
            expect(response.body.items.at(0)).to.have.property("consensusTimestamp");
            expect(response.body.items.at(0)).to.have.property("id");
            expect(response.body.items.at(0)).to.have.property("lastUpdate");
            expect(response.body.items.at(0)).to.have.property("topicId");
            expect(response.body.items.at(0)).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("description");
            expect(response.body.items.at(0).options).to.have.property("name");
            expect(response.body.items.at(0).options).to.have.property("owner");
            expect(response.body.items.at(0).options).to.have.property("policyTopicId");
            expect(response.body.items.at(0).options).to.have.property("uuid");
        });
    });
});
