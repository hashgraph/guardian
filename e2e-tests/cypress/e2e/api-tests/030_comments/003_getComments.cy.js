import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get comments", { tags: ['comments', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const discussionCommentText = "TestDiscCommentText";
    const discussionCommentTextRole = "TestDiscCommentTextRole";
    const discussionCommentTextUser = "TestDiscCommentTextUser";

    let policyId, documentId, discussionId, discussionIdRole, discussionIdUser;

    const getDiscussions = ({ authorization, policyId, documentId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.GET,
            url: API.Discussions(policyId, documentId),
            body: { search: "" },
            headers: { authorization },
            failOnStatusCode,
        });
    };

    const getComments = ({ authorization, policyId, documentId, discussionId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.DiscussionsCommentsSearch(policyId, documentId, discussionId),
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
                    Authorization.getAccessToken(UserUsername).then((authorization) => {
                        getDiscussions({ authorization, policyId, documentId }).then((response) => {
                            discussionIdRole = response.body.at(0).id;
                            discussionIdUser = response.body.at(1).id;
                            discussionId = response.body.at(2).id;
                        })
                    })
                })

            })
        })
    })

    it("Get discussion comments by SR", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getComments({ authorization, policyId, documentId, discussionId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(1);
                expect(response.body.at(0).text).eq(discussionCommentText);
                expect(response.body.at(0).senderName).eq("StandardRegistry");
                expect(response.body.at(0).senderRole).eq("Administrator");
                expect(response.body.at(0).discussionId).eq(discussionId);
                expect(response.body.at(0).policyId).eq(policyId);
            })
        });
    })

    it("Get discussions comments by User", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getComments({ authorization, policyId, documentId, discussionId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(1);

                expect(response.body.at(0).text).eq(discussionCommentText);
                expect(response.body.at(0).senderName).eq("StandardRegistry");
                expect(response.body.at(0).senderRole).eq("Administrator");
                expect(response.body.at(0).discussionId).eq(discussionId);
                expect(response.body.at(0).policyId).eq(policyId);
            })

            getComments({ authorization, policyId, documentId, discussionId: discussionIdRole }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(1);

                expect(response.body.at(0).text).eq(discussionCommentTextRole);
                expect(response.body.at(0).senderName).eq("Registrant");
                expect(response.body.at(0).senderRole).eq("Registrant");
                expect(response.body.at(0).discussionId).eq(discussionIdRole);
                expect(response.body.at(0).policyId).eq(policyId);
            })

            getComments({ authorization, policyId, documentId, discussionId: discussionIdUser }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(1);

                expect(response.body.at(0).text).eq(discussionCommentTextUser);
                expect(response.body.at(0).senderName).eq("Registrant");
                expect(response.body.at(0).senderRole).eq("Registrant");
                expect(response.body.at(0).discussionId).eq(discussionIdUser);
                expect(response.body.at(0).policyId).eq(policyId);
            })
        });
    })


    it("Get discussion comment by SR in Role disc - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getComments({ authorization, policyId, documentId, discussionId: discussionIdRole }).then((response) => {
                expect(response.status).eq(STATUS_CODE.ERROR);
            })
        });
    })


    it("Get discussion comment by SR in User disc - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getComments({ authorization, policyId, documentId, discussionId: discussionIdUser }).then((response) => {
                expect(response.status).eq(STATUS_CODE.ERROR);
            })
        });
    })

    it("Get discussion comment without auth - Negative", () => {
        getComments({ policyId, documentId, discussionId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get discussion comment with invalid auth - Negative", () => {
        getComments({ authorization: 'bearer 11111111111111111111@#$', policyId, documentId, discussionId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get discussion comment with empty auth - Negative", () => {
        getComments({ authorization: '', policyId, documentId, discussionId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
});