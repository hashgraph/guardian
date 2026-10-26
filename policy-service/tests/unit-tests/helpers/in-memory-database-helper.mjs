import { ObjectId } from '@mikro-orm/mongodb';

const SUPPORTED_OPERATORS = new Set(['$eq', '$ne', '$in', '$not', '$exists']);

function isPlainObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function isObjectId(value) {
	return !!value && typeof value === 'object' && value._bsontype === 'ObjectId';
}

function sameValue(left, right) {
	if (isObjectId(left) || isObjectId(right)) {
		return String(left) === String(right);
	}
	return left === right;
}

function readPath(record, path) {
	let node = record;
	for (const part of path.split('.')) {
		if (Array.isArray(node)) {
			throw new Error(`in-memory database stub: the path "${path}" crosses an array`);
		}
		if (!node || typeof node !== 'object') {
			return undefined;
		}
		node = node[part];
	}
	return node;
}

function matches(record, filter) {
	if (typeof filter === 'string' || isObjectId(filter)) {
		return sameValue(record._id, filter);
	}
	if (!isPlainObject(filter)) {
		throw new Error('in-memory database stub: the filter is not an object');
	}
	return Object.entries(filter).every(([key, condition]) => {
		if (key === '$or') {
			return condition.some((item) => matches(record, item));
		}
		if (key === '$and') {
			return condition.every((item) => matches(record, item));
		}
		if (key.startsWith('$')) {
			throw new Error(`in-memory database stub: unsupported operator ${key}`);
		}
		return matchesValue(readPath(record, key === 'id' ? '_id' : key), condition);
	});
}

function matchesValue(value, condition) {
	if (!isPlainObject(condition)) {
		return sameValue(value, condition);
	}
	return Object.entries(condition).every(([operator, operand]) => {
		if (!SUPPORTED_OPERATORS.has(operator)) {
			throw new Error(`in-memory database stub: unsupported operator ${operator}`);
		}
		switch (operator) {
			case '$eq':
				return sameValue(value, operand);
			case '$ne':
				return !sameValue(value, operand);
			case '$in':
				return operand.some((item) => sameValue(value, item));
			case '$exists':
				return (value !== undefined) === !!operand;
			default:
				return !matchesValue(value, operand);
		}
	});
}

function checkOptions(options) {
	const unsupported = Object.keys(options || {}).filter((key) => key !== 'orderBy');
	if (unsupported.length) {
		throw new Error(`in-memory database stub: unsupported options ${unsupported.join(', ')}`);
	}
}

function ordered(items, options) {
	const entries = Object.entries(options?.orderBy || {});
	if (entries.length > 1) {
		throw new Error('in-memory database stub: orderBy supports one field');
	}
	if (!entries.length) {
		return items;
	}
	const [[field, direction]] = entries;
	const sign = direction === 'DESC' || direction === 'desc' || direction === -1 ? -1 : 1;
	return [...items].sort((a, b) => {
		const left = readPath(a, field);
		const right = readPath(b, field);
		if ((left !== null && typeof left === 'object') || (right !== null && typeof right === 'object')) {
			throw new Error(`in-memory database stub: orderBy on a non-scalar field ${field}`);
		}
		return left === right ? 0 : (left < right ? -sign : sign);
	});
}

function clone(value) {
	if (value === null || typeof value !== 'object' || isObjectId(value)) {
		return value;
	}
	if (value instanceof Date) {
		return new Date(value.getTime());
	}
	if (Array.isArray(value)) {
		return value.map(clone);
	}
	const result = {};
	for (const [key, item] of Object.entries(value)) {
		result[key] = clone(item);
	}
	return result;
}

export function createInMemoryDatabaseHelper() {
	let collections = new Map();
	const calls = [];

	const collection = (entityClass) => {
		if (!collections.has(entityClass.name)) {
			collections.set(entityClass.name, []);
		}
		return collections.get(entityClass.name);
	};

	class DataBaseHelper {
		constructor(entityClass) {
			this.entityClass = entityClass;
		}

		create(entity) {
			calls.push(['create', this.entityClass.name]);
			const item = clone(entity);
			item._id = item._id || new ObjectId();
			item.id = String(item._id);
			return item;
		}

		async find(filters, options) {
			calls.push(['find', this.entityClass.name]);
			checkOptions(options);
			return ordered(collection(this.entityClass).filter((item) => matches(item, filters || {})), options).map(clone);
		}

		async findOne(filters, options) {
			calls.push(['findOne', this.entityClass.name]);
			checkOptions(options);
			if (!filters) {
				return null;
			}
			const found = collection(this.entityClass).find((item) => matches(item, filters));
			return found ? clone(found) : null;
		}

		async count(filters, options) {
			calls.push(['count', this.entityClass.name]);
			checkOptions(options);
			return collection(this.entityClass).filter((item) => matches(item, filters || {})).length;
		}

		async save(entity, filter) {
			calls.push(['save', this.entityClass.name]);
			if (filter) {
				throw new Error('in-memory database stub: save with a filter is not supported');
			}
			const items = collection(this.entityClass);
			const item = clone(entity);
			item._id = item._id || (item.id ? new ObjectId(item.id) : new ObjectId());
			item.id = String(item._id);
			const index = items.findIndex((stored) => sameValue(stored._id, item._id));
			if (index === -1) {
				items.push(item);
			} else {
				items[index] = { ...items[index], ...item };
			}
			return clone(item);
		}

		async update(entity, filter) {
			calls.push(['update', this.entityClass.name]);
			const items = collection(this.entityClass);
			const targets = items.filter((item) => matches(item, filter || entity.id || entity._id));
			for (const target of targets) {
				Object.assign(target, clone(entity), { _id: target._id, id: target.id });
			}
			return targets.length === 1 ? clone(targets[0]) : targets.map(clone);
		}

		async remove(entities) {
			calls.push(['remove', this.entityClass.name]);
			const ids = (Array.isArray(entities) ? entities : [entities]).map((item) => String(item._id || item.id));
			collections.set(this.entityClass.name, collection(this.entityClass).filter((item) => !ids.includes(String(item._id))));
		}
	}

	return {
		DataBaseHelper,
		calls,
		reset() {
			collections = new Map();
			calls.length = 0;
		},
		seed(entityClass, records) {
			const items = collection(entityClass);
			for (const record of records) {
				const item = clone(record);
				item._id = item._id || new ObjectId();
				item.id = String(item._id);
				items.push(item);
			}
		},
		records(entityClass) {
			return collection(entityClass).map(clone);
		}
	};
}
