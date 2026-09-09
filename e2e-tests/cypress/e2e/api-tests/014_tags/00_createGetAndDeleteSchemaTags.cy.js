import { STATUS_CODE } from '../../../support/api/api-const';
import * as Authorization from '../../../support/authorization';

context('Tags', { tags: ['tags', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = 'schemaTag';

    let schemaId; let tagId;

    before('Get schema id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.getOrCreateSchemaId(authorization).then((id) => {
                schemaId = id;
            });
        });
    });

    it('Create new tag(schema) without auth token - Negative', () => {
        cy.createTag(null, tagName, schemaId, 'Schema').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(schema) with invalid auth token - Negative', () => {
        cy.createTag('Bearer wqe', tagName, schemaId, 'Schema').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(schema) with empty auth token - Negative', () => {
        cy.createTag('', tagName, schemaId, 'Schema').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(schema)', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, schemaId, 'Schema').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            });
        });
    });

    it('Get schema tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, schemaId, 'Schema').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                //Tags of earlier runs are still on the entity, so the one created above is looked up
                //by its own uuid instead of by position
                const tag = response.body[schemaId].tags.find((item) => item.uuid === tagId);
                expect(tag, `tag ${tagId}`).to.exist;
            });
        });
    });

    it('Get schema tag without auth token - Negative', () => {
        cy.searchTags(null, schemaId, 'Schema').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get schema tag with invalid auth token - Negative', () => {
        cy.searchTags('Bearer wqe', schemaId, 'Schema').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get schema tag with empty auth token - Negative', () => {
        cy.searchTags('', schemaId, 'Schema').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete schema tag without auth token - Negative', () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete schema tag with invalid auth token - Negative', () => {
        cy.deleteTag('Bearer wqe', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete schema tag with empty auth token - Negative', () => {
        cy.deleteTag('', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete schema tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });

});