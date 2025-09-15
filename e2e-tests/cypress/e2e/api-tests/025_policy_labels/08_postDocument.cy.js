import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get tokens for policy label", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');

    let policyLabel, tokenLabel;

    before("Get policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.status == "PUBLISHED") {
                        policyLabel = element;
                    }
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    tokenLabel = response.body.at(0);
                });
            })
        });
    })

    it("Get tokens for policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Documents,
                body: {
                    target: tokenLabel.id,
                    documents: [
                        {
                            status: true
                        },
                        {
                            status: true
                        },
                        {
                            status: true,
                            A1: 12,
                            C1: 12
                        }
                    ]
                },
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("createDate");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("relationships");
                expect(response.body).to.have.property("target");
                expect(response.body).to.have.property("updateDate");
                expect(response.body).to.have.property("uuid");
                expect(response.body).to.have.property("document");
                expect(response.body).to.have.property("documentFileId");
                expect(response.body).to.have.property("messageId");
                expect(response.body).to.have.property("policyInstanceTopicId");
                expect(response.body).to.have.property("policyTopicId");
                expect(response.body).to.have.property("topicId");

                expect(response.body.creator).eql(policyLabel.creator);
                expect(response.body.owner).eql(policyLabel.owner);
                expect(response.body.definitionId).eql(policyLabel.id);
                expect(response.body.policyId).eql(tokenLabel.policyId);
            });
        })
    });

    it("Get tokens for policy label without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Documents,
            body: {
                target: tokenLabel.id,
                documents: [
                    {
                        status: true
                    },
                    {
                        status: true
                    },
                    {
                        status: true,
                        A1: 12,
                        C1: 12
                    }
                ]
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get tokens for policy label with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Documents,
            body: {
                target: tokenLabel.id,
                documents: [
                    {
                        status: true
                    },
                    {
                        status: true
                    },
                    {
                        status: true,
                        A1: 12,
                        C1: 12
                    }
                ]
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    })

    it("Get tokens for policy label with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.Documents,
            body: {
                target: tokenLabel.id,
                documents: [
                    {
                        status: true
                    },
                    {
                        status: true
                    },
                    {
                        status: true,
                        A1: 12,
                        C1: 12
                    }
                ]
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    })
});
