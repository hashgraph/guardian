import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Delete notifications', { tags: ['notifications', 'firstPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let notificationId; let idsToDelete; let idsToKeep;

    before('Get notification id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.NewNotifications,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                //The list is newest first and the delete removes the chosen notification and every older one
                notificationId = response.body.at(2).id;
                idsToDelete = response.body.slice(2).map((notification) => notification.id);
                idsToKeep = response.body.slice(0, 2).map((notification) => notification.id);
            });
        })
    });

    it('Delete notifications without auth - Negative', () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.DeleteNotification + notificationId,
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete notifications with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.DeleteNotification + notificationId,
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete notifications with empty auth - Negative', () => {
        cy.request({
            method: METHOD.DELETE,
            url: API.ApiServer + API.DeleteNotification + notificationId,
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete notifications', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.DeleteNotification + notificationId,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body).to.be.at.least(idsToDelete.length);
            });
            //Notifications created by background work while the spec runs change the totals,
            //so check the ones this test chose instead
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.NewNotifications,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                const remainingIds = response.body.map((notification) => notification.id);
                idsToDelete.forEach((id) => expect(remainingIds).to.not.include(id));
                idsToKeep.forEach((id) => expect(remainingIds).to.include(id));
            });
        })
    });
});
