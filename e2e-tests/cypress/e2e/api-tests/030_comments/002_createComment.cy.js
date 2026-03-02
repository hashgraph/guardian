import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Create discussion comments", { tags: ['comments', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const discussionCommentText = "TestDiscCommentText";
    const discussionCommentTextRole = "TestDiscCommentTextRole";
    const discussionCommentTextUser = "TestDiscCommentTextUser";

    let policyId, documentId, discussionId, discussionIdRole, discussionIdUser;

    const createDiscussionComment = ({ authorization, policyId, documentId, discussionCommentText, discussionId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.DiscussionsComments(policyId, documentId, discussionId),
            body: {
                text: discussionCommentText
            },
            headers: { authorization },
            failOnStatusCode,
            timeout: 60000
        });
    };

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
                    getDiscussions({ authorization, policyId, documentId }).then((response) => {
                        discussionId = response.body.at(0).id;
                        Authorization.getAccessToken(UserUsername).then((authorization) => {
                            getDiscussions({ authorization, policyId, documentId }).then((response) => {
                                discussionIdUser = response.body.at(1).id;
                                discussionIdRole = response.body.at(0).id;
                            })
                        })
                    })
                })

            })
        })
    })

    it("Create discussion comment by SR", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createDiscussionComment({ authorization, policyId, documentId, discussionCommentText, discussionId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.policyId).eq(policyId);
                expect(response.body.targetId).eq(documentId);
                expect(response.body.text).eq(discussionCommentText);
                expect(response.body.discussionId).eq(discussionId);
            })
        });
    })

    it("Create discussion comment by User in Role disc", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            createDiscussionComment({ authorization, policyId, documentId, discussionCommentText: discussionCommentTextUser, discussionId: discussionIdUser }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.policyId).eq(policyId);
                expect(response.body.targetId).eq(documentId);
                expect(response.body.text).eq(discussionCommentTextUser);
                expect(response.body.discussionId).eq(discussionIdUser);
            })
        });
    })


    it("Create discussion comment by User in User disc", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            createDiscussionComment({ authorization, policyId, documentId, discussionCommentText: discussionCommentTextRole, discussionId: discussionIdRole }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.policyId).eq(policyId);
                expect(response.body.targetId).eq(documentId);
                expect(response.body.text).eq(discussionCommentTextRole);
                expect(response.body.discussionId).eq(discussionIdRole);
            })
        });
    })


    it("Create discussion comment by SR in Role disc - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createDiscussionComment({ authorization, policyId, documentId, discussionCommentText: discussionCommentTextRole, discussionId: discussionIdRole }).then((response) => {
                expect(response.status).eq(STATUS_CODE.UNPROCESSABLE);
            })
        });
    })


    it("Create discussion comment by SR in User disc - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createDiscussionComment({ authorization, policyId, documentId, discussionCommentText: discussionCommentTextUser, discussionId: discussionIdUser }).then((response) => {
                expect(response.status).eq(STATUS_CODE.UNPROCESSABLE);
            })
        });
    })


    it("Create discussion comment without auth - Negative", () => {
        createDiscussionComment({ policyId, documentId, discussionCommentText, discussionIdUser, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create discussion comment with invalid auth - Negative", () => {
        createDiscussionComment({ authorization: 'bearer 11111111111111111111@#$', policyId, documentId, discussionCommentText, discussionIdUser, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Create discussion comment with empty auth - Negative", () => {
        createDiscussionComment({ authorization: '', policyId, documentId, discussionCommentText, discussionIdUser, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
});