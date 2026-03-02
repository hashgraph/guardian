import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Put files as a comment", { tags: ['comments', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let policyId, documentId, discussionId;

    const putFileAsComment = ({ authorization, policyId, documentId, file, discussionId }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.PutFileIntoComment(policyId, documentId, discussionId),
            body: file,
            headers: {
                "content-type": "binary/octet-stream",
                authorization,
            },
            timeout: 200000,
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

    const getFileAsComment = ({ authorization, policyId, documentId, cid, discussionId }) => {
        return cy.request({
            method: METHOD.GET,
            url: API.PutFileIntoComment(policyId, documentId, discussionId) + "/" + cid,
            headers: {
                authorization,
            },
            timeout: 200000,
        });
    };

    const createDiscussionComment = ({ authorization, policyId, documentId, body, discussionId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.DiscussionsComments(policyId, documentId, discussionId),
            body,
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
                name: "TXT",
                privacy: "public",
            },
            headers: { authorization },
            failOnStatusCode,
            timeout: 60000
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
                    createDiscussion({ authorization, policyId, documentId }).then((response) => {
                        expect(response.status).eq(STATUS_CODE.OK);
                        discussionId = response.body.id;
                    });
                })
            })
        })
    })

    it("Put txt by SR", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("testTXTcomm.txt", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    putFileAsComment({ authorization, policyId, documentId, file, discussionId }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.SUCCESS);
                        let cid = JSON.parse(new TextDecoder('utf-8').decode(response.body))
                        let body = {
                            recipients: [],
                            fields: [],
                            text: "",
                            files: [
                                {
                                    name: "testTXTcomm.txt",
                                    type: "text/plain",
                                    fileType: "text/plain",
                                    link: "ipfs://" + cid,
                                    size: 1,
                                    cid
                                }
                            ]
                        }
                        createDiscussionComment({ authorization, policyId, documentId, body, discussionId }).then((response) => {
                            expect(response.status).eq(STATUS_CODE.OK);
                            cid = response.body.document.credentialSubject.at(0).files.at(0).cid;
                            getFileAsComment({ authorization, policyId, documentId, cid, discussionId }).then((response) => {
                                expect(response.body).to.eq("txtComm");
                            })
                        })
                    })
                });
        })
    })

    it("Get txt by User", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getComments({ authorization, policyId, documentId, discussionId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                let cid = response.body.at(0).document.credentialSubject.at(0).files.at(0).cid;
                getFileAsComment({ authorization, policyId, documentId, cid, discussionId }).then((response) => {
                    expect(response.body).to.eq("txtComm");
                })
            })
        })
    })
})