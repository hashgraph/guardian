import assert from 'node:assert/strict';
import { PresetPath } from '../dist/helpers/preset-path.js';

// Target schema fields: dataAndParameters[] { location, values[] { v } }, owner { name }
const targetFields = [
    { name: 'dataAndParameters', isRef: true, isArray: true, fields: [
        { name: 'location', isRef: false, isArray: false },
        { name: 'values', isRef: true, isArray: true, fields: [{ name: 'v', isRef: false, isArray: false }] },
    ] },
    { name: 'owner', isRef: true, isArray: false, fields: [{ name: 'name', isRef: false, isArray: false }] },
    { name: 'tags', isRef: false, isArray: true },
];

const source = {
    projectLocations: [
        { location: 'A', measurements: [{ s: 'a1' }, { s: 'a2' }] },
        { location: 'B', measurements: [{ s: 'b1' }] },
    ],
    company: { name: 'ACME', address: { city: 'Rome' } },
};

describe('PresetPath', () => {
    it('detects nested mappings; plain names stay on the old path', () => {
        assert.equal(PresetPath.isNested({ name: 'a', value: 'b' }), false);
        assert.equal(PresetPath.isNested({ name: 'a', value: 'b.c' }), true);
        assert.equal(PresetPath.isNested({ name: 'a.b', value: 'c' }), true);
        assert.equal(PresetPath.root('a.b.c'), 'a');
    });

    it('reads nested objects', () => {
        assert.equal(PresetPath.read(source, 'company.address.city'), 'Rome');
        assert.equal(PresetPath.read(source, 'company.missing.city'), undefined);
        assert.equal(PresetPath.read(null, 'a.b'), undefined);
    });

    it('reads through arrays, one nesting level per array', () => {
        assert.deepEqual(PresetPath.read(source, 'projectLocations.location'), ['A', 'B']);
        assert.deepEqual(PresetPath.read(source, 'projectLocations.measurements.s'), [['a1', 'a2'], ['b1']]);
    });

    it('flattens a deeper source to a shallower target ([][].s to [].s)', () => {
        const m = { name: 'tags', value: 'projectLocations.measurements.s', nameLevel: 1, valueLevel: 2 };
        assert.deepEqual(PresetPath.sourceValue(source, m), ['a1', 'a2', 'b1']);
        // equal levels keep the shape, missing levels never flatten
        assert.deepEqual(
            PresetPath.sourceValue(source, { name: 'x.y', value: 'projectLocations.measurements.s', nameLevel: 2, valueLevel: 2 }),
            [['a1', 'a2'], ['b1']]
        );
        assert.deepEqual(
            PresetPath.sourceValue(source, { name: 'x.y', value: 'projectLocations.measurements.s' }),
            [['a1', 'a2'], ['b1']]
        );
    });

    it('rejects a source with fewer arrays than the target', () => {
        assert.equal(PresetPath.isCompatible({ name: 'a.b', value: 'c.d', nameLevel: 1, valueLevel: 0 }), false);
        assert.equal(PresetPath.isCompatible({ name: 'a.b', value: 'c.d', nameLevel: 1, valueLevel: 2 }), true);
        assert.equal(PresetPath.isCompatible({ name: 'a.b', value: 'c.d' }), true);
    });

    it('writes into array entries by index, creating them from the value', () => {
        const doc = {};
        const m = { name: 'dataAndParameters.location', value: 'projectLocations.location', nameLevel: 1, valueLevel: 1 };
        assert.equal(PresetPath.write(doc, targetFields, m.name, PresetPath.sourceValue(source, m)), true);
        assert.deepEqual(doc, { dataAndParameters: [{ location: 'A' }, { location: 'B' }] });
    });

    it('writes nested arrays and merges several mappings into the same entries', () => {
        const doc = {};
        PresetPath.write(doc, targetFields, 'dataAndParameters.location', ['A', 'B']);
        PresetPath.write(doc, targetFields, 'dataAndParameters.values.v', [['a1', 'a2'], ['b1']]);
        assert.deepEqual(doc, {
            dataAndParameters: [
                { location: 'A', values: [{ v: 'a1' }, { v: 'a2' }] },
                { location: 'B', values: [{ v: 'b1' }] },
            ],
        });
    });

    it('writes nested objects and rejects paths that do not fit the schema', () => {
        const doc = {};
        assert.equal(PresetPath.write(doc, targetFields, 'owner.name', 'ACME'), true);
        assert.deepEqual(doc, { owner: { name: 'ACME' } });
        assert.equal(PresetPath.write({}, targetFields, 'tags.x', 1), false);
        assert.equal(PresetPath.write({}, targetFields, 'unknown.x', 1), false);
        assert.equal(PresetPath.write({}, targetFields, 'dataAndParameters.location', 'not-an-array'), false);
    });

    it('readonly round trip: what the form fills reads back equal to the source', () => {
        const m = { name: 'dataAndParameters.location', value: 'projectLocations.location', nameLevel: 1, valueLevel: 1, readonly: true };
        const filled = {};
        PresetPath.write(filled, targetFields, m.name, PresetPath.sourceValue(source, m));
        assert.deepEqual(PresetPath.read(filled, m.name), PresetPath.sourceValue(source, m));
        // an entry added or removed by the user no longer matches
        const tampered = { dataAndParameters: [{ location: 'A' }] };
        assert.notDeepEqual(PresetPath.read(tampered, m.name), PresetPath.sourceValue(source, m));
    });
});

describe('PresetPath.withoutSystemKeys', () => {
    const field = {
        name: 'projectLocations', isRef: true, isArray: true, context: { type: 'Loc' },
        fields: [{ name: 'location', isRef: false }, { name: 'area', isRef: true, context: { type: 'Area' }, fields: [{ name: 'size', isRef: false }] }],
    };

    it('makes a stamped submitted document equal to the stored preset', () => {
        const submitted = [{ location: 'A', type: 'NewLoc', '@context': ['ctx:new'], area: { size: 1, type: 'NewArea', '@context': ['x'] } }];
        const preset = [{ location: 'A', type: 'OldLoc', area: { size: 1, type: 'OldArea' } }];
        assert.deepEqual(PresetPath.withoutSystemKeys(submitted, field), PresetPath.withoutSystemKeys(preset, field));
    });

    it('still detects a changed data value', () => {
        const submitted = [{ location: 'B', type: 'NewLoc', '@context': ['ctx:new'] }];
        const preset = [{ location: 'A', type: 'OldLoc' }];
        assert.notDeepEqual(PresetPath.withoutSystemKeys(submitted, field), PresetPath.withoutSystemKeys(preset, field));
    });

    it('keeps a type the sub-schema declares as its own field, and GeoJSON type', () => {
        const own = { name: 'x', isRef: true, fields: [{ name: 'type', isRef: false }] };
        assert.deepEqual(PresetPath.withoutSystemKeys({ type: 'k', '@context': ['c'] }, own), { type: 'k' });
        const geo = { name: 'g', isRef: true, context: { type: 'GeoJSON' }, fields: [] };
        assert.deepEqual(PresetPath.withoutSystemKeys({ type: 'Point', '@context': 'c' }, geo), { type: 'Point' });
    });

    it('leaves primitives and unknown fields untouched', () => {
        assert.equal(PresetPath.withoutSystemKeys('a', { name: 'a', isRef: false }), 'a');
        assert.deepEqual(PresetPath.withoutSystemKeys({ a: 1 }, null), { a: 1 });
    });

    it('finds a field by dotted path', () => {
        assert.equal(PresetPath.findField([field], 'projectLocations.area.size').name, 'size');
        assert.equal(PresetPath.findField([field], 'projectLocations.nope'), null);
    });
});
