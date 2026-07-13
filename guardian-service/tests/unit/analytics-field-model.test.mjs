import assert from 'node:assert/strict';
import { FieldModel } from '../../dist/analytics/compare/models/field.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

describe('FieldModel scalar parsing', () => {
    it('captures name, title, description, type, format, pattern', () => {
        const f = new FieldModel('amount', {
            type: 'number',
            title: 'Amount',
            description: 'how much',
            format: 'float',
            pattern: '^[0-9]+$',
        }, true);
        assert.equal(f.name, 'amount');
        assert.equal(f.title, 'Amount');
        assert.equal(f.description, 'how much');
        assert.equal(f.type, 'number');
        assert.equal(f.format, 'float');
        assert.equal(f.pattern, '^[0-9]+$');
        assert.equal(f.required, true);
    });

    it('falls back to name when title/description are missing', () => {
        const f = new FieldModel('amount', { type: 'number' }, false);
        assert.equal(f.title, 'amount');
        assert.equal(f.description, 'amount');
    });

    it('flags isArray=true and unwraps the items shape', () => {
        const f = new FieldModel('list', {
            type: 'array',
            items: { type: 'string', format: 'date' },
        }, false);
        assert.equal(f.isArray, true);
        assert.equal(f.type, 'string');
        assert.equal(f.format, 'date');
    });

    it('flags isRef=true and stores $ref as the type', () => {
        const f = new FieldModel('inner', { $ref: '#/$defs/Inner' }, false);
        assert.equal(f.isRef, true);
        assert.equal(f.type, '#/$defs/Inner');
    });

    it('captures readOnly flag and enum array', () => {
        const f = new FieldModel('status', {
            type: 'string',
            readOnly: true,
            enum: ['A', 'B', 'C'],
        }, false);
        assert.equal(f.readOnly, true);
        assert.deepEqual(f.enum, ['A', 'B', 'C']);
    });

    it('treats oneOf as a 1-element schema (uses oneOf[0])', () => {
        const f = new FieldModel('x', { oneOf: [{ type: 'string', title: 'Picked' }] }, false);
        assert.equal(f.type, 'string');
        assert.equal(f.title, 'Picked');
    });
});

describe('FieldModel comment parsing', () => {
    it('extracts unit/unitSystem/customType/property/order from a JSON $comment', () => {
        const f = new FieldModel('amount', {
            type: 'number',
            $comment: JSON.stringify({
                unit: 'kg',
                unitSystem: 'metric',
                customType: 'mass',
                orderPosition: 3,
                property: 'someProperty',
            }),
        }, false);
        assert.equal(f.unit, 'kg');
        assert.equal(f.unitSystem, 'metric');
        assert.equal(f.customType, 'mass');
        assert.equal(f.property, 'someProperty');
        assert.equal(f.order, 3);
        assert.equal(f.index, 3);
    });

    it('order falls back to -1 when orderPosition is not finite or negative', () => {
        const f = new FieldModel('x', { type: 'string', $comment: JSON.stringify({ orderPosition: -2 }) }, false);
        assert.equal(f.order, -1);
        assert.equal(f.index, null);
    });

    it('handles a malformed JSON $comment by leaving the fields null', () => {
        const f = new FieldModel('x', { type: 'string', $comment: '{not json' }, false);
        assert.equal(f.unit, null);
        assert.equal(f.customType, null);
        assert.equal(f.order, -1);
    });

    it('handles a missing $comment by leaving the fields null', () => {
        const f = new FieldModel('x', { type: 'string' }, false);
        assert.equal(f.unit, null);
        assert.equal(f.customType, null);
    });
});

describe('FieldModel.equal / equalKey', () => {
    it('falls back to name comparison when un-updated', () => {
        const a = new FieldModel('x', { type: 'number' }, false);
        const b = new FieldModel('x', { type: 'number' }, false);
        const c = new FieldModel('y', { type: 'number' }, false);
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('compares strongest weight after calcBaseWeight()', () => {
        const a = new FieldModel('x', { type: 'number', description: 'A' }, false);
        const b = new FieldModel('x', { type: 'number', description: 'A' }, false);
        const c = new FieldModel('x', { type: 'number', description: 'B' }, false);
        a.update(opts); b.update(opts); c.update(opts);
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('equalKey() compares by .key (which is null at the base class)', () => {
        const a = new FieldModel('x', { type: 'number' }, false);
        const b = new FieldModel('y', { type: 'number' }, false);
        // Both keys are null → equalKey returns true.
        assert.equal(a.equalKey(b), true);
    });
});

describe('FieldModel.toObject', () => {
    it('exposes every documented field on the output object', () => {
        const f = new FieldModel('amount', {
            type: 'number',
            title: 'Amount',
            description: 'how much',
            format: 'float',
            pattern: '^[0-9]+$',
            readOnly: true,
        }, true);
        const obj = f.toObject();
        for (const k of [
            'name', 'title', 'description', 'type', 'format', 'pattern',
            'isArray', 'isRef', 'readOnly', 'required', 'enum', 'order'
        ]) {
            assert.ok(k in obj, `toObject missing ${k}`);
        }
        assert.equal(obj.required, true);
    });
});

describe('FieldModel.getPropList', () => {
    it('emits AnyPropertyModel entries for each non-null attribute', () => {
        const f = new FieldModel('amount', {
            type: 'number',
            title: 'Amount',
            description: 'how much',
            $comment: JSON.stringify({ unit: 'kg', orderPosition: 1 }),
        }, true);
        const list = f.getPropList();
        const names = list.map((p) => p.name);
        assert.ok(names.includes('name'));
        assert.ok(names.includes('title'));
        assert.ok(names.includes('description'));
        assert.ok(names.includes('type'));
        assert.ok(names.includes('unit'));
        assert.ok(names.includes('order'));
    });

    it('emits an enum block (ArrayPropertyModel + per-element AnyPropertyModel)', () => {
        const f = new FieldModel('status', { type: 'string', enum: ['A', 'B'] }, false);
        const list = f.getPropList();
        const enumProp = list.find((p) => p.name === 'enum');
        const a = list.find((p) => p.name === '0');
        const b = list.find((p) => p.name === '1');
        assert.ok(enumProp);
        assert.ok(a);
        assert.ok(b);
        assert.equal(a.value, 'A');
        assert.equal(b.value, 'B');
    });
});

describe('FieldModel.setSubSchema / setCondition', () => {
    it('exposes the children of the attached sub-schema', () => {
        const f = new FieldModel('inner', { $ref: '#/$defs/Inner' }, false);
        const fakeSubSchema = { fields: [{ name: 'a' }, { name: 'b' }], update() {} };
        f.setSubSchema(fakeSubSchema);
        assert.deepEqual(f.children, fakeSubSchema.fields);
    });

    it('exposes the condition string set via setCondition()', () => {
        const f = new FieldModel('x', { type: 'string' }, false);
        f.setCondition("status = 'X'");
        assert.equal(f.condition, "status = 'X'");
    });
});

describe('FieldModel.getField', () => {
    it('returns null for an empty path', () => {
        const f = new FieldModel('x', { type: 'string' }, false);
        assert.equal(f.getField(''), null);
    });
});
