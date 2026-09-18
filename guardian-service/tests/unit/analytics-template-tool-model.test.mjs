import assert from 'node:assert/strict';
import { TemplateToolModel } from '../../dist/analytics/compare/models/template-tool.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

describe('TemplateToolModel', () => {
    it('captures messageId as both messageId and key', () => {
        const t = new TemplateToolModel({ messageId: 'm-1', other: 1 });
        assert.equal(t.messageId, 'm-1');
        assert.equal(t.key, 'm-1');
    });

    it('starts with empty weights and getWeight()=undefined', () => {
        const t = new TemplateToolModel({ messageId: 'm-1' });
        assert.deepEqual(t.getWeights(), []);
        assert.equal(t.maxWeight(), 0);
        assert.equal(t.getWeight(), undefined);
        assert.equal(t.checkWeight(0), false);
    });

    it('update() populates two weights stored under TOPIC_LVL_0/1', () => {
        const t = new TemplateToolModel({ messageId: 'm-1', label: 'A' });
        t.update(opts);
        assert.equal(t.getWeights().length, 2);
        assert.ok(t.getWeight('TOPIC_LVL_0').length > 0);
        assert.ok(t.getWeight('TOPIC_LVL_1').length > 0);
        assert.equal(t.maxWeight(), 2);
        assert.equal(t.checkWeight(0), true);
        assert.equal(t.checkWeight(1), true);
        assert.equal(t.checkWeight(2), false);
    });

    it('falls back to messageId comparison when un-updated', () => {
        const a = new TemplateToolModel({ messageId: 'x' });
        const b = new TemplateToolModel({ messageId: 'x' });
        const c = new TemplateToolModel({ messageId: 'y' });
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() compares the strongest weight after update', () => {
        const a = new TemplateToolModel({ messageId: 'm-1', label: 'A' });
        const b = new TemplateToolModel({ messageId: 'm-1', label: 'A' });
        const c = new TemplateToolModel({ messageId: 'm-1', label: 'B' });
        a.update(opts); b.update(opts); c.update(opts);
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equal() at index=1 (looser TOPIC_LVL_0 weight) matches by messageId only', () => {
        const a = new TemplateToolModel({ messageId: 'm', label: 'A' });
        const b = new TemplateToolModel({ messageId: 'm', label: 'B' });
        a.update(opts); b.update(opts);
        assert.equal(a.equal(b, 1), true);
    });

    it('equalKey compares by messageId', () => {
        const a = new TemplateToolModel({ messageId: 'x' });
        const b = new TemplateToolModel({ messageId: 'x' });
        const c = new TemplateToolModel({ messageId: 'y' });
        assert.equal(a.equalKey(b), true);
        assert.equal(a.equalKey(c), false);
    });

    it('toObject returns {messageId, properties}', () => {
        const t = new TemplateToolModel({ messageId: 'm-1', extra: 1 });
        const out = t.toObject();
        assert.equal(out.messageId, 'm-1');
        assert.ok(Array.isArray(out.properties));
    });

    it('toWeight returns messageId before update, hash after', () => {
        const t = new TemplateToolModel({ messageId: 'm-1' });
        assert.equal(t.toWeight(opts).weight, 'm-1');
        t.update(opts);
        assert.equal(t.toWeight(opts).weight, t.getWeights()[0]);
    });
});
