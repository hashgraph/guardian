import { STATUS_CODE } from '../../../support/api/api-const';
import * as Authorization from '../../../support/authorization';

context('Tags', { tags: ['tags', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = 'contractTag';

    let contractId; let tagId;

    before('Get contract id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.getOrCreateRetireContractId(authorization).then((id) => {
                contractId = id;
            });
        });
    });

    it('Create new tag(contract) without auth token - Negative', () => {
        cy.createTag(null, tagName, contractId, 'Contract').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(contract) with invalid auth token - Negative', () => {
        cy.createTag('Bearer wqe', tagName, contractId, 'Contract').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(contract) with empty auth token - Negative', () => {
        cy.createTag('', tagName, contractId, 'Contract').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(contract)', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, contractId, 'Contract').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            });
        });
    });

    it('Get contract tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, contractId, 'Contract').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                //Tags of earlier runs are still on the entity, so the one created above is looked up
                //by its own uuid instead of by position
                const tag = response.body[contractId].tags.find((item) => item.uuid === tagId);
                expect(tag, `tag ${tagId}`).to.exist;
            });
        });
    });

    it('Get contract tag without auth token - Negative', () => {
        cy.searchTags(null, contractId, 'Contract').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get contract tag with invalid auth token - Negative', () => {
        cy.searchTags('Bearer wqe', contractId, 'Contract').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get contract tag with empty auth token - Negative', () => {
        cy.searchTags('', contractId, 'Contract').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete contract tag without auth token - Negative', () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete contract tag with invalid auth token - Negative', () => {
        cy.deleteTag('Bearer wqe', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete contract tag with empty auth token - Negative', () => {
        cy.deleteTag('', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete contract tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});