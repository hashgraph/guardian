
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Create Module', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const moduleName = 'FirstAPIModule';

    const profilesUrl = `${API.ApiServer}${API.Profiles}`;

    let did;

    const getProfileWithAuth = (authorization, username) =>
        cy.request({
            method: METHOD.GET,
            url: profilesUrl + username,
            headers: { authorization },
        });

    const baseModuleBody = (includeMenu = false) => ({
        ...Modules.moduleBody(moduleName),
        ...(includeMenu ? { menu: 'show' } : {}),
    });

    before('Get user data and remove the module left by previous runs', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getProfileWithAuth(authorization, SRUsername).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                did = response.body.did;
            });
            Modules.deleteModulesByName(authorization, moduleName);
        });
    });

    it('Create a new module', { tags: ['smoke', 'tags', 'analytics'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Modules.createModule(authorization, baseModuleBody()).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);

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
                expect(response.body).to.have.property('id');
                expect(response.body).to.have.property('updateDate');
                expect(response.body).to.have.property('uuid');
                expect(response.body).to.have.property('_id');

                expect(response.body.codeVersion).eql('1.0.0');
                expect(response.body.config.blockType).eql('module');
                expect(response.body.creator).eql(did);
                expect(response.body.description).eql(`${moduleName} desc`);
                expect(response.body.name).eql(moduleName);
                expect(response.body.owner).eql(did);
                expect(response.body.status).eql('DRAFT');
                expect(response.body.type).eql('CUSTOM');
            });
        });
    });

    it('Create a new module without auth token - Negative', () => {
        Modules.createModule(undefined, baseModuleBody(true), { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create a new module with invalid auth token - Negative', () => {
        Modules.createModule('Bearer wqe', baseModuleBody(true), { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create a new module with empty auth token - Negative', () => {
        Modules.createModule('', baseModuleBody(true), { failOnStatusCode: false }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
