import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get discussions", { tags: ['comments', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const discussionName = "TestDiscName";
    const discussionNameRole = "TestDiscNameRole";
    const discussionNameUser = "TestDiscNameUser";

    let policyId, documentId, discussionId, userDid;

    const getDiscussions = ({ authorization, policyId, documentId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.GET,
            url: API.Discussions(policyId, documentId),
            headers: { authorization },
            failOnStatusCode,
        });
    };

    before("Get policy, document id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                timeout: 180000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                response.body.forEach(element => {
                    if (element.name == "iRec_3") policyId = element.id
                })
                cy.getBlockByTag(authorization, policyId, "registrants_grid").then((response) => {
                    documentId = response.body.data.at(0).id;
                    userDid = response.body.data.at(0).owner;
                })

            })
        })
    })

    it("Get discussions by SR", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getDiscussions({ authorization, policyId, documentId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(1);
                expect(response.body.at(0).name).eq(discussionName);
                expect(response.body.at(0).policyId).eq(policyId);
                expect(response.body.at(0).privacy).eq("public");
                discussionId = response.body.at(0).id;
            })
        });
    })

    it("Get discussions by User", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getDiscussions({ authorization, policyId, documentId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(3);

                expect(response.body.at(0).name).eq(discussionNameRole);
                expect(response.body.at(0).policyId).eq(policyId);
                expect(response.body.at(0).privacy).eq("roles");
                expect(response.body.at(0).roles).to.deep.equal(["Registrant"]);

                expect(response.body.at(1).name).eq(discussionNameUser);
                expect(response.body.at(1).policyId).eq(policyId);
                expect(response.body.at(1).privacy).eq("users");
                expect(response.body.at(1).users).to.deep.equal([userDid]);

                expect(response.body.at(2).name).eq(discussionName);
                expect(response.body.at(2).policyId).eq(policyId);
                expect(response.body.at(2).privacy).eq("public");
                expect(response.body.at(2).id).eq(discussionId);
            })
        });
    })

    it("Get discussion without auth - Negative", () => {
        getDiscussions({ policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get discussion with invalid auth - Negative", () => {
        getDiscussions({ authorization: 'bearer 11111111111111111111@#$', policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get discussion with empty auth - Negative", () => {
        getDiscussions({ authorization: '', policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
});