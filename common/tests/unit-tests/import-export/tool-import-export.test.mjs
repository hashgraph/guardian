import { assert } from 'chai';
import JSZip from 'jszip';
import { ToolImportExport } from '../../../dist/import-export/tool.js';

describe('ToolImportExport.generateZipFile', function () {
    const components = {
        tool: {
            _id: 'raw-id',
            id: 'raw-id',
            uuid: 'uuid-1',
            messageId: 'msg-1',
            status: 'PUBLISHED',
            topicId: '0.0.1',
            createDate: '2020-01-01',
            updateDate: '2020-01-02',
            hash: 'hash-1',
            configFileId: 'file-1',
            name: 'Tool 1',
            description: 'desc',
            config: { blockType: 'tool' }
        },
        schemas: [
            { _id: 'sid', id: { toString: () => 'sid' }, iri: '#schema1', name: 'S1', status: 'PUBLISHED', readonly: false }
        ],
        tags: [
            { _id: 'tid', id: 'tid', name: 'tag1', status: 'Published' }
        ],
        tools: [
            { name: 'SubTool', description: 'sub', messageId: 'sub-msg', creator: 'did:creator', hash: 'sub-hash', topicId: '0.0.9' }
        ]
    };

    it('writes tool.json into the zip', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        assert.exists(zip.files['tool.json']);
    });

    it('strips volatile tool fields', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const parsed = JSON.parse(await zip.files['tool.json'].async('string'));
        assert.isUndefined(parsed._id);
        assert.isUndefined(parsed.id);
        assert.isUndefined(parsed.uuid);
        assert.isUndefined(parsed.messageId);
        assert.isUndefined(parsed.status);
        assert.isUndefined(parsed.topicId);
        assert.isUndefined(parsed.createDate);
        assert.isUndefined(parsed.updateDate);
        assert.isUndefined(parsed.hash);
        assert.isUndefined(parsed.configFileId);
    });

    it('keeps name, description and config', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const parsed = JSON.parse(await zip.files['tool.json'].async('string'));
        assert.equal(parsed.name, 'Tool 1');
        assert.equal(parsed.description, 'desc');
        assert.deepEqual(parsed.config, { blockType: 'tool' });
    });

    it('does not mutate the source tool', async function () {
        await ToolImportExport.generateZipFile(components);
        assert.equal(components.tool.hash, 'hash-1');
        assert.equal(components.tool.topicId, '0.0.1');
    });

    it('writes indexed tag files with History status', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const tag = JSON.parse(await zip.files['tags/0.json'].async('string'));
        assert.isUndefined(tag.id);
        assert.isUndefined(tag._id);
        assert.equal(tag.status, 'History');
        assert.equal(tag.name, 'tag1');
    });

    it('writes schema files keyed by iri', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const schema = JSON.parse(await zip.files['schemas/#schema1.json'].async('string'));
        assert.equal(schema.id, 'sid');
        assert.isUndefined(schema._id);
        assert.isUndefined(schema.status);
        assert.isUndefined(schema.readonly);
    });

    it('writes sub-tool descriptors keyed by hash', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const subTool = JSON.parse(await zip.files['tools/sub-hash.json'].async('string'));
        assert.deepEqual(subTool, {
            name: 'SubTool',
            description: 'sub',
            messageId: 'sub-msg',
            owner: 'did:creator',
            hash: 'sub-hash'
        });
    });

    it('creates the ipfs directory', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        assert.exists(zip.files['ipfs/']);
        assert.isTrue(zip.files['ipfs/'].dir);
    });

    it('produces deterministic zip bytes for the same input', async function () {
        const zip1 = await ToolImportExport.generateZipFile(components);
        const zip2 = await ToolImportExport.generateZipFile(components);
        const buf1 = await zip1.generateAsync({ type: 'nodebuffer' });
        const buf2 = await zip2.generateAsync({ type: 'nodebuffer' });
        assert.equal(buf1.toString('base64'), buf2.toString('base64'));
    });
});

describe('ToolImportExport.parseZipFile', function () {
    const components = {
        tool: {
            _id: 'x',
            id: 'x',
            name: 'Round',
            description: 'trip',
            config: { blockType: 'tool' }
        },
        schemas: [
            { _id: 'a', id: { toString: () => 'a' }, iri: '#s1', name: 'S1' }
        ],
        tags: [{ _id: 'q', id: 'q', name: 'tag1' }],
        tools: [
            { name: 'T1', description: 'd1', messageId: 'm1', creator: 'c1', hash: 'h1' },
            { name: 'T2', description: 'd2', messageId: 'm2', creator: 'c2', hash: 'h2' }
        ]
    };

    it('throws when tool.json is missing', async function () {
        const zip = new JSZip();
        zip.file('module.json', '{}');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        try {
            await ToolImportExport.parseZipFile(buffer);
            assert.fail('expected to throw');
        } catch (error) {
            assert.equal(error.message, 'Zip file is not a tool');
        }
    });

    it('throws when tool.json is a directory', async function () {
        const zip = new JSZip();
        zip.folder('tool.json');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        try {
            await ToolImportExport.parseZipFile(buffer);
            assert.fail('expected to throw');
        } catch (error) {
            assert.equal(error.message, 'Zip file is not a tool');
        }
    });

    it('round-trips the tool fields', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ToolImportExport.parseZipFile(buffer);
        assert.equal(parsed.tool.name, 'Round');
        assert.equal(parsed.tool.description, 'trip');
        assert.deepEqual(parsed.tool.config, { blockType: 'tool' });
    });

    it('collects tags, schemas and sub-tools', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ToolImportExport.parseZipFile(buffer);
        assert.lengthOf(parsed.tags, 1);
        assert.lengthOf(parsed.schemas, 1);
        assert.lengthOf(parsed.tools, 2);
        assert.sameMembers(parsed.tools.map(t => t.messageId), ['m1', 'm2']);
    });

    it('maps sub-tool creator to owner inside the descriptor', async function () {
        const zip = await ToolImportExport.generateZipFile(components);
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ToolImportExport.parseZipFile(buffer);
        const t1 = parsed.tools.find(t => t.hash === 'h1');
        assert.equal(t1.owner, 'c1');
        assert.isUndefined(t1.creator);
    });

    it('parses a tool-only zip', async function () {
        const zip = new JSZip();
        zip.file('tool.json', JSON.stringify({ name: 'solo' }));
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await ToolImportExport.parseZipFile(buffer);
        assert.equal(parsed.tool.name, 'solo');
        assert.deepEqual(parsed.tags, []);
        assert.deepEqual(parsed.schemas, []);
        assert.deepEqual(parsed.tools, []);
    });
});
