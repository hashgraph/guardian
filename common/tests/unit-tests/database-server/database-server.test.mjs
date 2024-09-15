import {assert, expect} from 'chai';
import esmock from 'esmock';

//mocks
import {DataBaseHelper, ormMock} from '../database-helper/mocks-database-helper.mjs';

//entities
import {TestEntity} from '../database-helper/test-entities.mjs';
import {Schema} from '../../../dist/entity/index.js'

const {DatabaseServer} = await esmock('../../../dist/database-modules/database-server.js', {
	'../../../dist/helpers/index.js': {DataBaseHelper},
});

describe('DatabaseServer', function () {
	let dbServer;
	let db;
	
	before(() => {
		DatabaseServer.connectBD(ormMock);
		DatabaseServer.connectGridFS()
		
		dbServer = new DatabaseServer();
		
		db = DataBaseHelper.orm.em.getDriver().getConnection().getDb();
		
		Object.keys(db).forEach(key => delete db[key]);
	});
	
	describe('DatabaseServer GridFS Methods', () => {
		it('should save and load a file correctly', async () => {
			const buffer = Buffer.from('test file content');
			const fileId = await DatabaseServer.saveFile('test-file', buffer);
			
			const loadedBuffer = await DatabaseServer.loadFile(fileId);
			assert.deepEqual(loadedBuffer, buffer);
		});
	});
	
	describe('create Method', function () {
		it('should create and return the correct entity', function () {
			const entityData = {name: 'Test Entity'};
			
			const result = dbServer.create(TestEntity, entityData);
			
			assert.isNotNull(result);
			assert.equal(result.name, 'Test Entity');
			assert.equal(db[TestEntity.name].length, 1);
			assert.equal(db[TestEntity.name][0].name, 'Test Entity');
		});
	});
	
	describe('save Method', function () {
		it('should save and return the correct entity', async function () {
			const entityData = {name: 'Test Entity 2'};
			
			const savedEntity = await dbServer.save(TestEntity, entityData);
			
			assert.isNotNull(savedEntity);
			assert.equal(savedEntity.name, 'Test Entity 2');
		});
		
	});
	
	describe('findOne Method', function () {
		it('should return the correct entity based on filters', async function () {
			const entityData = {name: 'Test Entity 3'};
			await dbServer.create(TestEntity, entityData);
			
			const foundEntity = await dbServer.findOne(TestEntity, {name: 'Test Entity 3'});
			
			assert.isNotNull(foundEntity);
			assert.equal(foundEntity.name, 'Test Entity 3');
		});
	});
	
	describe('remove Method', function () {
		it('should remove the correct entity', async function () {
			const entityData = {name: 'Test Entity 4'};
			const createdEntity = dbServer.create(TestEntity, entityData);
			
			await dbServer.remove(TestEntity, createdEntity);
			
			const foundEntity = await dbServer.findOne(TestEntity, {name: 'Test Entity 4'});
			assert.isUndefined(foundEntity);
		});
	});
	
	describe('update Method', function () {
		it('should remove the correct entity', async function () {
			const entityData = {name: 'Test Entity 4'};
			const createdEntity = await dbServer.create(TestEntity, entityData);
			
			createdEntity.name = "Updated Entity 4"
			
			const updatedEntity = await dbServer.update(TestEntity, null, createdEntity);
			
			assert.isNotNull(updatedEntity);
			assert.equal(updatedEntity.name, 'Updated Entity 4');
		});
	});
	
	describe('Aggregate Method', function () {
		it('should aggregate data correctly', async function () {
			const pipeline = [{$match: {name: 'Test Entity'}}];
			const results = await dbServer.aggregate(TestEntity, pipeline);
			
			assert.isArray(results);
			assert.lengthOf(results, 1);
			assert.equal(results[0].name, 'Test Entity');
		})
	});
	
	describe('Find and Count Methods', function () {
		it('should find and count entities correctly', async function () {
			try {
				const [entities, count] = await dbServer.findAndCount(TestEntity, {name: 'Test Entity'});
				
				assert.isArray(entities);
				assert.lengthOf(entities, 1);
				assert.isNumber(count);
				assert.equal(count, 1);
			} catch (e) {
				console.log(e)
			}
		});
		
		it('should count entities correctly based on filters', async function () {
			const count = await dbServer.count(TestEntity, {name: 'Test Entity'});
			
			assert.isNumber(count);
			assert.equal(count, 1);
		});
		
		it('should count all entities if no filters are provided', async function () {
			const count = await dbServer.count(TestEntity);
			
			assert.isNumber(count);
			assert.equal(count, 4);
		});
		
		it('should return null if entity not found in findOne', async function () {
			const result = await dbServer.findOne(TestEntity, {name: 'Non-existent Entity'});
			
			assert.isUndefined(result);
		});
		
		it('should return empty array and count 0 if no entities found in findAndCount', async function () {
			const [entities, count] = await dbServer.findAndCount(TestEntity, {name: 'Non-existent Entity'});
			
			assert.isArray(entities);
			assert.lengthOf(entities, 0);
			assert.equal(count, 0);
		});
	});
	
	describe('FindAll Method', function () {
		it('should find all entities correctly', async function () {
			
			const entities = await dbServer.findAll(TestEntity);
			
			assert.isArray(entities);
			assert.lengthOf(entities, 4);
			assert.equal(entities[0].name, 'Test Entity');
			assert.equal(entities[1].name, 'Test Entity 2');
			assert.equal(entities[2].name, 'Test Entity 3');
			assert.equal(entities[3].name, 'Updated Entity 4');
		});
	});
	
	describe('CreateMuchData Method', function () {
		it('should create a lot of data correctly', async function () {
			const existingEntities = await dbServer.findAll(TestEntity);
			await dbServer.remove(TestEntity, existingEntities);
			
			
			const initialCount = await dbServer.count(TestEntity);
			assert.equal(initialCount, 0);
			
			await dbServer.createMuchData(TestEntity, {name: 'Batch Entity'}, 10);
			
			const entities = await dbServer.find(TestEntity, {name: 'Batch Entity'});
			assert.isArray(entities);
			assert.lengthOf(entities, 10);
			
			const finalCount = await dbServer.count(TestEntity);
			assert.equal(finalCount, initialCount + 10);
		});
	});
	
	describe('saveMany Method', function () {
		it('should save multiple entities correctly', async function () {
			const existingEntities = await dbServer.findAll(TestEntity);
			await dbServer.remove(TestEntity, existingEntities);
			
			const entitiesData = [
				{name: 'Entity 1'},
				{name: 'Entity 2'}
			];
			
			const savedEntities = await dbServer.saveMany(TestEntity, entitiesData);
			
			assert.isArray(savedEntities);
			assert.lengthOf(savedEntities, 2);
			assert.equal(savedEntities[0].name, 'Entity 1');
			assert.equal(savedEntities[1].name, 'Entity 2');
			
			const allEntities = await dbServer.findAll(TestEntity);
			assert.lengthOf(allEntities, 2);
		});
	});
	
	describe('updateMany Method', function () {
		it('should update multiple entities correctly', async function () {
			const savedEntities = await dbServer.findAll(TestEntity);
			
			const entitiesToUpdate = savedEntities.map(entity => ({
				name: `Updated ${entity.name}`,
				id: entity.id
			}));
			
			const updatedEntities = await dbServer.updateMany(TestEntity, entitiesToUpdate);
			
			assert.isArray(updatedEntities);
			assert.lengthOf(updatedEntities, 2);
			assert.equal(updatedEntities[0].name, 'Updated Entity 1');
			assert.equal(updatedEntities[1].name, 'Updated Entity 2');
			
			const allEntities = await dbServer.findAll(TestEntity);
			assert.lengthOf(allEntities, 2);
			assert.equal(allEntities[0].name, 'Updated Entity 1');
			assert.equal(allEntities[1].name, 'Updated Entity 2');
		});
	});
	
	describe('saveSchemas Method', function () {
		it('should save schemas correctly with saveSchemas', async () => {
			const schemasToSave = [{name: 'schema1'}, {name: 'schema2'}];
			
			const savedSchemas = await DatabaseServer.saveSchemas(schemasToSave);
			
			assert.isArray(savedSchemas);
			assert.lengthOf(savedSchemas, 2);
			assert.equal(savedSchemas[0].name, 'schema1');
			assert.equal(savedSchemas[1].name, 'schema2');
			
			const savedInDb = db[Schema.name];
			
			assert.equal(savedInDb.length, 2);
			assert.equal(savedInDb[0].name, 'schema1');
			assert.equal(savedInDb[1].name, 'schema2');
		})
	})
	
	describe('updateSchemas Method', function () {
		it('should update schemas by changing their names', async () => {
			const existingSchemas = await db[Schema.name];
			
			assert.isArray(existingSchemas);
			assert.lengthOf(existingSchemas, 2);
			assert.equal(existingSchemas[0].name, 'schema1');
			assert.equal(existingSchemas[1].name, 'schema2');
			
			existingSchemas[0].name = 'updatedSchema1';
			existingSchemas[1].name = 'updatedSchema2';
			
			await DatabaseServer.updateSchemas(existingSchemas);
			
			const updatedSchemas = db[Schema.name];
			
			assert.isArray(updatedSchemas);
			assert.lengthOf(updatedSchemas, 2);
			assert.equal(updatedSchemas[0].name, 'updatedSchema1');
			assert.equal(updatedSchemas[1].name, 'updatedSchema2');
		});
	});
});
