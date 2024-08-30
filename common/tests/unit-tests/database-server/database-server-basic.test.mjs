import { expect } from 'chai';
import { DatabaseServer } from '../../../dist/database-modules/index.js';
import { BaseEntity } from '../../../dist/index.js';

class TestEntity extends BaseEntity {
  constructor() {
    super();
    this.name = 'Test Entity';
  }
}

describe('DatabaseServer', function() {
  let dbServer;

  beforeEach(function() {
    // dbServer = new DatabaseServer();
  });

  describe('findOne', function() {
    // it('should return the correct entity when dryRun is enabled', async function() {
    //   try {
    //     dbServer.setDryRun('dryRunId');
    //     console.log('findOne');
    //     const result = await dbServer.findOne(TestEntity, 'entityId');
    //     console.log('result', result);
    //     expect(result).to.be.an('object');
    //     expect(result.dryRunId).to.equal('dryRunId');
    //   } catch (error) {
    //     console.log('error', error);
    //   }
    // });

    // it('should call DataBaseHelper findOne without dryRun', async function() {
    //   const result = await dbServer.findOne(SomeEntity, { someField: 'value' });
    //   expect(result).to.be.an('object');
    // });
  });

  // describe('count', function() {
  //   it('should return the correct count when dryRun is enabled', async function() {
  //     dbServer.setDryRun('dryRunId');
  //     const count = await dbServer.count(SomeEntity, { someField: 'value' });
  //     expect(count).to.be.a('number');
  //   });
  //
  //   it('should call DataBaseHelper count without dryRun', async function() {
  //     const count = await dbServer.count(SomeEntity, { someField: 'value' });
  //     expect(count).to.be.a('number');
  //   });
  // });
  //
  // describe('find', function() {
  //   it('should return an array of entities when dryRun is enabled', async function() {
  //     dbServer.setDryRun('dryRunId');
  //     const results = await dbServer.find(SomeEntity, { someField: 'value' });
  //     expect(results).to.be.an('array');
  //   });
  //
  //   it('should call DataBaseHelper find without dryRun', async function() {
  //     const results = await dbServer.find(SomeEntity, { someField: 'value' });
  //     expect(results).to.be.an('array');
  //   });
  // });

  // Continue writing tests for other methods following the same pattern.

});