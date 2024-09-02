import { assert, expect } from 'chai';
import esmock from 'esmock';

//mocks
import { DataBaseHelper, ormMock } from '../database-helper/mocks-database-helper.mjs';

//entities
import { TestEntity } from '../database-helper/test-entities.mjs';

const { DatabaseServer } = await esmock('../../../dist/database-modules/database-server.js', {
  '../../../dist/helpers/db-helper.js': DataBaseHelper,
});

describe('DatabaseServer', function() {
  let dbServer;
  let db;

  before(() => {
    DatabaseServer.connectBD(ormMock);
    dbServer = new DatabaseServer();

    db = DataBaseHelper.orm.em.getDriver().getConnection().getDb();

    Object.keys(db).forEach(key => delete db[key]);
  });

  describe('create Method', function() {
    it('should create and return the correct entity', function() {
      const entityData = { name: 'Test Entity' };

      const result = dbServer.create(TestEntity, entityData);

      assert.isNotNull(result);
      assert.equal(result.name, 'Test Entity');
      assert.equal(db[TestEntity.name].length, 1);
      assert.equal(db[TestEntity.name][0].name, 'Test Entity');
    });
  });
});
