import assert from 'node:assert/strict';
import { BlockType } from '../dist/type/block.type.js';

describe('BlockType enum', () => {
    it('maps representative block keys to their canonical names', () => {
        assert.equal(BlockType.Container, 'interfaceContainerBlock');
        assert.equal(BlockType.DocumentsViewer, 'interfaceDocumentsSourceBlock');
        assert.equal(BlockType.Information, 'informationBlock');
        assert.equal(BlockType.Mint, 'mintDocumentBlock');
        assert.equal(BlockType.SendToGuardian, 'sendToGuardianBlock');
        assert.equal(BlockType.Switch, 'switchBlock');
        assert.equal(BlockType.TimerBlock, 'timerBlock');
    });
    it('every value is a non-empty camelCase identifier', () => {
        for (const v of Object.values(BlockType)) {
            assert.equal(typeof v, 'string');
            assert.ok(v.length > 0);
            assert.match(v, /^[a-z][A-Za-z0-9]*$/, `unexpected shape: ${v}`);
        }
    });
    it('has 30+ block types', () => {
        assert.ok(Object.keys(BlockType).length >= 30);
    });
});
