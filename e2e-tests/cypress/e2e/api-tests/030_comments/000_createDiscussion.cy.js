import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { publishOwnPolicyCopy } from '../../../support/CustomHelpers/ipfsSeeding';
import { approveRegistrantApplication, submitDevice, submitRegistrantApplication } from '../../../support/CustomHelpers/registrantApplication';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Create discuissons', { tags: ['comments', 'firstPool', 'api-all', 'all', 'all-no-mgs'] }, () => {

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
            timeout: TIMEOUTS.backend
        });
    };

    // The rest of the folder takes the newest published iRec_3 copy, this one, and comments on its
    // application and on its device
    before('Publish a copy of the policy with an application and a device', () => {
        publishOwnPolicyCopy(SRUsername, 'iRec_3_BtnFix.policy').then((policy) => {
            policyId = policy.id;
            submitRegistrantApplication(SRUsername, UserUsername, policyId);
            approveRegistrantApplication(SRUsername, UserUsername, policyId);
            submitDevice(UserUsername, policyId);
            Authorization.getAccessToken(SRUsername).then((authorization) => {
                cy.getBlockByTag(authorization, policyId, 'registrants_grid').then((response) => {
                    documentId = response.body.data.at(0).id;
                    userDid = response.body.data.at(0).owner;
                });
            });
        });
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