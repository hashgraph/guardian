import assert from 'node:assert/strict';
import { ArtifactModel } from '../../dist/analytics/compare/models/artifact.model.js';
import { FileModel } from '../../dist/analytics/compare/models/file.model.js';
import { EventModel } from '../../dist/analytics/compare/models/event.model.js';

const opts = (overrides = {}) => ({ propLvl: 'All', keyLvl: 'Default', idLvl: 'All', eventLvl: 'All', ...overrides });

describe('ArtifactModel', () => {
    const raw = (extra = {}) => ({ name: 'doc.pdf', uuid: 'u-1', type: 'pdf', extention: 'pdf', ...extra });

    it('maps json (note extention->extension typo source key)', () => {
        const a = new ArtifactModel(raw());
        assert.equal(a.name, 'doc.pdf');
        assert.equal(a.uuid, 'u-1');
        assert.equal(a.type, 'pdf');
        assert.equal(a.extension, 'pdf');
    });

    it('key getter is always null', () => {
        assert.equal(new ArtifactModel(raw()).key, null);
    });

    it('weight undefined before update', () => {
        assert.equal(new ArtifactModel(raw()).weight, undefined);
    });

    it('update with propLvl=All sets a non-empty weight', () => {
        const a = new ArtifactModel(raw());
        a.update('filehash', opts({ propLvl: 'All' }));
        assert.ok(a.weight.length > 0);
    });

    it('update with propLvl != All blanks the weight but keeps internal hash', () => {
        const a = new ArtifactModel(raw());
        a.update('filehash', opts({ propLvl: 'None' }));
        assert.equal(a.weight, '');
        assert.ok(a.toWeight(opts()).weight.length > 0);
    });

    it('equal compares the internal hash (independent of propLvl)', () => {
        const a = new ArtifactModel(raw());
        const b = new ArtifactModel(raw());
        a.update('data', opts({ propLvl: 'None' }));
        b.update('data', opts({ propLvl: 'All' }));
        assert.equal(a.equal(b), true);
    });

    it('different file data yields unequal hashes', () => {
        const a = new ArtifactModel(raw());
        const b = new ArtifactModel(raw());
        a.update('data1', opts());
        b.update('data2', opts());
        assert.equal(a.equal(b), false);
    });

    it('equalKey always true (keys are null)', () => {
        assert.equal(new ArtifactModel(raw()).equalKey(new ArtifactModel(raw({ name: 'other' }))), true);
    });

    it('toObject includes uuid/name/type/extension/weight', () => {
        const a = new ArtifactModel(raw());
        a.update('d', opts());
        const o = a.toObject();
        assert.equal(o.uuid, 'u-1');
        assert.equal(o.extension, 'pdf');
        assert.ok('weight' in o);
    });
});

describe('FileModel', () => {
    const raw = (extra = {}) => ({ uuid: 'f-1', data: 'payload', ...extra });

    it('stores uuid and a sha256 of the data', () => {
        const f = new FileModel(raw(), opts());
        assert.equal(f.uuid, 'f-1');
        assert.equal(typeof f.data, 'string');
        assert.ok(f.data.length > 0);
    });

    it('computes a weight on construction', () => {
        const f = new FileModel(raw(), opts());
        assert.ok(f.hash(opts()).length > 0);
    });

    it('same uuid+data -> equal', () => {
        const a = new FileModel(raw(), opts());
        const b = new FileModel(raw(), opts());
        assert.equal(a.equal(b), true);
    });

    it('same uuid different data -> unequal', () => {
        const a = new FileModel(raw({ data: 'x' }), opts());
        const b = new FileModel(raw({ data: 'y' }), opts());
        assert.equal(a.equal(b), false);
    });

    it('toObject returns {uuid, data}', () => {
        const f = new FileModel(raw(), opts());
        const o = f.toObject();
        assert.equal(o.uuid, 'f-1');
        assert.ok('data' in o);
    });

    it('fromEntity builds a model', () => {
        const f = FileModel.fromEntity(raw(), opts());
        assert.ok(f instanceof FileModel);
    });

    it('fromEntity throws on null', () => {
        assert.throws(() => FileModel.fromEntity(null, opts()), /Unknown artifact/);
    });
});

describe('EventModel', () => {
    const raw = (extra = {}) => ({
        actor: 'OWNER', disabled: false, input: 'RunEvent', output: 'RefreshEvent',
        source: 'blockA', target: 'blockB', ...extra,
    });

    it('copies all json fields', () => {
        const e = new EventModel(raw());
        assert.equal(e.actor, 'OWNER');
        assert.equal(e.source, 'blockA');
        assert.equal(e.target, 'blockB');
    });

    it('key getter is null; weight undefined before update', () => {
        const e = new EventModel(raw());
        assert.equal(e.key, null);
        assert.equal(e.weight, undefined);
    });

    it('eventLvl=Simple uses source/target tags as endpoints', () => {
        const e = new EventModel(raw());
        e.update({}, opts({ eventLvl: 'Simple' }));
        const o = e.toObject();
        assert.equal(o.startWeight, 'blockA');
        assert.equal(o.endWeight, 'blockB');
    });

    it('eventLvl=None uses "undefined" endpoints and blanks the weight', () => {
        const e = new EventModel(raw());
        e.update({}, opts({ eventLvl: 'None' }));
        assert.equal(e.weight, '');
        const o = e.toObject();
        assert.equal(o.startWeight, 'undefined');
    });

    it('eventLvl=All resolves block weights from the map', () => {
        const e = new EventModel(raw());
        const map = {
            blockA: { getWeight: () => 'wA' },
            blockB: { getWeight: () => 'wB' },
        };
        e.update(map, opts({ eventLvl: 'All' }));
        const o = e.toObject();
        assert.equal(o.startWeight, 'wA');
        assert.equal(o.endWeight, 'wB');
        assert.ok(e.weight.length > 0);
    });

    it('eventLvl=All with missing blocks falls back to "undefined"', () => {
        const e = new EventModel(raw());
        e.update({}, opts({ eventLvl: 'All' }));
        const o = e.toObject();
        assert.equal(o.startWeight, 'undefined');
        assert.equal(o.endWeight, 'undefined');
    });

    it('equal compares the internal hash', () => {
        const a = new EventModel(raw());
        const b = new EventModel(raw());
        a.update({}, opts({ eventLvl: 'Simple' }));
        b.update({}, opts({ eventLvl: 'Simple' }));
        assert.equal(a.equal(b), true);
    });

    it('different actors produce unequal events', () => {
        const a = new EventModel(raw({ actor: 'OWNER' }));
        const b = new EventModel(raw({ actor: 'ISSUER' }));
        a.update({}, opts({ eventLvl: 'Simple' }));
        b.update({}, opts({ eventLvl: 'Simple' }));
        assert.equal(a.equal(b), false);
    });

    it('toWeight returns the internal hash even when eventLvl blanks the public weight', () => {
        const e = new EventModel(raw());
        e.update({}, opts({ eventLvl: 'None' }));
        assert.equal(e.weight, '');
        assert.ok(e.toWeight(opts()).weight.length > 0);
    });

    it('toObject carries the documented event shape', () => {
        const e = new EventModel(raw());
        e.update({}, opts({ eventLvl: 'Simple' }));
        const o = e.toObject();
        for (const k of ['actor', 'source', 'target', 'input', 'output', 'disabled', 'weight', 'startWeight', 'endWeight']) {
            assert.ok(k in o, `missing ${k}`);
        }
    });
});
