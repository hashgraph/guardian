import { assert } from 'chai';
import { FileHelper } from '../../../dist/policy-engine/db-restore/file-helper.js';

describe('FileHelper', () => {
    it('exposes the diff file name constant', () => {
        assert.equal(FileHelper.FileName, 'diff');
    });

    it('zips and unzips a string round-trip', async () => {
        const buffer = await FileHelper.zipFile('hello world');
        const result = await FileHelper.unZipFile(buffer);
        assert.equal(result, 'hello world');
    });

    it('zips and unzips an empty string', async () => {
        const buffer = await FileHelper.zipFile('');
        const result = await FileHelper.unZipFile(buffer);
        assert.equal(result, '');
    });

    it('zips and unzips multi-line content', async () => {
        const content = 'a\nb\nc';
        const buffer = await FileHelper.zipFile(content);
        assert.equal(await FileHelper.unZipFile(buffer), content);
    });

    it('throws when the zip does not contain a diff entry', async () => {
        let threw = false;
        try {
            await FileHelper.unZipFile(new ArrayBuffer(8));
        } catch (error) {
            threw = true;
        }
        assert.isTrue(threw);
    });

    it('returns empty string when encrypting a null action', () => {
        assert.equal(FileHelper._encryptAction(null), '');
    });

    it('returns empty string when encrypting an undefined action', () => {
        assert.equal(FileHelper._encryptAction(undefined), '');
    });

    it('serializes an action to JSON with a trailing newline', () => {
        const out = FileHelper._encryptAction({ type: 'insert', id: 'a' });
        assert.equal(out, JSON.stringify({ type: 'insert', id: 'a' }) + '\n');
    });

    it('encrypts a collection with hash headers and one line per action', () => {
        const out = FileHelper._encryptCollection({
            hash: 'H',
            fullHash: 'FH',
            actions: [{ type: 'a' }, { type: 'b' }]
        });
        assert.include(out, 'HASH: H');
        assert.include(out, 'HASH: FH');
        const lines = out.split('\n').filter((l) => l.length > 0);
        assert.equal(lines.length, 4);
    });

    it('encrypts a null collection with empty hash headers', () => {
        const out = FileHelper._encryptCollection(null);
        assert.include(out, 'HASH: \n');
    });

    it('encrypts keys with target/key pairs', () => {
        const out = FileHelper._encryptKeys({
            hash: 'h',
            fullHash: 'fh',
            actions: [{ target: 't1', key: 'k1' }, { target: 't2', key: 'k2' }]
        });
        assert.include(out, 't1\n');
        assert.include(out, 'k1\n');
        assert.include(out, 't2\n');
        assert.include(out, 'k2\n');
    });

    it('encrypts null keys with empty hashes', () => {
        const out = FileHelper._encryptKeys(null);
        assert.include(out, 'HASH: \n');
    });

    it('round-trips a keys diff preserving metadata and actions', () => {
        const diff = {
            uuid: 'u1',
            index: 3,
            type: 'keys',
            lastUpdate: new Date('2024-01-01T00:00:00.000Z'),
            discussionsKeys: {
                hash: 'h',
                fullHash: 'fh',
                actions: [{ target: 't1', key: 'k1' }, { target: 't2', key: 'k2' }]
            }
        };
        const decoded = FileHelper.decryptFile(FileHelper.encryptFile(diff));
        assert.equal(decoded.uuid, 'u1');
        assert.equal(decoded.index, 3);
        assert.equal(decoded.type, 'keys');
        assert.equal(decoded.lastUpdate.toISOString(), '2024-01-01T00:00:00.000Z');
        assert.equal(decoded.discussionsKeys.actions.length, 2);
        assert.deepEqual(decoded.discussionsKeys.actions[0], { target: 't1', key: 'k1' });
    });

    it('round-trips a keys diff with no actions', () => {
        const diff = {
            uuid: 'u2',
            index: 0,
            type: 'keys',
            lastUpdate: null,
            discussionsKeys: { hash: '', fullHash: '', actions: [] }
        };
        const decoded = FileHelper.decryptFile(FileHelper.encryptFile(diff));
        assert.equal(decoded.type, 'keys');
        assert.equal(decoded.discussionsKeys.actions.length, 0);
    });

    it('round-trips a backup diff producing all collection arrays', () => {
        const diff = { uuid: 'b', index: 0, type: 'backup', lastUpdate: null };
        const decoded = FileHelper.decryptFile(FileHelper.encryptFile(diff));
        assert.equal(decoded.type, 'backup');
        assert.isArray(decoded.vcCollection.actions);
        assert.isArray(decoded.vpCollection.actions);
        assert.isArray(decoded.policyCommentCollection.actions);
    });

    it('round-trips backup collection actions', () => {
        const diff = {
            uuid: 'b2',
            index: 1,
            type: 'backup',
            lastUpdate: new Date('2023-06-15T12:00:00.000Z'),
            vcCollection: { hash: 'a', fullHash: 'b', actions: [{ type: 'insert', data: { x: 1 } }] }
        };
        const decoded = FileHelper.decryptFile(FileHelper.encryptFile(diff));
        assert.equal(decoded.vcCollection.actions.length, 1);
        assert.deepEqual(decoded.vcCollection.actions[0], { type: 'insert', data: { x: 1 } });
    });

    it('treats a diff type the same as backup on round-trip', () => {
        const diff = { uuid: 'd', index: 2, type: 'diff', lastUpdate: null };
        const decoded = FileHelper.decryptFile(FileHelper.encryptFile(diff));
        assert.equal(decoded.type, 'diff');
        assert.isArray(decoded.vcCollection.actions);
    });

    it('throws when the version header is missing', () => {
        assert.throws(() => FileHelper.decryptFile('TYPE: backup\n'), /Invalid version/);
    });

    it('throws when the type is invalid', () => {
        const file = 'VERSION: 1.0.0\nDATE: \nUUID: u\nINDEX: 0\nTYPE: bad\n';
        assert.throws(() => FileHelper.decryptFile(file), /Invalid type/);
    });

    it('encryptFile always writes version 1.0.0 header', () => {
        const out = FileHelper.encryptFile({ uuid: 'u', index: 0, type: 'keys', lastUpdate: null, discussionsKeys: { hash: '', fullHash: '', actions: [] } });
        assert.isTrue(out.startsWith('VERSION: 1.0.0\n'));
    });

    it('encryptFile writes an empty date for a null lastUpdate', () => {
        const out = FileHelper.encryptFile({ uuid: 'u', index: 0, type: 'keys', lastUpdate: null, discussionsKeys: { hash: '', fullHash: '', actions: [] } });
        assert.include(out, 'DATE: \n');
    });

    it('loadFile returns null for a falsy id', async () => {
        assert.equal(await FileHelper.loadFile(null), null);
        assert.equal(await FileHelper.loadFile(undefined), null);
    });
});
