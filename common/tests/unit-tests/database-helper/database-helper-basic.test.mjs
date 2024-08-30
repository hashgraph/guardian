import {assert} from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';

import {ObjectId} from '@mikro-orm/mongodb';

import {BaseEntity} from '../../../dist/index.js';

class TestEntity extends BaseEntity {
	constructor({name = 'Test Entity', dryRunId, dryRunClass} = {}) {
		super();
		this._id = new ObjectId();
		this.id = this._id.toString();
		this.name = name;
		this.dryRunId = dryRunId;
		this.dryRunClass = dryRunClass;
	}
}

const sandbox = sinon.createSandbox();

const inMemoryStore = {};

const entityManagerMock = {
	aggregate: sandbox.stub().callsFake((entityClass, pipeline) => {
		const collection = inMemoryStore[entityClass.name] || [];
  
		return collection.filter((entity) => {
			return pipeline.every((stage) => {
				if (stage.$match) {
					return Object.keys(stage.$match).every((key) => entity[key] === stage.$match[key]);
				}
				return true;
			});
		});
	}),
	flush: sandbox.stub().resolves(),
	persistAndFlush: sandbox.stub().callsFake((entity) => {
		const collection = inMemoryStore[entity.constructor.name] || [];
		const index = collection.findIndex(e => e._id.toString() === entity._id.toString());
  
		if (index !== -1) {
			collection[index] = entity;
		} else {
			collection.push(entity);
		}
  
		inMemoryStore[entity.constructor.name] = collection;
		return entity;
	}),
	nativeDelete: sandbox.stub().callsFake((entityClass, filters) => {
		const collection = inMemoryStore[entityClass.name] || [];
		const initialLength = collection.length;
  
		inMemoryStore[entityClass.name] = collection.filter(entity => {
			if (typeof filters === 'string' || filters instanceof ObjectId) {
				return entity._id.toString() !== filters.toString();
			}
   
			return !Object.keys(filters).every(key => entity[key] === filters[key]);
		});
  
		return initialLength - inMemoryStore[entityClass.name].length;
	}),
	removeAndFlush: sandbox.stub().callsFake((entities) => {
		let collection
		let nameEntity
		
		if (Array.isArray(entities)) {
			nameEntity = entities[0].constructor.name
			
			collection = (inMemoryStore[nameEntity] || []).filter((entity) => {
				return entities.every(e => e.id !== entity.id);
			})
		} else {
			nameEntity = entities.constructor.name
			
			collection = (inMemoryStore[nameEntity] || []).filter(e => e.id !== entities.id);
		}
		
		inMemoryStore[nameEntity] = collection;
	}),
	findAndCount: sandbox.stub().callsFake((EntityClass, query) => {
		const collection = inMemoryStore[EntityClass.name] || [];
		const results = collection.filter(entity => {
			return Object.keys(query).every(key => entity[key] === query[key]);
		});
  
		return [results, results.length];
	}),
	count: sandbox.stub().callsFake((EntityClass, query) => {
		const collection = inMemoryStore[EntityClass.name] || [];
		
		if (!query) {
			return collection.length
		}
		
		return collection.filter(entity => {
			return Object.keys(query).every(key => entity[key] === query[key]);
		}).length;
	}),
	persist: sandbox.stub().callsFake((entities) => {
		const collection = inMemoryStore[TestEntity.name] || [];
  
		if (Array.isArray(entities)) {
			entities.forEach(entity => {
				const index = collection.findIndex(e => e._id.toString() === entity._id.toString());
    
				if (index !== -1) {
					collection[index] = entity;
				} else {
					collection.push(entity);
				}
			});
		} else {
			const index = collection.findIndex(e => e._id.toString() === entities._id.toString());
   
			if (index !== -1) {
				collection[index] = entities;
			} else {
				collection.push(entities);
			}
		}
  
		inMemoryStore[TestEntity.name] = collection;
	}),
	fork: sandbox.stub().returns({
		create: sandbox.stub().callsFake((EntityClass, data) => {
			const entity = new EntityClass(data);
   
			if (!inMemoryStore[EntityClass.name]) {
				inMemoryStore[EntityClass.name] = [];
			}
   
			inMemoryStore[EntityClass.name].push(entity);
   
			return entity;
		}),
		removeAndFlush: sandbox.stub().callsFake((entity) => {
			inMemoryStore[entity.constructor.name] =
				(inMemoryStore[entity.constructor.name] || []).filter(e => e.id !== entity.id);
		}),
	}),
	getRepository: sandbox.stub().returns({
		create: sandbox.stub().callsFake((data) => {
			const entity = new TestEntity(data);
   
			if (!inMemoryStore[TestEntity.name]) {
				inMemoryStore[TestEntity.name] = [];
			}
   
			inMemoryStore[TestEntity.name].push(entity);
   
			return entity;
		}),
		find: sandbox.stub().callsFake((query) => {
			const collection = inMemoryStore[TestEntity.name] || [];
   
			if (typeof query === 'string' || query instanceof ObjectId) {
				return collection.filter(entity => entity._id.toString() === query.toString());
			}
   
			return collection.filter(entity => {
				return Object.keys(query).every(key => entity[key] === query[key]);
			});
		}),
		findOne: sandbox.stub().callsFake((query) => {
			const collection = inMemoryStore[TestEntity.name] || [];
   
			return collection.find(entity => {
				return Object.keys(query).every(key => entity[key] === query[key]);
			});
		}),
		findAll: sandbox.stub().callsFake(() => {
			return inMemoryStore[TestEntity.name] || [];
		}),
	}),
	getDriver: sandbox.stub().returns({
		getConnection: sandbox.stub().returns({
			getDb: () => inMemoryStore,
		}),
	}),
};

const ormMock = {
	em: entityManagerMock,
	getMetadata: sandbox.stub().returns({}),
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
		toArray: sandbox.stub().resolves([{_id: new ObjectId()}]),
	}),
	openDownloadStream: sandbox.stub().returns({
		[Symbol.asyncIterator]: async function* () {
			yield Buffer.from('test file content');
		},
	}),
};

const {DataBaseHelper} = await esmock('../../../dist/helpers/db-helper.js', {
	'@mikro-orm/core': {
		CreateRequestContext: () => {
			return (target, propertyKey, descriptor) => descriptor;
		},
		wrap: () => ({
			assign: sandbox.stub().returns(new TestEntity()),
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
			DataBaseHelper.connectBD(ormMock);
			DataBaseHelper.connectGridFS();
			dbHelper = new DataBaseHelper(TestEntity);
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
			const entityData = {name: 'Test Entity'};
			const createdEntity = dbHelper.create(entityData);
			
			assert.instanceOf(createdEntity, TestEntity);
			assert.equal(createdEntity.name, 'Test Entity');
			assert.isDefined(createdEntity._id);
			
			const db = dbHelper._em.getDriver().getConnection().getDb();
			
			assert.equal(db[TestEntity.name].length, 1);
			assert.equal(db[TestEntity.name][0].name, 'Test Entity');
		});
		
		it('should create multiple entities correctly', () => {
			const entitiesData = [{name: 'Test Entity 2'}, {name: 'Test Entity 3'}];
			const createdEntities = dbHelper.create(entitiesData);
			
			assert.isArray(createdEntities);
			assert.lengthOf(createdEntities, 2);
			
			const db = dbHelper._em.getDriver().getConnection().getDb();
			
			assert.equal(db[TestEntity.name].length, 3);
			assert.equal(db[TestEntity.name][1].name, 'Test Entity 2');
			assert.equal(db[TestEntity.name][2].name, 'Test Entity 3');
		});
	});
	
	describe('DataBaseHelper Aggregate Methods', () => {
		it('should aggregate data correctly', async () => {
			const pipeline = [{$match: {name: 'Test Entity'}}];
			const results = await dbHelper.aggregate(pipeline);
			
			assert.isArray(results);
			assert.lengthOf(results, 1);
			assert.equal(results[0].name, 'Test Entity');
		});
		
		it('should perform a dry run aggregation correctly', async () => {
			const entityData = {name: 'Test Entity 4', dryRunId: 'dryRunId', dryRunClass: 'dryRunClass'};
			dbHelper.create(entityData);
			
			const pipeline = [{$match: {name: 'Test Entity 4'}}];
			const results = await dbHelper.aggregateDryRan(pipeline, 'dryRunId', 'dryRunClass');
			
			assert.isArray(results);
			assert.lengthOf(results, 1);
		});
	});
	
	describe('DataBaseHelper Find Methods', () => {
		it('should find entities based on filters', async () => {
			const entities = await dbHelper.find({name: 'Test Entity'});
			
			assert.isArray(entities);
			assert.lengthOf(entities, 1);
			assert.equal(entities[0].name, 'Test Entity');
		});
		
		it('should find a single entity based on filters', async () => {
			const entity = await dbHelper.findOne({name: 'Test Entity 2'});
			
			assert.isNotNull(entity);
			assert.equal(entity.name, 'Test Entity 2');
		});
	});
	
	describe('DataBaseHelper Save and Update Methods', () => {
		it('should save a new entity correctly', async () => {
			const entityData = {name: 'Test Entity 5'};
			
			const savedEntity = await dbHelper.save(entityData);
			
			assert.instanceOf(savedEntity, TestEntity);
			assert.equal(savedEntity.name, 'Test Entity 5');
			
			const db = dbHelper._em.getDriver().getConnection().getDb();
			
			assert.equal(db[TestEntity.name].length, 5);
			assert.equal(db[TestEntity.name][4].name, 'Test Entity 5');
		});
		
		it('should update an existing entity correctly', async () => {
			const savedEntity = await dbHelper.findOne({name: 'Test Entity 5'});
			
			assert.isNotNull(savedEntity);
			
			savedEntity.name = 'Updated Entity 5';
			const updatedEntity = await dbHelper.update(savedEntity);
			
			assert.isNotNull(updatedEntity);
			assert.equal(updatedEntity.name, 'Updated Entity 5');
			
			const updated = await dbHelper.findOne(updatedEntity);
			
			assert.isDefined(updated);
			assert.equal(updated.name, 'Updated Entity 5');
		});
	});
	
	describe('DataBaseHelper Delete and Remove Methods', () => {
		it('should delete entities correctly based on filters', async () => {
			const deleteCount = await dbHelper.delete({name: 'Updated Entity 5'});
			
			assert.isNumber(deleteCount);
			assert.equal(deleteCount, 1);
			
			const deletedEntity = await dbHelper.findOne({name: 'Updated Entity 5'});
			assert.isUndefined(deletedEntity);
			
		});
		
		it('should remove a single entity correctly', async () => {
			const entityToRemove = await dbHelper.findOne({name: 'Test Entity 4'});
			await dbHelper.remove(entityToRemove);
			
			const deletedEntity = await dbHelper.findOne({name: 'Test Entity 4'});
			assert.isUndefined(deletedEntity);
			
		});
		
		it('should remove multiple entities correctly', async () => {
			const entityToRemove2 = await dbHelper.findOne({name: 'Test Entity 2'});
			const entityToRemove3 = await dbHelper.findOne({name: 'Test Entity 3'});
			
			await dbHelper.remove([entityToRemove2, entityToRemove3]);
			
			const deletedEntity2 = await dbHelper.findOne({name: 'Test Entity 2'});
			const deletedEntity3 = await dbHelper.findOne({name: 'Test Entity 3'});
			
			assert.isUndefined(deletedEntity2);
			assert.isUndefined(deletedEntity3);
		});
	});
	
	describe('DataBaseHelper FindAndCount and Count Methods', () => {
		it('should find and count entities correctly', async () => {
			const [entities, count] = await dbHelper.findAndCount({name: 'Test Entity'});
			
			assert.isArray(entities);
			assert.lengthOf(entities, 1);
			assert.isNumber(count);
			assert.equal(count, 1);
		});
		
		it('should count entities correctly based on filters', async () => {
			const count = await dbHelper.count({name: 'Test Entity'});
			
			assert.isNumber(count);
			assert.equal(count, 1);
		});
		
		it('should count all entities if no filters are provided', async () => {
			const count = await dbHelper.count();
			
			assert.isNumber(count);
			
			const db = dbHelper._em.getDriver().getConnection().getDb();
			
			assert.equal(count, db[TestEntity.name].length);
		});
	});
	
	describe('DataBaseHelper FindAll Method', () => {
		it('should find all entities correctly', async () => {
			dbHelper.create([{name: 'Test Entity 2'}, {name: 'Test Entity 3'}, {name: 'Test Entity 4'}]);
			
			const entities = await dbHelper.findAll();
			
			assert.isArray(entities);
			assert.lengthOf(entities, 4);
			
			assert.equal(entities[1].name, 'Test Entity 2');
			assert.equal(entities[2].name, 'Test Entity 3');
			assert.equal(entities[3].name, 'Test Entity 4');
		});
	});
	
	describe('DataBaseHelper CreateMuchData Method', () => {
		it('should create a lot of data correctly', async () => {
			const existingEntities = await dbHelper.findAll();
			
			await dbHelper.remove(existingEntities);
			
			const initialCount = await dbHelper.count();
			
			assert.equal(initialCount, 0);
			
			await dbHelper.createMuchData({name: 'Batch Entity'}, 10);
			
			const entities = await dbHelper.find({name: 'Batch Entity'});
			
			assert.isArray(entities);
			assert.lengthOf(entities, 10);
			
			const finalCount = await dbHelper.count();
			assert.equal(finalCount, initialCount + 10);
		});
	});
});
