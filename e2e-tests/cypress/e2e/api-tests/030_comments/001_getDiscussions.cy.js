import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Get discussions', { tags: ['comments', 'firstPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');
    const discussionName = 'TestDiscName';
    const discussionNameRole = 'TestDiscNameRole';
    const discussionNameUser = 'TestDiscNameUser';

    let policyId; let documentId; let discussionId; let userDid;

    const getDiscussions = ({ authorization, policyId, documentId, failOnStatusCode = false }) => {
        return cy.request({
            method: METHOD.GET,
            url: API.Discussions(policyId, documentId),
            headers: { authorization },
            failOnStatusCode,
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

    //Every run adds its discussions to the same document, so they are looked up by name and the
    //most recent one is this run's, instead of asserting how many there are in total
    const newestNamed = (discussions, name) => {
        const found = discussions
            .filter((item) => item.name === name)
            .sort((a, b) => String(a.createDate).localeCompare(String(b.createDate)))
            .at(-1);
        expect(found, `a discussion named "${name}"`).to.not.be.undefined;
        return found;
    };

    it('Get discussions by SR', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getDiscussions({ authorization, policyId, documentId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                //The SR is only shown the public ones
                expect(response.body.every((item) => item.privacy === 'public')).to.be.true;
                const publicDiscussion = newestNamed(response.body, discussionName);
                expect(publicDiscussion.policyId).eq(policyId);
                expect(publicDiscussion.privacy).eq('public');
                discussionId = publicDiscussion.id;
            })
        });
    })

    it('Get discussions by User', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getDiscussions({ authorization, policyId, documentId }).then((response) => {
                expect(response.status).eq(STATUS_CODE.OK);
                //The user is shown the role and user ones on top of the public ones
                const roleDiscussion = newestNamed(response.body, discussionNameRole);
                expect(roleDiscussion.policyId).eq(policyId);
                expect(roleDiscussion.privacy).eq('roles');
                expect(roleDiscussion.roles).to.deep.equal(['Registrant']);

                const userDiscussion = newestNamed(response.body, discussionNameUser);
                expect(userDiscussion.policyId).eq(policyId);
                expect(userDiscussion.privacy).eq('users');
                expect(userDiscussion.users).to.deep.equal([userDid]);

                const publicDiscussion = newestNamed(response.body, discussionName);
                expect(publicDiscussion.policyId).eq(policyId);
                expect(publicDiscussion.privacy).eq('public');
                expect(publicDiscussion.id).eq(discussionId);
            })
        });
    })

    it('Get discussion without auth - Negative', () => {
        getDiscussions({ policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get discussion with invalid auth - Negative', () => {
        getDiscussions({ authorization: 'bearer 11111111111111111111@#$', policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get discussion with empty auth - Negative', () => {
        getDiscussions({ authorization: '', policyId, documentId, failOnStatusCode: false }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        });
    });
});