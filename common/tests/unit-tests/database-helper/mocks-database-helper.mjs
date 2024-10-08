import sandbox from 'sinon';
import esmock from 'esmock';

import {ObjectId} from '@mikro-orm/mongodb';

//entities
import {TestEntity} from './test-entities.mjs';

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
		const EntityClass = Array.isArray(entities) ? entities[0].constructor : entities.constructor;
		
		const collection = inMemoryStore[EntityClass.name] || [];
		
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
		
		inMemoryStore[EntityClass.name] = collection;
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
	getRepository: sandbox.stub().callsFake((EntityClass = TestEntity) => ({
		create: sandbox.stub().callsFake((data) => {
			let entity = new EntityClass(data)
			
			if (!entity.id) {
				const testEntity = new TestEntity(data)
				
				for (const key in testEntity) {
					entity[key] = testEntity[key]
				}
			}
			
			if (!inMemoryStore[EntityClass.name]) {
				inMemoryStore[EntityClass.name] = [];
			}
			
			inMemoryStore[EntityClass.name].push(entity);
			
			return entity;
		}),
		find: sandbox.stub().callsFake((query) => {
			const collection = inMemoryStore[EntityClass.name] || [];
			
			if (typeof query === 'string' || query instanceof ObjectId) {
				return collection.filter(entity => entity._id.toString() === query.toString());
			}
			
			if (query.id && query.id.$in) {
				return collection.filter(entity => query.id.$in.includes(entity.id));
			}
			
			return collection.filter(entity => {
				return Object.keys(query).every(key => entity[key] === query[key]);
			});
		}),
		findOne: sandbox.stub().callsFake((query) => {
			const collection = inMemoryStore[EntityClass.name] || [];
			
			return collection.find(entity => {
				return Object.keys(query).every(key => entity[key] === query[key]);
			});
		}),
		findAll: sandbox.stub().callsFake(() => {
			return inMemoryStore[EntityClass.name] || [];
		}),
		getMongoManager: sandbox.stub().returns({}),
	})),
	getDriver: sandbox.stub().returns({
		getConnection: sandbox.stub().returns({
			getDb: () => inMemoryStore,
			getCollection: sandbox.stub().callsFake((collectionName) => {
				return {
					bulkWrite: sandbox.stub().callsFake((bulkOps) => {
						const collection = inMemoryStore[collectionName] || [];
						bulkOps.forEach(op => {
							const {filter, update} = op.updateOne;
							const entityToUpdate = collection.find(e => e.id.toString() === filter.id?.toString());
							if (entityToUpdate) {
								Object.assign(entityToUpdate, update.$set);
							}
						});
						inMemoryStore[collectionName] = collection;
					}),
				};
			}),
		}),
	}),
};

export const ormMock = {
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

export const {DataBaseHelper} = await esmock('../../../dist/helpers/db-helper.js', {
	'@mikro-orm/core': {
		CreateRequestContext: () => {
			return (target, propertyKey, descriptor) => descriptor;
		},
		wrap: (entity) => ({
			assign: (data) => {
				Object.assign(entity, data);
				return entity;
			},
		}),
	},
	'mongodb': {
		GridFSBucket: function () {
			return gridFSStub;
		}
	}
});
