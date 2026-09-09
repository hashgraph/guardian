import { randomInt } from '../../../support/random';

import { STATUS_CODE } from '../../../support/api/api-const';
import * as Modules from '../../../support/api/modules';
import * as Authorization from '../../../support/authorization';

context('Edit Module', { tags: ['modules', 'thirdPool', 'all', 'all-no-mgs'] }, () => {

  const SRUsername = Cypress.env('SRUser');
  const moduleName = 'FirstAPIModule';
  const tagBlock = 'APIBlockModule1';
  const tagBlock2 = 'APIBlockModule2';

  let moduleToEdit; let moduleForCompare;

  // The module is resolved by name instead of by position: editing the newest module (at(0))
  // means editing whichever copy an earlier run happened to leave behind
  before('Prepare JSON with edited module', () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      Modules.resolveDraftModule(authorization, moduleName).then((resolved) => {
        Modules.getModule(authorization, resolved.uuid).then((res) => {
          expect(res.status).eql(STATUS_CODE.OK);
          moduleForCompare = JSON.parse(JSON.stringify(res.body));
          moduleToEdit = Modules.stripVolatileFields(res.body);
          moduleToEdit.config.description = moduleToEdit.description;
          moduleToEdit.config.id = randomInt(99999);
          moduleToEdit.config.name = moduleToEdit.name;
          moduleToEdit.config.tag = 'Module';
          moduleToEdit.config.children = [
            Modules.actionBlock(tagBlock),
            Modules.actionBlock(tagBlock2),
          ];
        });
      });
    });
  });

  it('Edit module', { tags: ['analytics'] }, () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      Modules.updateModule(authorization, moduleToEdit.uuid, moduleToEdit).then((response) => {
        expect(response.status).eql(STATUS_CODE.SUCCESS);

        expect(response.body._id).eql(moduleForCompare._id);
        expect(response.body.codeVersion).eql(moduleForCompare.codeVersion);
        expect(response.body.createDate).eql(moduleForCompare.createDate);
        expect(response.body.creator).eql(moduleForCompare.creator);
        expect(response.body.description).eql(moduleForCompare.description);
        expect(response.body.id).eql(moduleForCompare.id);
        expect(response.body.name).eql(moduleForCompare.name);
        expect(response.body.owner).eql(moduleForCompare.owner);
        expect(response.body.status).eql(moduleForCompare.status);
        expect(response.body.type).eql(moduleForCompare.type);
        expect(response.body.uuid).eql(moduleForCompare.uuid);

        expect(response.body.config).eql(moduleToEdit.config);

        expect(response.body.configFileId).not.eql(moduleForCompare.configFileId);
        expect(response.body.updateDate).not.eql(moduleForCompare.updateDate);
      });
    });
  });

  // The PUT response alone does not prove the edit was stored: read the module back
  it('Verify module edit', () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      Modules.getModule(authorization, moduleToEdit.uuid).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);

        expect(response.body.name).eql(moduleName);
        expect(response.body.config).eql(moduleToEdit.config);
        expect(response.body.config.children.map(child => child.tag)).eql([tagBlock, tagBlock2]);
      });
    });
  });

  it('Edit module without auth token - Negative', () => {
    Modules.updateModule(undefined, moduleToEdit.uuid, moduleToEdit, { failOnStatusCode: false }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it('Edit module with invalid auth token - Negative', () => {
    Modules.updateModule('Bearer wqe', moduleToEdit.uuid, moduleToEdit, { failOnStatusCode: false }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

  it('Edit module with empty auth token - Negative', () => {
    Modules.updateModule('', moduleToEdit.uuid, moduleToEdit, { failOnStatusCode: false }).then((response) => {
      expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
    });
  });

});
