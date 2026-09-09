import { STATUS_CODE } from '../../../support/api/api-const';
import * as Authorization from '../../../support/authorization';

context('Tags', { tags: ['tags', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = 'moduleTag';

    let moduleId; let tagId;

    before('Get module id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.getOrCreateModuleId(authorization).then((id) => {
                moduleId = id;
            });
        });
    });

    it('Create new tag(module) without auth token - Negative', () => {
        cy.createTag(null, tagName, moduleId, 'Module').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(module) with invalid auth token - Negative', () => {
        cy.createTag('Bearer wqe', tagName, moduleId, 'Module').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(module) with empty auth token - Negative', () => {
        cy.createTag('', tagName, moduleId, 'Module').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create new tag(module)', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.createTag(authorization, tagName, moduleId, 'Module').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                tagId = response.body.uuid;
            })
        });
    })

    it('Get module tag without auth token - Negative', () => {
        cy.searchTags(null, moduleId, 'Module').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get module tag with invalid auth token - Negative', () => {
        cy.searchTags('Bearer wqe', moduleId, 'Module').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get module tag with empty auth token - Negative', () => {
        cy.searchTags('', moduleId, 'Module').then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get module tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.searchTags(authorization, moduleId, 'Module').then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                //Tags of earlier runs are still on the entity, so the one created above is looked up
                //by its own uuid instead of by position
                const tag = response.body[moduleId].tags.find((item) => item.uuid === tagId);
                expect(tag, `tag ${tagId}`).to.exist;
            });
        })
    })

    it('Delete module tag without auth token - Negative', () => {
        cy.deleteTag(null, tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete module tag with invalid auth token - Negative', () => {
        cy.deleteTag('Bearer wqe', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete module tag with empty auth token - Negative', () => {
        cy.deleteTag('', tagId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete module tag', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.deleteTag(authorization, tagId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
            })
        })
    })
})