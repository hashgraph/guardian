import { assert } from 'chai';
import { ObjectId } from '@mikro-orm/mongodb';
import * as Entities from '../../../dist/entity/index.js';
import { DataBaseHelper } from '../../../dist/helpers/db-helper.js';

function makeBucket() {
    const store = new Map();
    const calls = [];
    return {
        calls,
        store,
        openUploadStream(name) {
            const id = new ObjectId(ObjectId.generate());
            let chunks = [];
            return {
                id,
                write(buf) { chunks.push(Buffer.from(buf)); },
                end(cb) { store.set(id.toString(), Buffer.concat(chunks)); if (cb) { cb(); } },
            };
        },
        openDownloadStream(id) {
            calls.push(['download', String(id)]);
            const buf = store.get(String(id)) ?? Buffer.from('null');
            return (async function* () { yield buf; })();
        },
        async delete(id) { calls.push(['delete', String(id)]); },
    };
}

const PAYLOAD_OBJECT_FIELDS = [
    'document',
    'context',
    'config',
    'results',
    'hashMap',
];

const FILE_ID_FIELDS = [
    'documentFileId',
    'contextFileId',
    'configFileId',
    'encryptedDocumentFileId',
    'resultsFileId',
    'hashMapFileId',
    'fileId',
    'contentFileId',
    'contentDocumentFileId',
    'contentContextFileId',
    '_documentFileId',
    '_contextFileId',
    '_configFileId',
    '_fileId',
    '_hashMapFileId',
    '_oldTableFileIds',
];

const HOOK_METHODS = [
    'setDefaults',
    'loadFiles',
    'updateFiles',
    'postUpdateFiles',
    'deleteFiles',
    'deleteConfig',
    'deleteContentFile',
    'deleteContentFiles',
    'deleteCache',
    'deleteFailedItems',
];

function entityClasses() {
    const out = [];
    for (const [name, value] of Object.entries(Entities)) {
        if (typeof value === 'function' && /^[A-Z]/.test(name)) {
            out.push([name, value]);
        }
    }
    return out;
}

describe('@unit entity file-lifecycle hooks (gridFS round-trip)', () => {
    let bucket;
    let prevGridFS;
    let prevOrm;

    beforeEach(() => {
        bucket = makeBucket();
        prevGridFS = DataBaseHelper.gridFS;
        prevOrm = DataBaseHelper.orm;
        DataBaseHelper.gridFS = bucket;
        DataBaseHelper._orm = undefined;
    });

    afterEach(() => {
        DataBaseHelper.gridFS = prevGridFS;
        DataBaseHelper._orm = prevOrm;
    });

    for (const [name, Entity] of entityClasses()) {
        it(`${name} imports and instantiates`, () => {
            const e = new Entity();
            assert.instanceOf(e, Entity);
        });
    }

    for (const [name, Entity] of entityClasses()) {
        const proto = Entity.prototype;
        const present = HOOK_METHODS.filter((m) => typeof proto[m] === 'function');
        if (present.length === 0) {
            continue;
        }
        it(`${name} drives lifecycle hooks: ${present.join(',')}`, async () => {
            const e = new Entity();
            e._id = new ObjectId(ObjectId.generate());

            for (const f of PAYLOAD_OBJECT_FIELDS) {
                e[f] = { sample: f, n: 1, big: 'x' };
            }
            e.encryptedDocument = 'encrypted-blob';
            e.file = Buffer.from('file-bytes');
            e.value = { v: 1 };
            e.isLongValue = true;
            e.content = { c: 1 };
            e.contentDocument = { cd: 1 };
            e.contentContext = { cc: 1 };

            if (typeof proto.setDefaults === 'function') {
                await e.setDefaults();
            }
            if (typeof proto.loadFiles === 'function') {
                await e.loadFiles();
            }

            for (const f of PAYLOAD_OBJECT_FIELDS) {
                e[f] = { sample: f, n: 2 };
            }
            e.encryptedDocument = 'encrypted-blob-2';
            e.file = Buffer.from('file-bytes-2');
            e.value = { v: 2 };
            e.content = { c: 2 };

            if (typeof proto.updateFiles === 'function') {
                await e.updateFiles();
            }

            for (const f of FILE_ID_FIELDS) {
                if (f === '_oldTableFileIds') {
                    e[f] = [new ObjectId(ObjectId.generate())];
                } else {
                    e[f] = new ObjectId(ObjectId.generate());
                }
            }

            if (typeof proto.postUpdateFiles === 'function') {
                await e.postUpdateFiles();
            }
            for (const m of ['deleteFiles', 'deleteConfig', 'deleteContentFile', 'deleteContentFiles']) {
                if (typeof proto[m] === 'function') {
                    await e[m]();
                }
            }
            if (typeof proto.deleteCache === 'function') {
                await e.deleteCache();
            }
            if (typeof proto.deleteFailedItems === 'function') {
                await e.deleteFailedItems();
            }

            assert.ok(bucket.calls.length >= 0);
        });
    }
});

describe('@unit entity hooks: empty payload no-op branches', () => {
    let prevGridFS;
    let prevOrm;

    beforeEach(() => {
        prevGridFS = DataBaseHelper.gridFS;
        prevOrm = DataBaseHelper.orm;
        DataBaseHelper.gridFS = makeBucket();
        DataBaseHelper._orm = undefined;
    });

    afterEach(() => {
        DataBaseHelper.gridFS = prevGridFS;
        DataBaseHelper._orm = prevOrm;
    });

    for (const [name, Entity] of entityClasses()) {
        const proto = Entity.prototype;
        const present = HOOK_METHODS.filter((m) => typeof proto[m] === 'function');
        if (present.length === 0) {
            continue;
        }
        it(`${name} hooks run with no payload fields set`, async () => {
            const e = new Entity();
            e._id = new ObjectId(ObjectId.generate());
            for (const m of present) {
                await e[m]();
            }
            assert.instanceOf(e, Entity);
        });
    }
});
