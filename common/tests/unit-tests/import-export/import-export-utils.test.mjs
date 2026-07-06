import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { ImportExportUtils } from '../../../dist/import-export/utils.js';

describe('ImportExportUtils.findAllTools', () => {
    it('returns empty array for a config without tools', () => {
        const result = ImportExportUtils.findAllTools({ blockType: 'interfaceContainerBlock', children: [] });
        assert.deepEqual(result, []);
    });

    it('collects messageId of nested tool blocks', () => {
        const config = {
            blockType: 'interfaceContainerBlock',
            children: [
                { blockType: 'tool', messageId: 'msg-1' },
                { blockType: 'tool', messageId: 'msg-2' }
            ]
        };
        assert.deepEqual(ImportExportUtils.findAllTools(config).sort(), ['msg-1', 'msg-2']);
    });

    it('does not treat the root block as a tool', () => {
        const config = { blockType: 'tool', messageId: 'root-msg', children: [] };
        assert.deepEqual(ImportExportUtils.findAllTools(config), []);
    });

    it('deduplicates repeated messageIds', () => {
        const config = {
            blockType: 'interfaceContainerBlock',
            children: [
                { blockType: 'tool', messageId: 'same' },
                { blockType: 'tool', messageId: 'same' }
            ]
        };
        assert.deepEqual(ImportExportUtils.findAllTools(config), ['same']);
    });

    it('skips tools with non-string messageId', () => {
        const config = {
            blockType: 'interfaceContainerBlock',
            children: [
                { blockType: 'tool', messageId: 42 },
                { blockType: 'tool' }
            ]
        };
        assert.deepEqual(ImportExportUtils.findAllTools(config), []);
    });

    it('finds deeply nested tools through container chains', () => {
        const config = {
            blockType: 'a',
            children: [{ blockType: 'b', children: [{ blockType: 'c', children: [{ blockType: 'tool', messageId: 'deep' }] }] }]
        };
        assert.deepEqual(ImportExportUtils.findAllTools(config), ['deep']);
    });
});

describe('ImportExportUtils.findAllSchemas', () => {
    it('collects schema field values from regular blocks', () => {
        const config = {
            blockType: 'requestVcDocumentBlock',
            schema: '#schema-1',
            presetSchema: '#schema-2',
            children: []
        };
        assert.deepEqual(ImportExportUtils.findAllSchemas(config).sort(), ['#schema-1', '#schema-2']);
    });

    it('collects Schema-typed variables for tool blocks', () => {
        const config = {
            blockType: 'tool',
            variables: [
                { name: 'inputSchema', type: 'Schema' },
                { name: 'other', type: 'Token' }
            ],
            inputSchema: '#tool-schema',
            other: '0.0.1'
        };
        assert.deepEqual(ImportExportUtils.findAllSchemas(config), ['#tool-schema']);
    });

    it('does not descend into tool block children', () => {
        const config = {
            blockType: 'tool',
            variables: [],
            children: [{ blockType: 'x', schema: '#hidden' }]
        };
        assert.deepEqual(ImportExportUtils.findAllSchemas(config), []);
    });

    it('collects schemas from globalEventsReaderBlock branches', () => {
        const config = {
            blockType: 'globalEventsReaderBlock',
            branches: [{ schema: '#branch-1' }, { schema: '#branch-2' }, { other: true }]
        };
        assert.deepEqual(ImportExportUtils.findAllSchemas(config).sort(), ['#branch-1', '#branch-2']);
    });

    it('ignores non-string schema fields', () => {
        const config = { blockType: 'x', schema: { iri: '#obj' }, children: [] };
        assert.deepEqual(ImportExportUtils.findAllSchemas(config), []);
    });
});

describe('ImportExportUtils.findAllTokens', () => {
    it('collects tokenId from regular blocks', () => {
        const config = {
            blockType: 'mintDocumentBlock',
            tokenId: '0.0.123',
            children: [{ blockType: 'x', tokenId: '0.0.456' }]
        };
        assert.deepEqual(ImportExportUtils.findAllTokens(config).sort(), ['0.0.123', '0.0.456']);
    });

    it('collects Token-typed variables for module blocks', () => {
        const config = {
            blockType: 'module',
            variables: [{ name: 'tok', type: 'Token' }],
            tok: '0.0.999'
        };
        assert.deepEqual(ImportExportUtils.findAllTokens(config), ['0.0.999']);
    });

    it('returns empty array when no tokens exist', () => {
        assert.deepEqual(ImportExportUtils.findAllTokens({ blockType: 'x', children: [] }), []);
    });
});

describe('ImportExportUtils zip helpers', () => {
    it('exposes a fixed deterministic date of 1980-01-01 UTC', () => {
        assert.equal(ImportExportUtils.DETERMINISTIC_ZIP_DATE.toISOString(), '1980-01-01T00:00:00.000Z');
    });

    it('getDeterministicZipFileOptions returns stable file options', () => {
        const opts = ImportExportUtils.getDeterministicZipFileOptions();
        assert.equal(opts.createFolders, false);
        assert.equal(opts.date.getTime(), ImportExportUtils.DETERMINISTIC_ZIP_DATE.getTime());
        assert.equal(opts.unixPermissions, 0o100644);
        assert.equal(opts.dosPermissions, 0x20);
    });

    it('addDeterministicZipDir adds a directory entry to the zip', () => {
        const zip = new JSZip();
        ImportExportUtils.addDeterministicZipDir(zip, 'tags');
        const entry = zip.files['tags/'];
        assert.ok(entry);
        assert.equal(entry.dir, true);
    });
});
