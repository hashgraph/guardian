import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Analytics MGS. Comparing", { tags: ['mgs-comparing', 'all'] }, () => {

    const MGSAdminUsername = Cypress.env('MGSAdmin');
    const MGSStoreUsername = "storeData";
    let prev, tenantId, schema;

    it("Get list of registries", () => {
        Authorization.getAccessTokenMGS(MGSAdminUsername, null).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiMGS + API.TenantsUser,
                headers: {
                    authorization,
                },
                body: {
                    "pageSize": 10,
                    "pageIndex": 0,
                    "sortDirection": "desc"
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.tenants.forEach(element => {
                    if (element.tenantName == MGSStoreUsername) {
                        tenantId = element.id
                    }
                })
                Authorization.getAccessTokenMGS(MGSStoreUsername, tenantId).then((authorization) => {
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiMGS + API.PolicySchemas,
                        headers: {
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiMGS + API.Schemas + API.SchemasWithSubSchemas,
                            headers: {
                                authorization,
                                "Accept-Encoding": "gzip, deflate, br"
                            },
                            qs: {
                                category: "POLICY",
                                schemaId: response.body.at(0).id,
                                topicId: response.body.at(0).topicId
                            }
                        }).then((response) => {
                            expect(response.status).to.eq(STATUS_CODE.OK);
                            schema = response.body.schema;
                            prev = JSON.parse(response.body.schema.document.properties.analyticsMGSStat.enum.at(0));
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
                                    schema.document.properties.analyticsMGSStat.enum[0] = JSON.stringify(current);
                                    delete schema.documentFileId;
                                    cy.request({
                                        method: METHOD.PUT,
                                        url: API.ApiMGS + API.Schemas,
                                        headers: {
                                            authorization,
                                        },
                                        body: schema
                                    }).then((response) => {
                                        expect(response.status).eql(STATUS_CODE.OK);
                                    })
                                });

                            });
                        });
                    });
                })
            })
        })
    })
})
