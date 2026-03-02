import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Create a lot of discussion comments", { tags: ['comments', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const discussionCommentText = "TestDiscCommentText";

    let policyId, documentId, discussionId;

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

    const createDiscussion = ({ authorization, policyId, documentId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.Discussions(policyId, documentId),
            body: {
                name: "ManyCommentsCheck",
                privacy: "public",
            },
            headers: { authorization },
            failOnStatusCode,
            timeout: 60000
        });
    };

    const getComments = ({ authorization, policyId, documentId, discussionId, lastItem, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.DiscussionsCommentsSearch(policyId, documentId, discussionId),
            body: {
                search: "",
                lt: lastItem
            },
            headers: { authorization },
            failOnStatusCode,
        });
    };

    const checkDecOfComments = ({ authorization, policyId, documentId, discussionId, lastItem, dec }) => {
        return getComments({ authorization, policyId, documentId, discussionId, lastItem }).then((response) => {
            expect(response.status).eq(STATUS_CODE.OK);
            expect(response.body.length).eq(10);
            for (let index = 0; index <= 9; index++) {
                expect(response.body.at(index).text).eq(discussionCommentText + (dec * 10 - index - 1));
            }
            return response.body.at(-1).id;
        })
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
                cy.getBlockByTag(authorization, policyId, "approve_devices_grid").then((response) => {
                    documentId = response.body.data.at(0).id;
                })
            })
        })
    })

    it("Create discussion and many comments by SR", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createDiscussion({ authorization, policyId, documentId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                discussionId = response.body.id;
                for (let index = 0; index < 50; index++) {
                    createDiscussionComment({ authorization, policyId, documentId, discussionCommentText: discussionCommentText + index, discussionId }).then((response) => {
                        expect(response.status).eq(STATUS_CODE.OK);
                    })
                }
            });
        })
    })

    it("Get discussion comments by User", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            checkDecOfComments({ authorization, policyId, documentId, discussionId, dec: 5 }).then((lastItem) => {
                checkDecOfComments({ authorization, policyId, documentId, discussionId, lastItem, dec: 4 }).then((lastItem) => {
                    checkDecOfComments({ authorization, policyId, documentId, discussionId, lastItem, dec: 3 }).then((lastItem) => {
                        checkDecOfComments({ authorization, policyId, documentId, discussionId, lastItem, dec: 2 }).then((lastItem) => {
                            checkDecOfComments({ authorization, policyId, documentId, discussionId, lastItem, dec: 1 })
                        })
                    })
                })
            })
        })
    })
})