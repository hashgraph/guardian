import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Create policy labels", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    const labelName = "testPolicyLabelAPI";

    let policy, did, SRDid, labelId, policyLabel;

    before("Get policy ids and did", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.name == "iRec_4") {
                        policy = element;
                    }
                })
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Profiles + UserUsername,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    did = response.body.did;
                    SRDid = response.body.parent;
                });
            });
        });
    })

    it("Create policy labels", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicyLabels,
                body: {
                    name: labelName,
                    description: labelName + " desc",
                    policyId: policy.id,
                    policyInstanceTopicId: policy.instanceTopicId
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                labelId = response.body.id;

                expect(response.body).to.have.property("uuid");

                expect(response.body.creator).eql(did);
                expect(response.body.owner).eql(SRDid);
                expect(response.body.name).eql(labelName);
                expect(response.body.description).eql(labelName + " desc");
                expect(response.body.policyId).eql(policy.id);
                expect(response.body.policyTopicId).eql(policy.topicId);
                expect(response.body.policyInstanceTopicId).eql(policy.instanceTopicId);
                expect(response.body.status).eql("DRAFT");
                expect(response.body.config.children).eql([]);
                expect(response.body.config.imports).eql([]);
                expect(response.body.config.schemaId).eql("");
            });
        })
    });

    it("Create policy labels without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyLabels,
            body: {
                name: labelName,
                description: labelName + " desc",
                policyId: policy.id,
                policyInstanceTopicId: policy.instanceTopicId
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create policy labels with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyLabels,
            body: {
                name: labelName,
                description: labelName + " desc",
                policyId: policy.id,
                policyInstanceTopicId: policy.instanceTopicId
            },
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create policy labels with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyLabels,
            body: {
                name: labelName,
                description: labelName + " desc",
                policyId: policy.id,
                policyInstanceTopicId: policy.instanceTopicId
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy label", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels + labelId,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property("uuid");

                expect(response.body.id).eql(labelId);
                expect(response.body.creator).eql(did);
                expect(response.body.owner).eql(SRDid);
                expect(response.body.name).eql(labelName);
                expect(response.body.description).eql(labelName + " desc");
                expect(response.body.policyId).eql(policy.id);
                expect(response.body.policyTopicId).eql(policy.topicId);
                expect(response.body.policyInstanceTopicId).eql(policy.instanceTopicId);
                expect(response.body.status).eql("DRAFT");
                expect(response.body.config.children).eql([]);
                expect(response.body.config.imports).eql([]);
                expect(response.body.config.schemaId).eql("");
            });
        })
    });

    it("Get policy label without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + labelId,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy label with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + labelId,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy label with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + labelId,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
