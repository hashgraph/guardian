import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Create discuissons', { tags: ['comments', 'firstPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const discussionName = 'TestDiscName';
    const discussionNameRole = 'TestDiscNameRole';
    const discussionNameUser = 'TestDiscNameUser';

    let policyId; let documentId; let userDid;

    const discussionBody = {
        name: discussionName,
        privacy: 'public',
    }

    const discussionBodyForRole = {
        name: discussionNameRole,
        privacy: 'roles',
        roles: ['Registrant']
    }

    const discussionBodyForUser = (didArray) => ({
        name: discussionNameUser,
        privacy: 'users',
        users: didArray
    })

    const createDiscussion = ({ authorization, policyId, documentId, discussionBody, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.Discussions(policyId, documentId),
            body: discussionBody,
            headers: { authorization },
            failOnStatusCode,
            timeout: 60000
        });
    };

    before('Get policy, document id', () => {
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
                //The iRec 3 flow imports its policy from a fixture, and the import suffixes the
                //name of every copy after the first, so the published copies are matched on the
                //common prefix and the most recent one is taken
                const policy = response.body
                    .filter((element) => String(element.name).startsWith('iRec_3')
                        && element.status === 'PUBLISH')
                    .sort((a, b) => String(b.createDate).localeCompare(String(a.createDate)))
                    .at(0);
                expect(policy, 'a published iRec_3 policy').to.not.be.undefined;
                policyId = policy.id;
                cy.getBlockByTag(authorization, policyId, 'registrants_grid').then((response) => {
                    documentId = response.body.data.at(0).id;
                    userDid = response.body.data.at(0).owner;
                })

            })
        })
    })

    it('Create discussion by SR', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createDiscussion({ authorization, policyId, documentId, discussionBody }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.name).eq(discussionName);
                expect(response.body.policyId).eq(policyId);
                expect(response.body.privacy).eq('public');
            })
        });
    })

    it('Create discussion by User for the User', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            createDiscussion({ authorization, policyId, documentId, discussionBody: discussionBodyForUser([userDid]) }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.name).eq(discussionNameUser);
                expect(response.body.policyId).eq(policyId);
                expect(response.body.privacy).eq('users');
                expect(response.body.users).to.deep.equal([userDid]);
            })
        });
    })

    it('Create discussion by User for the Registrant role', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            createDiscussion({ authorization, policyId, documentId, discussionBody: discussionBodyForRole }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                expect(response.body.name).eq(discussionNameRole);
                expect(response.body.policyId).eq(policyId);
                expect(response.body.privacy).eq('roles');
                expect(response.body.roles).to.deep.equal(['Registrant']);
            })
        });
    })

    it('Create discussion without auth - Negative', () => {
        createDiscussion({ policyId, documentId, discussionBody, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create discussion with invalid auth - Negative', () => {
        createDiscussion({ authorization: 'bearer 11111111111111111111@#$', policyId, documentId, discussionBody, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create discussion with empty auth - Negative', () => {
        createDiscussion({ authorization: '', policyId, documentId, discussionBody, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
});