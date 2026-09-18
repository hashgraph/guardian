import assert from 'node:assert/strict';
import { TopicModel } from '../../dist/analytics/compare/models/topic.model.js';
import { TemplateTokenModel } from '../../dist/analytics/compare/models/template-token.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

describe('TopicModel', () => {
    it('captures name and exposes it as the key', () => {
        const t = new TopicModel({ name: 'GeneralTopic', description: 'd' });
        assert.equal(t.name, 'GeneralTopic');
        assert.equal(t.key, 'GeneralTopic');
    });

    it('starts with empty weights', () => {
        const t = new TopicModel({ name: 'GeneralTopic' });
        assert.deepEqual(t.getWeights(), []);
        assert.equal(t.maxWeight(), 0);
        assert.equal(t.checkWeight(0), false);
    });

    it('update() populates two weights (TOPIC_LVL_0 and TOPIC_LVL_1)', () => {
        const t = new TopicModel({ name: 'GeneralTopic', description: 'd' });
        t.update(opts);
        assert.equal(t.getWeights().length, 2);
        assert.equal(t.maxWeight(), 2);
        assert.equal(t.checkWeight(0), true);
        assert.equal(t.checkWeight(1), true);
        assert.equal(t.checkWeight(2), false);
    });

    it('falls back to name comparison when un-updated', () => {
        const a = new TopicModel({ name: 'a' });
        const b = new TopicModel({ name: 'a' });
        const c = new TopicModel({ name: 'b' });
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() at default index compares the strongest weight', () => {
        const a = new TopicModel({ name: 't', description: 'X' });
        const b = new TopicModel({ name: 't', description: 'X' });
        const c = new TopicModel({ name: 't', description: 'Y' });
        a.update(opts); b.update(opts); c.update(opts);
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() at index=1 (looser) matches topics that share name only', () => {
        const a = new TopicModel({ name: 't', description: 'X' });
        const b = new TopicModel({ name: 't', description: 'Y' });
        a.update(opts); b.update(opts);
        assert.equal(a.equal(b, 1), true);
    });

    it('equalKey compares names', () => {
        const a = new TopicModel({ name: 't' });
        const b = new TopicModel({ name: 't' });
        const c = new TopicModel({ name: 'q' });
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });

    it('toObject returns {name, properties}', () => {
        const t = new TopicModel({ name: 't', extra: 1 });
        const out = t.toObject();
        assert.equal(out.name, 't');
        assert.ok(Array.isArray(out.properties));
    });

    it('toWeight returns name when un-updated, hash when updated', () => {
        const t = new TopicModel({ name: 't' });
        assert.equal(t.toWeight(opts).weight, 't');
        t.update(opts);
        assert.equal(t.toWeight(opts).weight, t.getWeights()[0]);
    });

    it('getWeight(type) reads the named weight from the map', () => {
        const t = new TopicModel({ name: 't' });
        t.update(opts);
        assert.ok(t.getWeight('TOPIC_LVL_0').length > 0);
        assert.ok(t.getWeight('TOPIC_LVL_1').length > 0);
    });
});

describe('TemplateTokenModel', () => {
    it('captures templateTokenTag as both name and key', () => {
        const t = new TemplateTokenModel({ templateTokenTag: 'token-A', tokenName: 'X' });
        assert.equal(t.name, 'token-A');
        assert.equal(t.key, 'token-A');
    });

    it('toObject uses tag (not name) as the top-level field', () => {
        const t = new TemplateTokenModel({ templateTokenTag: 'token-A' });
        const out = t.toObject();
        assert.equal(out.tag, 'token-A');
        assert.ok(Array.isArray(out.properties));
        assert.equal(out.name, undefined);
    });

    it('update() populates two weights stored under TOPIC_LVL_0/1', () => {
        const t = new TemplateTokenModel({ templateTokenTag: 't', tokenName: 'A' });
        t.update(opts);
        assert.equal(t.getWeights().length, 2);
        assert.ok(t.getWeight('TOPIC_LVL_0').length > 0);
        assert.ok(t.getWeight('TOPIC_LVL_1').length > 0);
    });

    it('equal() falls back to name comparison when un-updated', () => {
        const a = new TemplateTokenModel({ templateTokenTag: 'x' });
        const b = new TemplateTokenModel({ templateTokenTag: 'x' });
        const c = new TemplateTokenModel({ templateTokenTag: 'y' });
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() returns true for two identical raws after update', () => {
        const a = new TemplateTokenModel({ templateTokenTag: 't', tokenName: 'A' });
        const b = new TemplateTokenModel({ templateTokenTag: 't', tokenName: 'A' });
        a.update(opts); b.update(opts);
        assert.equal(a.equal(b), true);
    });

    it('equal() returns false when properties differ at the strongest level', () => {
        const a = new TemplateTokenModel({ templateTokenTag: 't', tokenName: 'A' });
        const b = new TemplateTokenModel({ templateTokenTag: 't', tokenName: 'B' });
        a.update(opts); b.update(opts);
        assert.equal(a.equal(b), false);
    });

    it('equalKey compares names', () => {
        const a = new TemplateTokenModel({ templateTokenTag: 'x' });
        const b = new TemplateTokenModel({ templateTokenTag: 'x' });
        const c = new TemplateTokenModel({ templateTokenTag: 'y' });
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });
});
