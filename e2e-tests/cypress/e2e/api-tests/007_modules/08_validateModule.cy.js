
import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Modules', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

  const SRUsername = Cypress.env('SRUser');
  const moduleName = Modules.uniqueModuleName('APIModuleForValidate');

  let moduleToValidate;

  // The spec builds its own module instead of editing the second newest one (at(1)): that
  // position holds a module owned by another spec, whose blocks were being wiped as a side
  // effect. Removing the invalid blocks is what turns the module into a valid one.
  before('Create and prepare module for validate', () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      Modules.createInvalidModule(authorization, moduleName).then((module) => {
        moduleToValidate = module;
        moduleToValidate.config.children = [];

        Modules.updateModule(authorization, moduleToValidate.uuid, moduleToValidate).then((putRes) => {
          expect(putRes.status).eql(STATUS_CODE.SUCCESS);

          expect(putRes.body.codeVersion).eql(moduleToValidate.codeVersion);
          expect(putRes.body.createDate).eql(moduleToValidate.createDate);
          expect(putRes.body.creator).eql(moduleToValidate.creator);
          expect(putRes.body.description).eql(moduleToValidate.description);
          expect(putRes.body.id).eql(moduleToValidate.id);
          expect(putRes.body.name).eql(moduleToValidate.name);
          expect(putRes.body.owner).eql(moduleToValidate.owner);
          expect(putRes.body.status).eql(moduleToValidate.status);
          expect(putRes.body.uuid).eql(moduleToValidate.uuid);

          expect(putRes.body.config).eql(moduleToValidate.config);
        });
      });
    });
  });

  after('Remove the module created by this spec', () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      Modules.deleteModule(authorization, moduleToValidate.uuid, { failOnStatusCode: false });
    });
  });

  it('Validates selected module', { tags: ['analytics'] }, () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      Modules.validateModule(authorization, moduleToValidate).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        expect(response.body.results.isValid).eql(true);
        expect(response.body.module).eql(moduleToValidate);
      });
    });
  });

  it('Validates selected module without auth token - Negative', () => {
    Modules.validateModule(undefined, moduleToValidate, { failOnStatusCode: false }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it('Validates selected module with invalid auth token - Negative', () => {
    Modules.validateModule('Bearer wqe', moduleToValidate, { failOnStatusCode: false }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it('Validates selected module with empty auth token - Negative', () => {
    Modules.validateModule('', moduleToValidate, { failOnStatusCode: false }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

});
