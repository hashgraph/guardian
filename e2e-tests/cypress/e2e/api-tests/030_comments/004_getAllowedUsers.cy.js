import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Get allowed users", { tags: ['comments', 'firstPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const allowedUsers = [
        {
            label: "All",
            type: "all"
        },
        {
            label: "Administrator",
            type: "role"
        },
        {
            label: "Registrant",
            type: "role"
        },
        {
            label: "Registrant",
            type: "user"
        },
        {
            label: "StandardRegistry",
            type: "user"
        }
    ];

    let policyId, documentId;

    const getAllowedUsers = ({ authorization, policyId, documentId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.GET,
            url: API.AllowedUsers(policyId, documentId),
            body: { search: "" },
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
                })

            })
        })
    })

    it("Get allowed users by SR", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getAllowedUsers({ authorization, policyId, documentId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(5);
                expect(response.body.map(allowedUser => {
                    delete allowedUser.value;
                    delete allowedUser.roles;
                    return allowedUser;
                })).to.deep.equal(allowedUsers);
            })
        });
    })

    it("Get allowed users by User", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getAllowedUsers({ authorization, policyId, documentId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.length).eq(5);
                expect(response.body.map(allowedUser => {
                    delete allowedUser.value;
                    delete allowedUser.roles;
                    return allowedUser;
                })).to.deep.equal(allowedUsers);
            })
        });
    })
    it("Get allowed users without auth - Negative", () => {
        getAllowedUsers({ policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get allowed users with invalid auth - Negative", () => {
        getAllowedUsers({ authorization: 'bearer 11111111111111111111@#$', policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get allowed users with empty auth - Negative", () => {
        getAllowedUsers({ authorization: '', policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
});