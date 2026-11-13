import assert from 'node:assert/strict';
import { SchemaCategory, SchemaStatus } from '@guardian/interfaces';
import {
    makeUser, makeCacheService, makeLogger, FakeEntityOwner, internalExceptionRethrow, loadController
} from './_controller-harness.mjs';
import { SchemaUtils } from '../../dist/helpers/schema-utils.js';

// A system schema is created through POST /schemas/system/:username. The schema editor used to save
// one through the generic routes, which stored a plain draft with category SYSTEM that no system list
// shows; the generic delete is the way to remove such a draft.

const DIST = '../../dist/api/service/schema.js';

let stub;

class FakeGuardians {
    createSchema(...a) { return stub.createSchema(...a); }
    createSchemaAsync(...a) { return stub.createSchemaAsync(...a); }
    getSchemaById(...a) { return stub.getSchemaById(...a); }
    deleteSchema(...a) { return stub.deleteSchema(...a); }
}

class FakeTaskManager {
    start(action, userId) { return { taskId: 'task-1', action, userId }; }
    registerCallback() {}
    addStatus() {}
    addError(taskId, error) { stub.taskErrors.push(error); }
}

async function load() {
    return loadController(DIST, {
        '#helpers': {
            UseCache: () => () => undefined, TaskManager: FakeTaskManager, Guardians: FakeGuardians,
            InternalException: internalExceptionRethrow, ONLY_SR: '', EntityOwner: FakeEntityOwner,
            CacheService: class {}, SchemaUtils, ServiceError: class {}, FilenameSanitizer: class {}
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common/helpers/pino-logger': { PinoLogger: class {} },
        '@guardian/common/helpers/run-function-async': { RunFunctionAsync: (fn, onError) => fn().catch(onError) }
    });
}

const user = makeUser({ did: 'did:hedera:sr' });

function draft(overrides = {}) {
    return { id: 'schema-1', category: SchemaCategory.SYSTEM, system: false, owner: 'did:hedera:sr', status: SchemaStatus.DRAFT, ...overrides };
}

async function rejection(promise) {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    assert.fail('expected the request to be rejected');
}

describe('SchemaApi and the SYSTEM category', function () {
    this.timeout(60000);
    let api;

    before(async () => {
        const { SchemaApi } = await load();
        api = new SchemaApi(makeCacheService(), makeLogger());
    });

    beforeEach(() => {
        stub = {
            created: [],
            deleted: [],
            taskErrors: [],
            createSchema: async (schema) => { stub.created.push(schema); return [schema]; },
            createSchemaAsync: async (schema) => { stub.created.push(schema); },
            getSchemaById: async () => draft(),
            deleteSchema: async (id) => { stub.deleted.push(id); },
        };
    });

    it('refuses to create a SYSTEM schema through the generic route', async () => {
        const error = await rejection(api.createNewSchema(user, 'topic-1', { name: 'S', category: SchemaCategory.SYSTEM, document: {} }, {}));

        assert.equal(error.getStatus(), 422);
        assert.equal(stub.created.length, 0);
    });

    it('refuses to create a SYSTEM schema through the generic async route', async () => {
        const error = await rejection(api.createNewSchemaAsync(user, 'topic-1', { name: 'S', category: SchemaCategory.SYSTEM, document: {} }, {}));

        assert.equal(error.getStatus(), 422);
        assert.equal(stub.created.length, 0);
    });

    it('deletes a SYSTEM-category draft that is not a system schema', async () => {
        const task = await api.deleteSchema(user, 'schema-1', false, {});
        await new Promise((resolve) => setImmediate(resolve));

        assert.equal(task.taskId, 'task-1');
        assert.deepEqual(stub.deleted, ['schema-1']);
    });

    it('refuses to delete a SYSTEM-category draft of another owner', async () => {
        stub.getSchemaById = async () => draft({ owner: 'did:hedera:other' });

        const error = await rejection(api.deleteSchema(user, 'schema-1', false, {}));

        assert.equal(error.getStatus(), 403);
        assert.equal(stub.deleted.length, 0);
    });

    it('still refuses to delete a system schema through the generic route', async () => {
        stub.getSchemaById = async () => draft({ system: true, creator: 'did:hedera:sr' });

        const error = await rejection(api.deleteSchema(user, 'schema-1', false, {}));

        assert.equal(error.getStatus(), 403);
        assert.equal(error.message, 'Schema is system.');
        assert.equal(stub.deleted.length, 0);
    });
});
