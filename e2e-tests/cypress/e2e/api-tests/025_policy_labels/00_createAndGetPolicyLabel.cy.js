
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { publishOwnPolicyCopy } from '../../../support/CustomHelpers/ipfsSeeding';
import { mintRegistrantTokens } from '../../../support/CustomHelpers/registrantApplication';

context('Create policy labels', { tags: ['policy_labels', 'firstPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const UserUsername = Cypress.env('User');
    const SRUsername = Cypress.env('SRUser');
    const labelName = 'testPolicyLabelAPI';

    let policy; let did; let SRDid; let labelId;

    const createPolicyLabel = (authorization, body, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicyLabels,
            headers: authorization ? { authorization } : {},
            body,
            failOnStatusCode,
        });

    const getPolicyLabel = (authorization, labelId, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.PolicyLabels + labelId,
            headers: authorization ? { authorization } : {},
            failOnStatusCode,
        });

    // The later specs of the folder read the label's tokens (07, 08) and look its policy up among
    // the user's ones (02), so the copy is assigned to the user and has minted a token.
    before('Publish a copy of the policy with a minted token, and get the did', () => {
        publishOwnPolicyCopy(SRUsername, 'iRec_4.policy').then((createdPolicy) => {
            policy = createdPolicy;
            mintRegistrantTokens(SRUsername, UserUsername, policy.id);
        });
        Authorization.getAccessToken(UserUsername).then((authorization) => {
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
    })

    it('Create policy labels', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            createPolicyLabel(authorization, {
                name: labelName,
                description: labelName + ' desc',
                policyId: policy.id,
                policyInstanceTopicId: policy.instanceTopicId
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                labelId = response.body.id;

                expect(response.body).to.have.property('uuid');

                expect(response.body.creator).eql(did);
                expect(response.body.owner).eql(SRDid);
                expect(response.body.name).eql(labelName);
                expect(response.body.description).eql(labelName + ' desc');
                expect(response.body.policyId).eql(policy.id);
                expect(response.body.policyTopicId).eql(policy.topicId);
                expect(response.body.policyInstanceTopicId).eql(policy.instanceTopicId);
                expect(response.body.status).eql('DRAFT');
                expect(response.body.config.children).eql([]);
                expect(response.body.config.imports).eql([]);
                expect(response.body.config.schemaId).eql('');
            });
        })
    });

    it('Create policy labels without auth - Negative', () => {
        createPolicyLabel(undefined, {
            name: labelName,
            description: labelName + ' desc',
            policyId: policy.id,
            policyInstanceTopicId: policy.instanceTopicId
        }, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create policy labels with incorrect auth - Negative', () => {
        createPolicyLabel('bearer 11111111111111111111@#$', {
            name: labelName,
            description: labelName + ' desc',
            policyId: policy.id,
            policyInstanceTopicId: policy.instanceTopicId
        }, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create policy labels with empty auth - Negative', () => {
        createPolicyLabel('', {
            name: labelName,
            description: labelName + ' desc',
            policyId: policy.id,
            policyInstanceTopicId: policy.instanceTopicId
        }, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy label', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getPolicyLabel(authorization, labelId).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.have.property('uuid');

                expect(response.body.id).eql(labelId);
                expect(response.body.creator).eql(did);
                expect(response.body.owner).eql(SRDid);
                expect(response.body.name).eql(labelName);
                expect(response.body.description).eql(labelName + ' desc');
                expect(response.body.policyId).eql(policy.id);
                expect(response.body.policyTopicId).eql(policy.topicId);
                expect(response.body.policyInstanceTopicId).eql(policy.instanceTopicId);
                expect(response.body.status).eql('DRAFT');
                expect(response.body.config.children).eql([]);
                expect(response.body.config.imports).eql([]);
                expect(response.body.config.schemaId).eql('');
            });
        })
    });

    it('Get policy label without auth - Negative', () => {
        getPolicyLabel(undefined, labelId, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy label with incorrect auth - Negative', () => {
        getPolicyLabel('bearer 11111111111111111111@#$', labelId, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy label with empty auth - Negative', () => {
        getPolicyLabel('', labelId, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
