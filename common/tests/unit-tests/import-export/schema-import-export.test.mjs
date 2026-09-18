import { assert } from 'chai';
import JSZip from 'jszip';
import { SchemaImportExport } from '../../../dist/import-export/schema.js';

describe('SchemaImportExport.generateZipFile', function () {
    const schemas = [
        { iri: '#schema1', name: 'S1', status: 'DRAFT' },
        { iri: '#schema2', name: 'S2', status: 'DRAFT' }
    ];
    const tags = [{ name: 'tag1' }, { name: 'tag2' }];

    it('writes one json file per schema keyed by iri', async function () {
        const zip = await SchemaImportExport.generateZipFile({ schemas, tags: null });
        assert.exists(zip.files['#schema1.json']);
        assert.exists(zip.files['#schema2.json']);
    });

    it('serializes the full schema object', async function () {
        const zip = await SchemaImportExport.generateZipFile({ schemas, tags: null });
        const parsed = JSON.parse(await zip.files['#schema1.json'].async('string'));
        assert.deepEqual(parsed, schemas[0]);
    });

    it('writes indexed tag files when tags is an array', async function () {
        const zip = await SchemaImportExport.generateZipFile({ schemas, tags });
        assert.exists(zip.files['tags/']);
        const tag0 = JSON.parse(await zip.files['tags/0.json'].async('string'));
        const tag1 = JSON.parse(await zip.files['tags/1.json'].async('string'));
        assert.equal(tag0.name, 'tag1');
        assert.equal(tag1.name, 'tag2');
    });

    it('skips the tags directory when tags is not an array', async function () {
        const zip = await SchemaImportExport.generateZipFile({ schemas, tags: null });
        assert.notExists(zip.files['tags/']);
    });

    it('skips the ipfs branch when helpers or user are missing', async function () {
        const zip = await SchemaImportExport.generateZipFile({ schemas, tags, helpers: { csvGetFile: () => null } });
        assert.notExists(zip.files['ipfs/']);
    });

    it('writes ipfs document and context files for published schemas', async function () {
        const calls = [];
        const helpers = {
            csvGetFile: async (fileId, user) => {
                calls.push([fileId, user]);
                return { buffer: { data: Array.from(Buffer.from(JSON.stringify({ file: fileId }))) } };
            }
        };
        const user = { did: 'did:user' };
        const published = [{
            iri: '#pub',
            status: 'PUBLISHED',
            contentDocumentFileId: { toString: () => 'doc-id' },
            contentContextFileId: { toString: () => 'ctx-id' }
        }];
        const zip = await SchemaImportExport.generateZipFile({ schemas: published, tags: [], helpers, user });
        const doc = JSON.parse(await zip.files['ipfs/#pub.document.json'].async('string'));
        const ctx = JSON.parse(await zip.files['ipfs/#pub.context.json'].async('string'));
        assert.deepEqual(doc, { file: 'doc-id' });
        assert.deepEqual(ctx, { file: 'ctx-id' });
        assert.deepEqual(calls, [['doc-id', user], ['ctx-id', user]]);
    });

    it('skips ipfs files for non-published schemas', async function () {
        const helpers = {
            csvGetFile: async () => ({ buffer: { data: [1, 2, 3] } })
        };
        const drafts = [{
            iri: '#draft',
            status: 'DRAFT',
            contentDocumentFileId: { toString: () => 'doc-id' },
            contentContextFileId: { toString: () => 'ctx-id' }
        }];
        const zip = await SchemaImportExport.generateZipFile({ schemas: drafts, tags: [], helpers, user: { did: 'd' } });
        assert.notExists(zip.files['ipfs/#draft.document.json']);
        assert.notExists(zip.files['ipfs/#draft.context.json']);
    });

    it('skips ipfs files when content file ids are missing', async function () {
        const helpers = {
            csvGetFile: async () => ({ buffer: { data: [1] } })
        };
        const published = [{ iri: '#pub', status: 'PUBLISHED' }];
        const zip = await SchemaImportExport.generateZipFile({ schemas: published, tags: [], helpers, user: { did: 'd' } });
        assert.exists(zip.files['ipfs/']);
        assert.notExists(zip.files['ipfs/#pub.document.json']);
        assert.notExists(zip.files['ipfs/#pub.context.json']);
    });
});

describe('SchemaImportExport.parseZipFile', function () {
    it('round-trips schemas and tags', async function () {
        const schemas = [{ iri: '#s1', name: 'S1' }, { iri: '#s2', name: 'S2' }];
        const tags = [{ name: 'tag1' }];
        const zip = await SchemaImportExport.generateZipFile({ schemas, tags });
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await SchemaImportExport.parseZipFile(buffer);
        assert.lengthOf(parsed.schemas, 2);
        assert.sameMembers(parsed.schemas.map(s => s.iri), ['#s1', '#s2']);
        assert.deepEqual(parsed.tags, tags);
    });

    it('ignores files under ipfs/', async function () {
        const zip = new JSZip();
        zip.file('#s1.json', JSON.stringify({ iri: '#s1' }));
        zip.file('ipfs/#s1.document.json', JSON.stringify({ d: 1 }));
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await SchemaImportExport.parseZipFile(buffer);
        assert.lengthOf(parsed.schemas, 1);
        assert.equal(parsed.schemas[0].iri, '#s1');
    });

    it('separates tag files from schema files', async function () {
        const zip = new JSZip();
        zip.file('#s1.json', JSON.stringify({ iri: '#s1' }));
        zip.file('tags/0.json', JSON.stringify({ name: 't' }));
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await SchemaImportExport.parseZipFile(buffer);
        assert.lengthOf(parsed.schemas, 1);
        assert.lengthOf(parsed.tags, 1);
        assert.equal(parsed.tags[0].name, 't');
    });

    it('returns empty arrays for an empty zip', async function () {
        const zip = new JSZip();
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const parsed = await SchemaImportExport.parseZipFile(buffer);
        assert.deepEqual(parsed.schemas, []);
        assert.deepEqual(parsed.tags, []);
    });
});
