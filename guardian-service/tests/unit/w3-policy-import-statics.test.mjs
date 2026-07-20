import assert from 'node:assert/strict';
import { BlockType } from '@guardian/interfaces';
import { PolicyImportExportHelper } from '../../dist/helpers/import-helpers/policy/policy-import-helper.js';

describe('PolicyImportExportHelper.errorsMessage', () => {
    it('returns the base message for an empty error list', () => {
        assert.equal(PolicyImportExportHelper.errorsMessage([]), 'Failed to import components:');
    });

    it('groups schema errors', () => {
        const message = PolicyImportExportHelper.errorsMessage([
            { type: 'schema', name: 'S1' },
            { type: 'schema', name: 'S2' }
        ]);
        assert.equal(message, 'Failed to import components: schemas: ["S1","S2"];');
    });

    it('groups tool errors', () => {
        const message = PolicyImportExportHelper.errorsMessage([{ type: 'tool', name: 'T1' }]);
        assert.equal(message, 'Failed to import components: tools: ["T1"];');
    });

    it('groups unknown types as others', () => {
        const message = PolicyImportExportHelper.errorsMessage([{ type: 'token', name: 'X' }]);
        assert.equal(message, 'Failed to import components: others: ["X"];');
    });

    it('concatenates schema, tool and other sections in order', () => {
        const message = PolicyImportExportHelper.errorsMessage([
            { type: 'tool', name: 'T' },
            { type: 'schema', name: 'S' },
            { type: 'artifact', name: 'A' }
        ]);
        assert.equal(message, 'Failed to import components: schemas: ["S"]; tools: ["T"]; others: ["A"];');
    });
});

describe('PolicyImportExportHelper.findTools', () => {
    it('ignores a null block', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools(null, result);
        assert.equal(result.size, 0);
    });

    it('adds the messageId of a tool block', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: BlockType.Tool, messageId: 'msg-1' }, result);
        assert.deepEqual(Array.from(result), ['msg-1']);
    });

    it('skips a tool block without a messageId', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: BlockType.Tool }, result);
        assert.equal(result.size, 0);
    });

    it('skips a tool block with a non-string messageId', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: BlockType.Tool, messageId: 42 }, result);
        assert.equal(result.size, 0);
    });

    it('recurses into the children of non-tool blocks', () => {
        const result = new Set();
        const config = {
            blockType: 'interfaceContainerBlock',
            children: [
                { blockType: BlockType.Tool, messageId: 'a' },
                {
                    blockType: 'interfaceStepBlock',
                    children: [{ blockType: BlockType.Tool, messageId: 'b' }]
                }
            ]
        };
        PolicyImportExportHelper.findTools(config, result);
        assert.deepEqual(Array.from(result).sort(), ['a', 'b']);
    });

    it('does not traverse the children of a tool block', () => {
        const result = new Set();
        const config = {
            blockType: BlockType.Tool,
            messageId: 'outer',
            children: [{ blockType: BlockType.Tool, messageId: 'inner' }]
        };
        PolicyImportExportHelper.findTools(config, result);
        assert.deepEqual(Array.from(result), ['outer']);
    });

    it('handles blocks without children arrays', () => {
        const result = new Set();
        PolicyImportExportHelper.findTools({ blockType: 'requestVcDocumentBlock' }, result);
        assert.equal(result.size, 0);
    });
});
