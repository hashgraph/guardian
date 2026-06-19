import assert from 'node:assert/strict';
import { BlocksRate } from '../../dist/analytics/compare/rates/blocks-rate.js';
import { RecordRate } from '../../dist/analytics/compare/rates/record-rate.js';

const opts = (overrides = {}) => ({
    propLvl: 'All',
    keyLvl: 'Default',
    idLvl: 'All',
    eventLvl: 'All',
    ...overrides,
});

const prop = (name, path, value) => ({
    name,
    path,
    lvl: 1,
    value,
    equal(other) { return this.value === other.value; },
    ignore() { return false; },
    getPropList() { return []; },
    toObject() { return { name, path, value }; },
});

const event = (label) => ({
    label,
    equal(other) { return this.label === other.label; },
    toObject() { return { label }; },
});

const artifact = (uuid) => ({
    uuid,
    equal(other) { return this.uuid === other.uuid; },
    toObject() { return { uuid }; },
});

const fakeBlock = (overrides = {}) => ({
    blockType: 'tool',
    tag: 'demo',
    index: 0,
    props: overrides.props || [],
    events: overrides.events || [],
    permissions: overrides.permissions || [],
    artifacts: overrides.artifacts || [],
    getPropList() { return this.props; },
    getEventList() { return this.events; },
    getPermissionsList() { return this.permissions; },
    getArtifactsList() { return this.artifacts; },
    ...overrides,
});

describe('BlocksRate construction', () => {
    it('captures blockType from the left side', () => {
        const a = fakeBlock({ blockType: 'tool', tag: 'a' });
        const b = fakeBlock({ blockType: 'module', tag: 'b' });
        const r = new BlocksRate(a, b);
        assert.equal(r.blockType, 'tool');
    });

    it('falls back to the right blockType when left is missing', () => {
        const b = fakeBlock({ blockType: 'module', tag: 'b' });
        const r = new BlocksRate(null, b);
        assert.equal(r.blockType, 'module');
    });

    it('throws "Empty block model" when both sides are null', () => {
        assert.throws(() => new BlocksRate(null, null), /Empty block model/);
    });

    it('all rate fields start at -1', () => {
        const r = new BlocksRate(fakeBlock(), fakeBlock());
        assert.equal(r.indexRate, -1);
        assert.equal(r.propertiesRate, -1);
        assert.equal(r.eventsRate, -1);
        assert.equal(r.permissionsRate, -1);
        assert.equal(r.artifactsRate, -1);
    });
});

describe('BlocksRate.calc — both blocks', () => {
    it('100% rate when blocks share index, props, perms, events, artifacts', () => {
        const a = fakeBlock({
            index: 1,
            tag: 'A',
            props: [prop('p', 'p', 1)],
            events: [event('e1')],
            permissions: ['OWNER'],
            artifacts: [artifact('u1')],
        });
        const b = fakeBlock({
            index: 1,
            tag: 'A',
            props: [prop('p', 'p', 1)],
            events: [event('e1')],
            permissions: ['OWNER'],
            artifacts: [artifact('u1')],
        });
        const r = new BlocksRate(a, b);
        r.calc(opts());
        assert.equal(r.indexRate, 100);
        assert.equal(r.propertiesRate, 100);
        assert.equal(r.totalRate, 100);
    });

    it('indexRate=0 when block indexes differ', () => {
        const a = fakeBlock({ index: 1 });
        const b = fakeBlock({ index: 2 });
        const r = new BlocksRate(a, b);
        r.calc(opts());
        assert.equal(r.indexRate, 0);
    });

    it('skips properties/permissions/artifacts when propLvl=None', () => {
        const a = fakeBlock({ index: 1, props: [prop('p', 'p', 1)] });
        const b = fakeBlock({ index: 1, props: [prop('p', 'p', 2)] });
        const r = new BlocksRate(a, b);
        r.calc(opts({ propLvl: 'None' }));
        // total includes only events at this point; with no events the rate folds to 100.
        // Either way: propertiesRate is computed but not folded into totalRate.
        assert.notEqual(r.totalRate, r.propertiesRate);
    });

    it('does not throw when only one side is present (returns early)', () => {
        const r = new BlocksRate(fakeBlock(), null);
        r.calc(opts());
        assert.equal(r.indexRate, -1);
    });
});

describe('BlocksRate.getSubRate / getRateValue', () => {
    it('getSubRate returns the named array', () => {
        const a = fakeBlock();
        const b = fakeBlock();
        const r = new BlocksRate(a, b);
        r.calc(opts());
        assert.equal(r.getSubRate('properties'), r.properties);
        assert.equal(r.getSubRate('events'), r.events);
        assert.equal(r.getSubRate('permissions'), r.permissions);
        assert.equal(r.getSubRate('artifacts'), r.artifacts);
        assert.equal(r.getSubRate('unknown'), null);
    });

    it('getRateValue returns the named scalar rate', () => {
        const a = fakeBlock({ index: 1 });
        const b = fakeBlock({ index: 1 });
        const r = new BlocksRate(a, b);
        r.calc(opts());
        assert.equal(r.getRateValue('index'), r.indexRate);
        assert.equal(r.getRateValue('properties'), r.propertiesRate);
        assert.equal(r.getRateValue('events'), r.eventsRate);
        assert.equal(r.getRateValue('permissions'), r.permissionsRate);
        assert.equal(r.getRateValue('artifacts'), r.artifactsRate);
        assert.equal(r.getRateValue('total'), r.totalRate);
    });
});

describe('BlocksRate.setChildren / getChildren', () => {
    it('roundtrips children', () => {
        const r = new BlocksRate(fakeBlock(), fakeBlock());
        const kids = [{ totalRate: 80 }];
        r.setChildren(kids);
        assert.equal(r.getChildren(), kids);
    });
});

describe('RecordRate', () => {
    it('starts with totalRate=-1 (default Rate)', () => {
        const r = new RecordRate({}, {});
        assert.equal(r.totalRate, -1);
    });

    it('calc() sets totalRate=100 unconditionally', () => {
        const r = new RecordRate({}, {});
        r.calc(opts());
        assert.equal(r.totalRate, 100);
    });

    it('roundtrips children via setChildren/getChildren', () => {
        const r = new RecordRate({}, {});
        const kids = [{ totalRate: 90 }];
        r.setChildren(kids);
        assert.equal(r.getChildren(), kids);
    });

    it('getSubRate(any) returns null', () => {
        const r = new RecordRate({}, {});
        assert.equal(r.getSubRate('x'), null);
    });

    it('getRateValue(any) returns totalRate', () => {
        const r = new RecordRate({}, {});
        r.calc(opts());
        assert.equal(r.getRateValue('whatever'), 100);
    });
});
