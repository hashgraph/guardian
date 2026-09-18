
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Get Module', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'FirstAPIModule';

    const profilesUrl = `${API.ApiServer}${API.Profiles}`;

    let module; let did;

    const getProfileWithAuth = (authorization, username) =>
        cy.request({
            method: METHOD.GET,
            url: profilesUrl + username,
            headers: { authorization },
        });

    // The module is resolved by name: taking the newest one (at(0)) means asserting against
    // whichever copy an earlier spec happened to leave behind
    before('Get module and did', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.resolveDraftModule(authorization, moduleName).then((resolved) => {
                module = resolved;
            });
            getProfileWithAuth(authorization, SRUsername).then((profileRes) => {
                expect(profileRes.status).eql(STATUS_CODE.OK);
                did = profileRes.body.did;
            });
        });
    });

    it('Get module', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.getModule(authorization, module.uuid).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);

                expect(response.body.config).to.have.property('artifacts');
                expect(response.body.config).to.have.property('children');
                expect(response.body.config).to.have.property('events');
                expect(response.body.config).to.have.property('innerEvents');
                expect(response.body.config).to.have.property('inputEvents');
                expect(response.body.config).to.have.property('outputEvents');
                expect(response.body.config).to.have.property('permissions');
                expect(response.body.config).to.have.property('variables');
                expect(response.body).to.have.property('configFileId');
                expect(response.body).to.have.property('createDate');
                expect(response.body).to.have.property('updateDate');

                expect(response.body.codeVersion).eql('1.0.0');
                expect(response.body.config.blockType).eql('module');
                expect(response.body.creator).eql(did);
                expect(response.body.description).eql(moduleName + ' desc');
                expect(response.body.name).eql(moduleName);
                expect(response.body.owner).eql(did);
                expect(response.body.status).eql('DRAFT');
                expect(response.body.type).eql('CUSTOM');
                expect(response.body.uuid).eql(module.uuid);
                expect(response.body.id).eql(module.id);
                expect(response.body._id).eql(module._id);
            });
        });
    });

    it('Get module without auth token - Negative', () => {
        Modules.getModule(undefined, module.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get module with invalid auth token - Negative', () => {
        Modules.getModule('Bearer wqe', module.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get module with empty auth token - Negative', () => {
        Modules.getModule('', module.uuid, { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
