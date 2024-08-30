import { assert } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

import { ObjectId } from '@mikro-orm/mongodb';

import { BaseEntity } from '../../../dist/index.js';

class TestEntity extends BaseEntity {
  constructor() {
    super();
    this._id = new ObjectId();
    this.name = 'Test Entity';
  }
}

const sandbox = sinon.createSandbox();

const testEntityStub = new TestEntity();

const entityManagerMock = {
  fork: sandbox.stub().returns({
    create: sandbox.stub().returns(testEntityStub),
    aggregate: sandbox.stub().returns([testEntityStub]),
    aggregateDryRan: sandbox.stub().returns([testEntityStub]),
  }),
  find: sandbox.stub().returns([testEntityStub]),
  findOne: sandbox.stub().returns(testEntityStub),
  persistAndFlush: sandbox.stub().returns(testEntityStub),
  removeAndFlush: sandbox.stub(),
  nativeDelete: sandbox.stub().resolves(1),
  aggregate: sandbox.stub().returns([testEntityStub]),
  aggregateDryRan: sandbox.stub().returns([testEntityStub]),
  findAndCount: sandbox.stub(),
  count: sandbox.stub(),
  update: sandbox.stub().returns(testEntityStub),
  flush: sandbox.stub().resolves(),
  getRepository: sandbox.stub().returns({
    create: sandbox.stub().returns(testEntityStub),
    find: sandbox.stub().returns([testEntityStub]),
    findOne: sandbox.stub().returns(testEntityStub),
    persistAndFlush: sandbox.stub().returns(testEntityStub),
    update: sandbox.stub().returns(testEntityStub),
    removeAndFlush: sandbox.stub(),
  }),
  getDriver: sandbox.stub().returns({
    getConnection: sandbox.stub().returns({
      getDb: () => ({}),
    }),
  }),
};

const ormMock = {
  em: entityManagerMock,
  getMetadata: sandbox.stub().returns({
    get: sandbox.stub().returns({
      properties: {
        _id: { primary: true, type: 'ObjectId', hidden: false, reference: 'scalar' },
        name: { type: 'string', hidden: false, reference: 'scalar' },
      },
    }),
  }),
  isConnected: sandbox.stub().returns(true),
};

const gridFSStub = {
  openUploadStream: sandbox.stub().returns({
    write: sandbox.stub(),
    end: sandbox.stub().callsFake(function (callback) {
      if (callback) callback();
    }),
    id: new ObjectId(),
  }),
  find: sandbox.stub().returns({
    toArray: sandbox.stub().resolves([{ _id: new ObjectId() }]),
  }),
  openDownloadStream: sandbox.stub().returns({
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from('test file content');
    },
  }),
};

const { DataBaseHelper } = await esmock('../../../dist/helpers/db-helper.js', {
  '@mikro-orm/core': {
    CreateRequestContext: () => {
      return (target, propertyKey, descriptor) => descriptor;
    },
    wrap: () => ({
      assign: sandbox.stub().returns(testEntityStub),
    })
  },
  'mongodb': {
    GridFSBucket: function () {
      return gridFSStub;
    }
  }
});

let dbHelper

describe('DataBaseHelper Tests', () => {
  before(() => {
    try {
      DataBaseHelper.connectBD(ormMock);
      DataBaseHelper.connectGridFS();
      dbHelper = new DataBaseHelper(TestEntity);
    } catch (e) {
      console.log(e);
    }
  });

  after(() => {
    sandbox.restore();
  });

  it('should create an instance of TestEntity', () => {
      const testEntityInstance = new TestEntity();

      assert.isNotNull(testEntityInstance);
      assert.instanceOf(testEntityInstance, TestEntity);
      assert.isDefined(testEntityInstance._id);
      assert.equal(testEntityInstance.name, 'Test Entity');
  });

  describe('DataBaseHelper Static Methods', () => {
    it('should set ORM correctly using connectBD', () => {
      assert.strictEqual(DataBaseHelper.orm, ormMock);
      assert.strictEqual(DataBaseHelper.orm.getMetadata, ormMock.getMetadata);
      assert.strictEqual(DataBaseHelper.orm.isConnected, ormMock.isConnected);
    });

    it('should set GridFS correctly using connectGridFS', () => {
      assert.isDefined(DataBaseHelper.gridFS);
      assert.isNotNull(DataBaseHelper.gridFS);
    });
  });

  describe('DataBaseHelper GridFS Methods', () => {
    it('should save and load a file correctly', async () => {

      const buffer = Buffer.from('test file content');
      const fileId = await DataBaseHelper.saveFile('test-file', buffer);

      const loadedBuffer = await DataBaseHelper.loadFile(fileId);
      assert.deepEqual(loadedBuffer, buffer);

    });
  });

  describe('DataBaseHelper Create Method', () => {
    it('should create a single entity correctly', () => {
      const entityData = { name: 'Test Entity' };
      const createdEntity = dbHelper.create(entityData);

      assert.instanceOf(createdEntity, TestEntity);
      assert.equal(createdEntity.name, 'Test Entity');
      assert.isDefined(createdEntity._id);
    });

    it('should create multiple entities correctly', () => {
      const entitiesData = [{ name: 'Entity 1' }, { name: 'Entity 2' }];
      const createdEntities = dbHelper.create(entitiesData);

      assert.isArray(createdEntities);
      assert.lengthOf(createdEntities, 2);
    });
  });

  describe('DataBaseHelper Aggregate Methods', () => {
    it('should aggregate data correctly', async () => {
      const pipeline = [{ $match: { name: 'Test Entity' } }];

      const results = await dbHelper.aggregate(pipeline);

      assert.isArray(results);
      assert.lengthOf(results, 1);
      assert.equal(results[0].name, 'Test Entity');
    });

    it('should perform a dry run aggregation correctly', async () => {
      const pipeline = [{ $match: { name: 'Test Entity' } }];
        const results = await dbHelper.aggregateDryRan(pipeline, 'dryRunId', 'dryRunClass');

        assert.isArray(results);
        assert.lengthOf(results, 1);
    });
  });


  describe('DataBaseHelper Find Methods', () => {
    it('should find entities based on filters', async () => {
      const entities = await dbHelper.find({ name: 'Test Entity' });

      assert.isArray(entities);
      assert.lengthOf(entities, 1);
    });

    it('should find a single entity based on filters', async () => {
      const entity = await dbHelper.findOne({ name: 'Test Entity' });

      assert.isNotNull(entity);
    });
  });

  describe('DataBaseHelper Save and Update Methods', () => {
    it('should save a new entity correctly', async () => {
      const entityData = { name: 'New Entity' };

        const savedEntity = await dbHelper.save(entityData);


      assert.instanceOf(savedEntity, TestEntity);
      assert.equal(savedEntity.name, 'Test Entity');
    });

    it('should update an existing entity correctly', async () => {
      const entity = await dbHelper.findOne({ name: 'Test Entity' });

      entity.name = 'Updated Entity';
      const updatedEntity = await dbHelper.update(entity);

      assert.equal(updatedEntity.name, 'Updated Entity');
    });
  });

  describe('Delete Method', () => {
    it('should delete entities correctly based on filters', async () => {
      const deleteCount = await dbHelper.delete({ name: 'Test Entity' });

      assert.isNumber(deleteCount);
      assert.equal(deleteCount, 1);
    });
  });

  describe('Remove Method', () => {
    it('should remove a single entity correctly', async () => {
      await dbHelper.remove(testEntityStub);

      sinon.assert.calledOnce(entityManagerMock.removeAndFlush);
    });

    it('should remove multiple entities correctly', async () => {
      await dbHelper.remove([testEntityStub, testEntityStub]);

      // sinon.assert.calledOnce(entityManagerMock.removeAndFlush);
    });
  });
  //
  // describe('FindAndCount Method', () => {
  //   it('should find and count entities correctly', async () => {
  //     const [entities, count] = await dbHelper.findAndCount({ name: 'Test Entity' });
  //
  //     assert.isArray(entities);
  //     assert.lengthOf(entities, 1);
  //     assert.isNumber(count);
  //     assert.equal(count, 1);
  //   });
  // });
  //
  // describe('Count Method', () => {
  //   it('should count entities correctly based on filters', async () => {
  //     const count = await dbHelper.count({ name: 'Test Entity' });
  //
  //     assert.isNumber(count);
  //     assert.equal(count, 1);
  //   });
  //
  //   it('should count all entities if no filters are provided', async () => {
  //     const count = await dbHelper.count();
  //
  //     assert.isNumber(count);
  //     assert.equal(count, 1);
  //   });
  // });
  //
  // describe('FindAll Method', () => {
  //   it('should find all entities correctly', async () => {
  //     const entities = await dbHelper.findAll();
  //
  //     assert.isArray(entities);
  //     assert.lengthOf(entities, 1);
  //   });
  // });
  //
  // describe('CreateMuchData Method', () => {
  //   it('should create a lot of data correctly', async () => {
  //     await dbHelper.createMuchData({ id: 'someId', _id: 'someObjectId' }, 10);
  //
  //     sinon.assert.called(entityManagerMock.getRepository().create);
  //     sinon.assert.called(entityManagerMock.flush);
  //   });
  // });

});