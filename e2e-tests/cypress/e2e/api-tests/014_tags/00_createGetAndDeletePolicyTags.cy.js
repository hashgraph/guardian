import { STATUS_CODE } from '../../../support/api/api-const';
import * as Authorization from '../../../support/authorization';

context('Tags', { tags: ['tags', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = 'policyTag';

    let policyId; let tagId;

    before('Get policy id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.getOrCreatePolicy(authorization).then((policy) => {
                policyId = policy.id;
            });
        });
    });

    it('Create new tag(policy) without auth token - Negative', () => {
        cy.createTag(null, tagName, policyId, 'Policy').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(policy) with invalid auth token - Negative', () => {
        cy.createTag('Bearer wqe', tagName, policyId, 'Policy').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(policy) with empty auth token - Negative', () => {
        cy.createTag('', tagName, policyId, 'Policy').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(policy)', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, policyId, 'Policy').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            });
        });
    });

    it('Get policy tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, policyId, 'Policy').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                //Tags of earlier runs are still on the entity, so the one created above is looked up
                //by its own uuid instead of by position
                const tag = response.body[policyId].tags.find((item) => item.uuid === tagId);
                expect(tag, `tag ${tagId}`).to.exist;
            });
        });
    });

    it('Get policy tag without auth token - Negative', () => {
        cy.searchTags(null, policyId, 'Policy').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy tag with invalid auth token - Negative', () => {
        cy.searchTags('Bearer wqe', policyId, 'Policy').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get policy tag with empty auth token - Negative', () => {
        cy.searchTags('', policyId, 'Policy').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete policy tag without auth token - Negative', () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete policy tag with invalid auth token - Negative', () => {
        cy.deleteTag('Bearer wqe', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete policy tag with empty auth token - Negative', () => {
        cy.deleteTag('', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete policy tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});