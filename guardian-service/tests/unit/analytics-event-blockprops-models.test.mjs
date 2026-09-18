import assert from 'node:assert/strict';
import { EventModel } from '../../dist/analytics/compare/models/event.model.js';
import { BlockPropertiesModel } from '../../dist/analytics/compare/models/block-properties.model.js';

const opts = (overrides = {}) => ({
    propLvl: 'All',
    keyLvl: 'Default',
    idLvl: 'All',
    eventLvl: 'All',
    ...overrides,
});

const rawEvent = (overrides = {}) => ({
    actor: 'system',
    disabled: false,
    input: 'RunEvent',
    output: 'RefreshEvent',
    source: 'src-tag',
    target: 'tgt-tag',
    ...overrides,
});

const fakeBlock = (weightByType) => ({
    getWeight(type) { return weightByType[type] || ''; },
});

describe('EventModel construction', () => {
    it('captures every documented field from the raw JSON', () => {
        const e = new EventModel(rawEvent());
        assert.equal(e.actor, 'system');
        assert.equal(e.disabled, false);
        assert.equal(e.input, 'RunEvent');
        assert.equal(e.output, 'RefreshEvent');
        assert.equal(e.source, 'src-tag');
        assert.equal(e.target, 'tgt-tag');
    });

    it('has a null key (events do not key into rate maps)', () => {
        const e = new EventModel(rawEvent());
        assert.equal(e.key, null);
    });
});

describe('EventModel.update', () => {
    it('uses block weights at PROP_LVL_3 when eventLvl=All', () => {
        const e = new EventModel(rawEvent());
        const map = {
            'src-tag': fakeBlock({ PROP_LVL_3: 'src-w' }),
            'tgt-tag': fakeBlock({ PROP_LVL_3: 'tgt-w' }),
        };
        e.update(map, opts({ eventLvl: 'All' }));
        const obj = e.toObject();
        assert.equal(obj.startWeight, 'src-w');
        assert.equal(obj.endWeight, 'tgt-w');
        assert.ok(obj.weight.length > 0);
    });

    it('falls back to "undefined" sentinel when blocks are missing under eventLvl=All', () => {
        const e = new EventModel(rawEvent());
        e.update({}, opts({ eventLvl: 'All' }));
        const obj = e.toObject();
        assert.equal(obj.startWeight, 'undefined');
        assert.equal(obj.endWeight, 'undefined');
    });

    it('uses raw source/target tags under eventLvl=Simple', () => {
        const e = new EventModel(rawEvent());
        e.update({}, opts({ eventLvl: 'Simple' }));
        const obj = e.toObject();
        assert.equal(obj.startWeight, 'src-tag');
        assert.equal(obj.endWeight, 'tgt-tag');
    });

    it('public weight is "" outside eventLvl=All but the underlying hash still drives equal()', () => {
        const a = new EventModel(rawEvent());
        const b = new EventModel(rawEvent());
        a.update({}, opts({ eventLvl: 'Simple' }));
        b.update({}, opts({ eventLvl: 'Simple' }));
        const aObj = a.toObject();
        assert.equal(aObj.weight, '');
        assert.equal(a.equal(b), true);
    });

    it('uses "undefined" for both endpoints when eventLvl=None', () => {
        const e = new EventModel(rawEvent());
        e.update({}, opts({ eventLvl: 'None' }));
        const obj = e.toObject();
        assert.equal(obj.startWeight, 'undefined');
        assert.equal(obj.endWeight, 'undefined');
    });
});

describe('EventModel.equal', () => {
    it('returns true for two events with identical inputs/outputs/endpoints', () => {
        const a = new EventModel(rawEvent());
        const b = new EventModel(rawEvent());
        a.update({}, opts({ eventLvl: 'Simple' }));
        b.update({}, opts({ eventLvl: 'Simple' }));
        assert.equal(a.equal(b), true);
    });

    it('returns false when actor differs', () => {
        const a = new EventModel(rawEvent({ actor: 'system' }));
        const b = new EventModel(rawEvent({ actor: 'user' }));
        a.update({}, opts({ eventLvl: 'Simple' }));
        b.update({}, opts({ eventLvl: 'Simple' }));
        assert.equal(a.equal(b), false);
    });

    it('returns false when source/target differ under eventLvl=Simple', () => {
        const a = new EventModel(rawEvent({ source: 'a' }));
        const b = new EventModel(rawEvent({ source: 'b' }));
        a.update({}, opts({ eventLvl: 'Simple' }));
        b.update({}, opts({ eventLvl: 'Simple' }));
        assert.equal(a.equal(b), false);
    });
});

describe('EventModel.toObject / toWeight', () => {
    it('toObject exposes all six raw fields plus weight/startWeight/endWeight', () => {
        const e = new EventModel(rawEvent());
        e.update({}, opts({ eventLvl: 'Simple' }));
        const obj = e.toObject();
        for (const k of ['actor', 'source', 'target', 'input', 'output', 'disabled', 'weight', 'startWeight', 'endWeight']) {
            assert.ok(k in obj, `toObject missing ${k}`);
        }
    });

    it('toWeight returns the underlying _hash regardless of eventLvl', () => {
        const e = new EventModel(rawEvent());
        e.update({}, opts({ eventLvl: 'Simple' }));
        const w = e.toWeight(opts());
        assert.ok(typeof w.weight === 'string' && w.weight.length > 0);
    });
});

describe('BlockPropertiesModel', () => {
    it('keeps non-skeletal fields (other than id/blockType/tag/permissions/artifacts/events/children)', () => {
        const m = new BlockPropertiesModel({
            id: 'b-1',
            blockType: 'tool',
            tag: 'demo',
            permissions: ['OWNER'],
            artifacts: [{}],
            events: [{}],
            children: [{}],
            customField: 'kept',
        });
        const objs = m.toObject();
        const names = objs.map((o) => o.name);
        assert.ok(names.includes('customField'));
        assert.ok(!names.includes('id'));
        assert.ok(!names.includes('blockType'));
        assert.ok(!names.includes('tag'));
        assert.ok(!names.includes('children'));
        assert.ok(!names.includes('permissions'));
        assert.ok(!names.includes('artifacts'));
        assert.ok(!names.includes('events'));
    });

    it('exposes a sorted permissions list copy', () => {
        const m = new BlockPropertiesModel({ permissions: ['Z', 'A', 'M'] });
        const list = m.getPermissionsList();
        assert.deepEqual(list, ['A', 'M', 'Z']);
        list.push('mutated');
        // Calling again should still return the original sorted list.
        assert.deepEqual(m.getPermissionsList(), ['A', 'M', 'Z']);
    });

    it('returns [] when permissions is missing or non-array', () => {
        const a = new BlockPropertiesModel({});
        const b = new BlockPropertiesModel({ permissions: 'OWNER' });
        assert.deepEqual(a.getPermissionsList(), []);
        assert.deepEqual(b.getPermissionsList(), []);
    });
});
