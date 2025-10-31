import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Indexer MGS. Comparing", { tags: ['mgs-comparing', 'all'] }, () => {

    const MGSIndexerAPIToken = Cypress.env('MGSIndexerAPIToken');
    const MGSAdminUsername = Cypress.env('MGSAdmin');
    const MGSStoreUsername = "storeData"
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
                            prev = JSON.parse(response.body.schema.document.properties.indexerMGSStat.enum.at(0));
                            cy.request({
                                method: METHOD.GET,
                                url: "https://indexer.guardianservice.app/api/v1/testnet/landing/analytics",
                                headers: {
                                    authorization: "Bearer " + MGSIndexerAPIToken,
                                },
                            }).then((response) => {
                                expect(response.status).eql(STATUS_CODE.OK);
                                let current = response.body[0];
                                cy.request({
                                    method: METHOD.GET,
                                    url: "https://indexer.guardianservice.app/api/v1/testnet/entities/tokens",
                                    headers: {
                                        authorization: "Bearer " + MGSIndexerAPIToken,
                                    },
                                }).then((response) => {
                                    expect(parseInt(response.body.total)).to.be.at.least(parseInt(prev.tokens));
                                    expect(parseInt(current.methodologies)).to.be.at.least(parseInt(prev.methodologies));
                                    expect(parseInt(current.projects)).to.be.at.least(parseInt(prev.projects));
                                    expect(parseInt(current.registries)).to.be.at.least(parseInt(prev.registries));
                                    expect(parseInt(current.totalFungible)).to.be.at.least(parseInt(prev.totalFungible));
                                    expect(parseInt(current.totalIssuance)).to.be.at.least(parseInt(prev.totalIssuance));
                                    expect(parseInt(current.totalSerialized)).to.be.at.least(parseInt(prev.totalSerialized));
                                    current.tokens = response.body.total;
                                    schema.document.properties.indexerMGSStat.enum[0] = JSON.stringify(current);
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
                            })
                        })

                    })
                })
            })
        })

    });
});
