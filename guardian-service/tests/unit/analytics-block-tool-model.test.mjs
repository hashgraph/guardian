import assert from 'node:assert/strict';
import { BlockToolModel, BlockModel } from '../../dist/analytics/compare/models/index.js';

const options = (over = {}) => ({ propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All', childLvl: 'All', ...over });

const raw = (over = {}) => ({
    blockType: 'tool',
    tag: 'tool-tag',
    hash: 'hash-1',
    messageId: 'msg-1',
    events: [],
    artifacts: [],
    ...over
});

describe('BlockToolModel', () => {
    it('is a subclass of BlockModel', () => {
        assert.ok(new BlockToolModel(raw(), 0) instanceof BlockModel);
    });

    it('captures blockType, tag and index from json', () => {
        const b = new BlockToolModel(raw(), 5);
        assert.equal(b.blockType, 'tool');
        assert.equal(b.tag, 'tool-tag');
        assert.equal(b.index, 5);
    });

    it('captures hash and messageId from json', () => {
        const b = new BlockToolModel(raw({ hash: 'abc', messageId: '0.0.99' }), 0);
        assert.equal(b.hash, 'abc');
        assert.equal(b.messageId, '0.0.99');
    });

    it('key combines blockType and hash', () => {
        const b = new BlockToolModel(raw({ blockType: 'tool', hash: 'XYZ' }), 0);
        assert.equal(b.key, 'tool:XYZ');
    });

    it('key differs when hash differs', () => {
        const a = new BlockToolModel(raw({ hash: 'h1' }), 0);
        const b = new BlockToolModel(raw({ hash: 'h2' }), 0);
        assert.notEqual(a.key, b.key);
    });

    it('children getter is always an empty array', () => {
        const b = new BlockToolModel(raw(), 0);
        assert.deepEqual(b.children, []);
    });

    it('children stays empty even when json has children', () => {
        const b = new BlockToolModel(raw({ children: [{ blockType: 'x', hash: 'h', messageId: 'm', events: [], artifacts: [] }] }), 0);
        assert.deepEqual(b.children, []);
    });

    it('equalKey compares by composite key', () => {
        const a = new BlockToolModel(raw({ hash: 'same' }), 0);
        const same = new BlockToolModel(raw({ hash: 'same' }), 1);
        const other = new BlockToolModel(raw({ hash: 'diff' }), 2);
        assert.equal(a.equalKey(same), true);
        assert.equal(a.equalKey(other), false);
    });

    it('getWeight returns undefined before update', () => {
        const b = new BlockToolModel(raw(), 0);
        assert.equal(b.getWeight('PROP_LVL_1'), undefined);
    });

    it('maxWeight is zero before update', () => {
        const b = new BlockToolModel(raw(), 0);
        assert.equal(b.maxWeight(), 0);
    });

    it('update populates weights and a deterministic hash', () => {
        const b = new BlockToolModel(raw(), 0);
        b.update(options());
        assert.ok(b.maxWeight() > 0);
        assert.equal(typeof b.getWeight(), 'string');
    });

    it('two identical tool blocks produce the same hash after update', () => {
        const a = new BlockToolModel(raw(), 0);
        const b = new BlockToolModel(raw(), 0);
        a.update(options());
        b.update(options());
        assert.equal(a.getWeight(), b.getWeight());
    });

    it('different tags produce different hashes after update', () => {
        const a = new BlockToolModel(raw({ tag: 'one' }), 0);
        const b = new BlockToolModel(raw({ tag: 'two' }), 0);
        a.update(options());
        b.update(options());
        assert.notEqual(a.getWeight(), b.getWeight());
    });

    it('equal compares full hash after update for identical blocks', () => {
        const a = new BlockToolModel(raw(), 0);
        const b = new BlockToolModel(raw(), 0);
        a.update(options());
        b.update(options());
        assert.equal(a.equal(b), true);
    });

    it('equal is false when keys differ', () => {
        const a = new BlockToolModel(raw({ hash: 'a' }), 0);
        const b = new BlockToolModel(raw({ hash: 'b' }), 0);
        a.update(options());
        b.update(options());
        assert.equal(a.equal(b), false);
    });

    it('checkWeight is true for index 0 after update', () => {
        const b = new BlockToolModel(raw(), 0);
        b.update(options());
        assert.equal(b.checkWeight(0), true);
    });

    it('getWeights returns an array after update', () => {
        const b = new BlockToolModel(raw(), 0);
        b.update(options());
        assert.ok(Array.isArray(b.getWeights()));
    });
});
