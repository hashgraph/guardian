import { assert } from 'chai';
import JSZip from 'jszip';
import { ModuleImportExport } from '../../../dist/import-export/module.js';

describe('ModuleImportExport.generateZipFile', function () {
    const components = {
        module: {
            _id: 'raw-id',
            id: 'raw-id',
            uuid: 'uuid-1',
            messageId: 'msg-1',
            status: 'PUBLISHED',
            topicId: '0.0.1',
            createDate: '2020-01-01',
            name: 'Module 1',
            description: 'desc',
            config: { blockType: 'module' }
        },
        schemas: [
            { _id: 'sid', id: { toString: () => 'sid' }, iri: '#schema1', name: 'S1', status: 'PUBLISHED', readonly: true }
        ],
        tags: [
            { _id: 'tid', id: 'tid', name: 'tag1', status: 'Published' },
            { _id: 'tid2', id: 'tid2', name: 'tag2', status: 'Draft' }
        ]
    };

    it('writes module.json into the zip', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        assert.exists(zip.files['module.json']);
    });

    it('strips volatile module fields', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        const parsed = JSON.parse(await zip.files['module.json'].async('string'));
        assert.isUndefined(parsed._id);
        assert.isUndefined(parsed.id);
        assert.isUndefined(parsed.uuid);
        assert.isUndefined(parsed.messageId);
        assert.isUndefined(parsed.status);
        assert.isUndefined(parsed.topicId);
        assert.isUndefined(parsed.createDate);
    });

    it('keeps name, description and config', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        const parsed = JSON.parse(await zip.files['module.json'].async('string'));
        assert.equal(parsed.name, 'Module 1');
        assert.equal(parsed.description, 'desc');
        assert.deepEqual(parsed.config, { blockType: 'module' });
    });

    it('does not mutate the source module', async function () {
        await ModuleImportExport.generateZipFile(components);
        assert.equal(components.module.uuid, 'uuid-1');
        assert.equal(components.module.status, 'PUBLISHED');
    });

    it('writes indexed tag files with History status and stripped ids', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        assert.exists(zip.files['tags/0.json']);
        assert.exists(zip.files['tags/1.json']);
        const tag0 = JSON.parse(await zip.files['tags/0.json'].async('string'));
        assert.isUndefined(tag0.id);
        assert.isUndefined(tag0._id);
        assert.equal(tag0.status, 'History');
        assert.equal(tag0.name, 'tag1');
    });

    it('creates ipfs and schemas directories', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        assert.exists(zip.files['ipfs/']);
        assert.isTrue(zip.files['ipfs/'].dir);
        assert.exists(zip.files['schemas/']);
    });

    it('writes schema files keyed by iri with a stringified id', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        const schema = JSON.parse(await zip.files['schemas/#schema1.json'].async('string'));
        assert.equal(schema.id, 'sid');
        assert.isUndefined(schema._id);
        assert.isUndefined(schema.status);
        assert.isUndefined(schema.readonly);
        assert.equal(schema.iri, '#schema1');
        assert.equal(schema.name, 'S1');
    });

    it('produces deterministic zip bytes for the same input', async function () {
        const zip1 = await ModuleImportExport.generateZipFile(components);
        const zip2 = await ModuleImportExport.generateZipFile(components);
        const buf1 = await zip1.generateAsync({ type: 'nodebuffer' });
        const buf2 = await zip2.generateAsync({ type: 'nodebuffer' });
        assert.equal(buf1.toString('base64'), buf2.toString('base64'));
    });
});

describe('ModuleImportExport.parseZipFile', function () {
    const components = {
        module: {
            _id: 'x',
            id: 'x',
            uuid: 'u',
            messageId: 'm',
            status: 's',
            topicId: 't',
            createDate: 'c',
            name: 'Round',
            description: 'trip',
            config: { blockType: 'module', children: [] }
        },
        schemas: [
            { _id: 'a', id: { toString: () => 'a' }, iri: '#s1', name: 'S1' },
            { _id: 'b', id: { toString: () => 'b' }, iri: '#s2', name: 'S2' }
        ],
        tags: [{ _id: 'q', id: 'q', name: 'tag1' }]
    };

    it('throws when module.json is missing', async function () {
        const zip = new JSZip();
        zip.file('other.json', '{}');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        try {
            await ModuleImportExport.parseZipFile(buffer);
            assert.fail('expected to throw');
        } catch (error) {
            assert.equal(error.message, 'Zip file is not a module');
        }
    });

    it('throws when module.json is a directory', async function () {
        const zip = new JSZip();
        zip.folder('module.json');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        try {
            await ModuleImportExport.parseZipFile(buffer);
            assert.fail('expected to throw');
        } catch (error) {
            assert.equal(error.message, 'Zip file is not a module');
        }
    });

    it('round-trips the module fields', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ModuleImportExport.parseZipFile(buffer);
        assert.equal(parsed.module.name, 'Round');
        assert.equal(parsed.module.description, 'trip');
        assert.deepEqual(parsed.module.config, { blockType: 'module', children: [] });
    });

    it('collects all tags and schemas', async function () {
        const zip = await ModuleImportExport.generateZipFile(components);
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ModuleImportExport.parseZipFile(buffer);
        assert.lengthOf(parsed.tags, 1);
        assert.equal(parsed.tags[0].name, 'tag1');
        assert.lengthOf(parsed.schemas, 2);
        assert.sameMembers(parsed.schemas.map(s => s.iri), ['#s1', '#s2']);
    });

    it('ignores directory entries inside tags and schemas', async function () {
        const zip = new JSZip();
        zip.file('module.json', JSON.stringify({ name: 'm' }));
        zip.folder('tags');
        zip.folder('schemas');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ModuleImportExport.parseZipFile(buffer);
        assert.deepEqual(parsed.tags, []);
        assert.deepEqual(parsed.schemas, []);
    });

    it('parses a module-only zip', async function () {
        const zip = new JSZip();
        zip.file('module.json', JSON.stringify({ name: 'solo', config: {} }));
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ModuleImportExport.parseZipFile(buffer);
        assert.equal(parsed.module.name, 'solo');
        assert.deepEqual(parsed.tags, []);
        assert.deepEqual(parsed.schemas, []);
    });
});
