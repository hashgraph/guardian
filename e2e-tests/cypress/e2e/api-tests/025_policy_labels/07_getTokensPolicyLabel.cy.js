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
            })
        });
    })

    it("Get tokens for policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                tokenLabel = response.body.at(0);
                expect(response.body.at(0)).to.have.property("createDate");
                expect(response.body.at(0)).to.have.property("document");
                expect(response.body.at(0)).to.have.property("documentFields");
                expect(response.body.at(0)).to.have.property("documentFileId");
                expect(response.body.at(0)).to.have.property("hash");
                expect(response.body.at(0)).to.have.property("id");
                expect(response.body.at(0)).to.have.property("messageId");
                expect(response.body.at(0)).to.have.property("owner");
                expect(response.body.at(0)).to.have.property("policyId");
                expect(response.body.at(0)).to.have.property("relationships");
                expect(response.body.at(0)).to.have.property("signature");
                expect(response.body.at(0)).to.have.property("status");
                expect(response.body.at(0)).to.have.property("tag");
                expect(response.body.at(0)).to.have.property("topicId");
                expect(response.body.at(0)).to.have.property("type");
            });
        })
    });

    it("Get tokens for policy label without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get tokens for policy label with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens,
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
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    })

    it("Get tokens documents", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens + tokenLabel.id,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("relatedDocuments");
                expect(response.body).to.have.property("targetDocument");
                expect(response.body).to.have.property("unrelatedDocuments");
            });
        })
    });

    it("Get tokens documents without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens + tokenLabel.id,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get tokens documents with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens + tokenLabel.id,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    })

    it("Get tokens documents with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + policyLabel.id + "/" + API.ListOfTokens + tokenLabel.id,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    })
});
