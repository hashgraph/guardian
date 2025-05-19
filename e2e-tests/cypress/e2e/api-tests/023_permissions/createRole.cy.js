import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Create role", { tags: ['permissions', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const newRole = "TestRole";

    it("Create role", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Permissions + API.Roles,
                body: {
                    "id": null,
                    "name": newRole,
                    "description": newRole + " description",
                    "permissions": [
                        "ANALYTIC_POLICY_READ",
                        "ANALYTIC_MODULE_READ",
                        "ANALYTIC_TOOL_READ",
                        "ANALYTIC_SCHEMA_READ",
                        "ANALYTIC_DOCUMENT_READ",
                        "ARTIFACTS_FILE_CREATE",
                        "ARTIFACTS_FILE_DELETE",
                        "CONTRACTS_CONTRACT_EXECUTE",
                        "MODULES_MODULE_CREATE",
                        "MODULES_MODULE_UPDATE",
                        "MODULES_MODULE_DELETE",
                        "MODULES_MODULE_REVIEW",
                        "POLICIES_POLICY_CREATE",
                        "POLICIES_POLICY_UPDATE",
                        "POLICIES_POLICY_DELETE",
                        "POLICIES_POLICY_REVIEW",
                        "POLICIES_POLICY_EXECUTE",
                        "POLICIES_POLICY_MANAGE",
                        "SCHEMAS_SCHEMA_CREATE",
                        "SCHEMAS_SCHEMA_UPDATE",
                        "SCHEMAS_SCHEMA_DELETE",
                        "SCHEMAS_SCHEMA_REVIEW",
                        "TOOLS_TOOL_CREATE",
                        "TOOLS_TOOL_UPDATE",
                        "TOOLS_TOOL_DELETE",
                        "TOOLS_TOOL_REVIEW",
                        "TOKENS_TOKEN_CREATE",
                        "TOKENS_TOKEN_UPDATE",
                        "TOKENS_TOKEN_DELETE",
                        "TOKENS_TOKEN_EXECUTE",
                        "TOKENS_TOKEN_MANAGE",
                        "TAGS_TAG_READ",
                        "TAGS_TAG_CREATE",
                        "SUGGESTIONS_SUGGESTIONS_READ",
                        "SUGGESTIONS_SUGGESTIONS_UPDATE",
                        "PERMISSIONS_ROLE_CREATE",
                        "PERMISSIONS_ROLE_UPDATE",
                        "PERMISSIONS_ROLE_DELETE",
                        "PERMISSIONS_ROLE_MANAGE",
                        "STATISTICS_STATISTIC_CREATE",
                        "STATISTICS_LABEL_CREATE",
                        "SCHEMAS_RULE_CREATE",
                        "SCHEMAS_RULE_EXECUTE",
                        "FORMULAS_FORMULA_CREATE",
                        "ACCESS_POLICY_ALL",
                        "DELEGATION_ROLE_MANAGE"
                    ]
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("createDate");
                expect(response.body).to.have.property("default");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("name");
                expect(response.body).to.have.property("owner");
                expect(response.body).to.have.property("permissions");
                expect(response.body).to.have.property("readonly");
                expect(response.body).to.have.property("uuid");
                expect(response.body).to.have.property("updateDate");
                expect(response.body.name).eql(newRole);
                expect(response.body.description).eql(newRole + " description");
                expect(response.body.permissions).to.include.members([
                    "ANALYTIC_POLICY_READ",
                    "ANALYTIC_MODULE_READ",
                    "ANALYTIC_TOOL_READ",
                    "ANALYTIC_SCHEMA_READ",
                    "ANALYTIC_DOCUMENT_READ",
                    "ARTIFACTS_FILE_CREATE",
                    "ARTIFACTS_FILE_DELETE",
                    "CONTRACTS_CONTRACT_EXECUTE",
                    "MODULES_MODULE_CREATE",
                    "MODULES_MODULE_UPDATE",
                    "MODULES_MODULE_DELETE",
                    "MODULES_MODULE_REVIEW",
                    "POLICIES_POLICY_CREATE",
                    "POLICIES_POLICY_UPDATE",
                    "POLICIES_POLICY_DELETE",
                    "POLICIES_POLICY_REVIEW",
                    "POLICIES_POLICY_EXECUTE",
                    "POLICIES_POLICY_MANAGE",
                    "SCHEMAS_SCHEMA_CREATE",
                    "SCHEMAS_SCHEMA_UPDATE",
                    "SCHEMAS_SCHEMA_DELETE",
                    "SCHEMAS_SCHEMA_REVIEW",
                    "TOOLS_TOOL_CREATE",
                    "TOOLS_TOOL_UPDATE",
                    "TOOLS_TOOL_DELETE",
                    "TOOLS_TOOL_REVIEW",
                    "TOKENS_TOKEN_CREATE",
                    "TOKENS_TOKEN_UPDATE",
                    "TOKENS_TOKEN_DELETE",
                    "TOKENS_TOKEN_EXECUTE",
                    "TOKENS_TOKEN_MANAGE",
                    "TAGS_TAG_READ",
                    "TAGS_TAG_CREATE",
                    "SUGGESTIONS_SUGGESTIONS_READ",
                    "SUGGESTIONS_SUGGESTIONS_UPDATE",
                    "PERMISSIONS_ROLE_CREATE",
                    "PERMISSIONS_ROLE_UPDATE",
                    "PERMISSIONS_ROLE_DELETE",
                    "PERMISSIONS_ROLE_MANAGE",
                    "STATISTICS_STATISTIC_CREATE",
                    "STATISTICS_LABEL_CREATE",
                    "SCHEMAS_RULE_CREATE",
                    "SCHEMAS_RULE_EXECUTE",
                    "FORMULAS_FORMULA_CREATE",
                    "ACCESS_POLICY_ALL",
                    "DELEGATION_ROLE_MANAGE"
                ])
            });
        })
    });

    it("Create role without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Permissions + API.Roles,
            body: {
                "id": null,
                "name": newRole,
                "description": newRole + " description",
                "permissions": [
                    "ANALYTIC_POLICY_READ",
                    "ANALYTIC_MODULE_READ",
                    "ANALYTIC_TOOL_READ",
                    "ANALYTIC_SCHEMA_READ",
                    "ANALYTIC_DOCUMENT_READ",
                    "ARTIFACTS_FILE_CREATE",
                    "ARTIFACTS_FILE_DELETE",
                    "CONTRACTS_CONTRACT_EXECUTE",
                    "MODULES_MODULE_CREATE",
                    "MODULES_MODULE_UPDATE",
                    "MODULES_MODULE_DELETE",
                    "MODULES_MODULE_REVIEW",
                    "POLICIES_POLICY_CREATE",
                    "POLICIES_POLICY_UPDATE",
                    "POLICIES_POLICY_DELETE",
                    "POLICIES_POLICY_REVIEW",
                    "POLICIES_POLICY_EXECUTE",
                    "POLICIES_POLICY_MANAGE",
                    "SCHEMAS_SCHEMA_CREATE",
                    "SCHEMAS_SCHEMA_UPDATE",
                    "SCHEMAS_SCHEMA_DELETE",
                    "SCHEMAS_SCHEMA_REVIEW",
                    "TOOLS_TOOL_CREATE",
                    "TOOLS_TOOL_UPDATE",
                    "TOOLS_TOOL_DELETE",
                    "TOOLS_TOOL_REVIEW",
                    "TOKENS_TOKEN_CREATE",
                    "TOKENS_TOKEN_UPDATE",
                    "TOKENS_TOKEN_DELETE",
                    "TOKENS_TOKEN_EXECUTE",
                    "TOKENS_TOKEN_MANAGE",
                    "TAGS_TAG_READ",
                    "TAGS_TAG_CREATE",
                    "SUGGESTIONS_SUGGESTIONS_READ",
                    "SUGGESTIONS_SUGGESTIONS_UPDATE",
                    "PERMISSIONS_ROLE_CREATE",
                    "PERMISSIONS_ROLE_UPDATE",
                    "PERMISSIONS_ROLE_DELETE",
                    "PERMISSIONS_ROLE_MANAGE",
                    "STATISTICS_STATISTIC_CREATE",
                    "STATISTICS_LABEL_CREATE",
                    "SCHEMAS_RULE_CREATE",
                    "SCHEMAS_RULE_EXECUTE",
                    "FORMULAS_FORMULA_CREATE",
                    "ACCESS_POLICY_ALL",
                    "DELEGATION_ROLE_MANAGE"
                ]
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create role with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Permissions + API.Roles,
            body: {
                "id": null,
                "name": newRole,
                "description": newRole + " description",
                "permissions": [
                    "ANALYTIC_POLICY_READ",
                    "ANALYTIC_MODULE_READ",
                    "ANALYTIC_TOOL_READ",
                    "ANALYTIC_SCHEMA_READ",
                    "ANALYTIC_DOCUMENT_READ",
                    "ARTIFACTS_FILE_CREATE",
                    "ARTIFACTS_FILE_DELETE",
                    "CONTRACTS_CONTRACT_EXECUTE",
                    "MODULES_MODULE_CREATE",
                    "MODULES_MODULE_UPDATE",
                    "MODULES_MODULE_DELETE",
                    "MODULES_MODULE_REVIEW",
                    "POLICIES_POLICY_CREATE",
                    "POLICIES_POLICY_UPDATE",
                    "POLICIES_POLICY_DELETE",
                    "POLICIES_POLICY_REVIEW",
                    "POLICIES_POLICY_EXECUTE",
                    "POLICIES_POLICY_MANAGE",
                    "SCHEMAS_SCHEMA_CREATE",
                    "SCHEMAS_SCHEMA_UPDATE",
                    "SCHEMAS_SCHEMA_DELETE",
                    "SCHEMAS_SCHEMA_REVIEW",
                    "TOOLS_TOOL_CREATE",
                    "TOOLS_TOOL_UPDATE",
                    "TOOLS_TOOL_DELETE",
                    "TOOLS_TOOL_REVIEW",
                    "TOKENS_TOKEN_CREATE",
                    "TOKENS_TOKEN_UPDATE",
                    "TOKENS_TOKEN_DELETE",
                    "TOKENS_TOKEN_EXECUTE",
                    "TOKENS_TOKEN_MANAGE",
                    "TAGS_TAG_READ",
                    "TAGS_TAG_CREATE",
                    "SUGGESTIONS_SUGGESTIONS_READ",
                    "SUGGESTIONS_SUGGESTIONS_UPDATE",
                    "PERMISSIONS_ROLE_CREATE",
                    "PERMISSIONS_ROLE_UPDATE",
                    "PERMISSIONS_ROLE_DELETE",
                    "PERMISSIONS_ROLE_MANAGE",
                    "STATISTICS_STATISTIC_CREATE",
                    "STATISTICS_LABEL_CREATE",
                    "SCHEMAS_RULE_CREATE",
                    "SCHEMAS_RULE_EXECUTE",
                    "FORMULAS_FORMULA_CREATE",
                    "ACCESS_POLICY_ALL",
                    "DELEGATION_ROLE_MANAGE"
                ]
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create role with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Permissions + API.Roles,
            body: {
                "id": null,
                "name": newRole,
                "description": newRole + " description",
                "permissions": [
                    "ANALYTIC_POLICY_READ",
                    "ANALYTIC_MODULE_READ",
                    "ANALYTIC_TOOL_READ",
                    "ANALYTIC_SCHEMA_READ",
                    "ANALYTIC_DOCUMENT_READ",
                    "ARTIFACTS_FILE_CREATE",
                    "ARTIFACTS_FILE_DELETE",
                    "CONTRACTS_CONTRACT_EXECUTE",
                    "MODULES_MODULE_CREATE",
                    "MODULES_MODULE_UPDATE",
                    "MODULES_MODULE_DELETE",
                    "MODULES_MODULE_REVIEW",
                    "POLICIES_POLICY_CREATE",
                    "POLICIES_POLICY_UPDATE",
                    "POLICIES_POLICY_DELETE",
                    "POLICIES_POLICY_REVIEW",
                    "POLICIES_POLICY_EXECUTE",
                    "POLICIES_POLICY_MANAGE",
                    "SCHEMAS_SCHEMA_CREATE",
                    "SCHEMAS_SCHEMA_UPDATE",
                    "SCHEMAS_SCHEMA_DELETE",
                    "SCHEMAS_SCHEMA_REVIEW",
                    "TOOLS_TOOL_CREATE",
                    "TOOLS_TOOL_UPDATE",
                    "TOOLS_TOOL_DELETE",
                    "TOOLS_TOOL_REVIEW",
                    "TOKENS_TOKEN_CREATE",
                    "TOKENS_TOKEN_UPDATE",
                    "TOKENS_TOKEN_DELETE",
                    "TOKENS_TOKEN_EXECUTE",
                    "TOKENS_TOKEN_MANAGE",
                    "TAGS_TAG_READ",
                    "TAGS_TAG_CREATE",
                    "SUGGESTIONS_SUGGESTIONS_READ",
                    "SUGGESTIONS_SUGGESTIONS_UPDATE",
                    "PERMISSIONS_ROLE_CREATE",
                    "PERMISSIONS_ROLE_UPDATE",
                    "PERMISSIONS_ROLE_DELETE",
                    "PERMISSIONS_ROLE_MANAGE",
                    "STATISTICS_STATISTIC_CREATE",
                    "STATISTICS_LABEL_CREATE",
                    "SCHEMAS_RULE_CREATE",
                    "SCHEMAS_RULE_EXECUTE",
                    "FORMULAS_FORMULA_CREATE",
                    "ACCESS_POLICY_ALL",
                    "DELEGATION_ROLE_MANAGE"
                ]
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
