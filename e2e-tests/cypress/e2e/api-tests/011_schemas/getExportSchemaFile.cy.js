import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Schema', { tags: ['schema', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Export schema file', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas,
                // a single entry is enough here, and the full schema listing grows with every run
                qs: { pageIndex: 0, pageSize: 1 },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                let schemaId = response.body[0].id;

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Schemas + schemaId + '/export/file',
                    encoding: null,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    expect(response.body).to.not.be.oneOf([null, '']);
                });
            });
        })
    });
});
