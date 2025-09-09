import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get policy labels", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    const labelName = "testPolicyLabelAPI";

    let policy, did, SRDid;

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

    it("Get policy labels", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.PolicyLabels,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.at(0).creator).eql(did);
                expect(response.body.at(0).description).eql(labelName + " desc");
                expect(response.body.at(0).name).eql(labelName);
                expect(response.body.at(0).policyId).eql(policy.id);
                expect(response.body.at(0).owner).eql(SRDid);
                expect(response.body.at(0).status).eql("DRAFT");
                expect(response.body.at(0).config.children).eql([]);
                expect(response.body.at(0).config.imports).eql([]);
                expect(response.body.at(0).config.schemaId).eql("");

                response.body.forEach(item => {
                    expect(item).to.have.property("config");
                    expect(item).to.have.property("creator");
                    expect(item).to.have.property("description");
                    expect(item).to.have.property("id");
                    expect(item).to.have.property("name");
                    expect(item).to.have.property("owner");
                    expect(item).to.have.property("policyId");
                    expect(item).to.have.property("status");
                });
            });
        })
    });

    it("Get policy labels without auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy labels with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get policy labels with empty auth - Negative", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels,
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
