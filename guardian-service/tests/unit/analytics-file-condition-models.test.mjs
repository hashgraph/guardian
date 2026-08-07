import assert from 'node:assert/strict';
import { FileModel } from '../../dist/analytics/compare/models/file.model.js';
import { ConditionModel } from '../../dist/analytics/compare/models/condition.model.js';

const opts = { propLvl: 'All', keyLvl: 'Default', idLvl: 'All' };

describe('FileModel', () => {
    it('captures uuid and stores hashed data on construction', () => {
        const f = new FileModel({ uuid: 'a-1', data: 'payload' }, opts);
        assert.equal(f.uuid, 'a-1');
        assert.ok(typeof f.data === 'string' && f.data.length > 0);
        // The data is hashed, not the raw input.
        assert.notEqual(f.data, 'payload');
    });

    it('produces a non-empty weight after construction (via update)', () => {
        const f = new FileModel({ uuid: 'a-1', data: 'payload' }, opts);
        const h = f.hash();
        assert.ok(typeof h === 'string' && h.length > 0);
    });

    it('two files with the same uuid+data produce the same hash', () => {
        const a = new FileModel({ uuid: 'a-1', data: 'payload' }, opts);
        const b = new FileModel({ uuid: 'a-1', data: 'payload' }, opts);
        assert.equal(a.hash(), b.hash());
    });

    it('files with the same uuid but different data produce different hashes', () => {
        const a = new FileModel({ uuid: 'a-1', data: 'payload-1' }, opts);
        const b = new FileModel({ uuid: 'a-1', data: 'payload-2' }, opts);
        assert.notEqual(a.hash(), b.hash());
    });

    it('equal() compares the computed weight when present', () => {
        const a = new FileModel({ uuid: 'a-1', data: 'payload' }, opts);
        const b = new FileModel({ uuid: 'a-1', data: 'payload' }, opts);
        const c = new FileModel({ uuid: 'b-1', data: 'payload' }, opts);
        assert.equal(a.equal(b), true);
        assert.equal(a.equal(c), false);
    });

    it('toObject returns {uuid, data:hashed}', () => {
        const f = new FileModel({ uuid: 'a-1', data: 'payload' }, opts);
        const obj = f.toObject();
        assert.equal(obj.uuid, 'a-1');
        assert.equal(obj.data, f.data);
    });

    describe('FileModel.fromEntity', () => {
        it('throws "Unknown artifact" for missing input', () => {
            assert.throws(() => FileModel.fromEntity(null, opts), /Unknown artifact/);
            assert.throws(() => FileModel.fromEntity(undefined, opts), /Unknown artifact/);
        });

        it('returns a populated FileModel for valid input', () => {
            const f = FileModel.fromEntity({ uuid: 'x', data: 'd' }, opts);
            assert.equal(f.uuid, 'x');
            assert.ok(f.hash().length > 0);
        });
    });
});

describe('ConditionModel — single field/value form', () => {
    const fakeField = (name) => ({
        name,
        _condition: '',
        setCondition(c) { this._condition = c; },
    });

    it('captures field, fieldValue, and exposes name from field', () => {
        const f = fakeField('status');
        const c = new ConditionModel({
            field: f,
            fieldValue: 'APPROVED',
            thenFields: [],
            elseFields: [],
        });
        assert.equal(c.name, 'status');
        assert.equal(c.field, f);
        assert.equal(c.fieldValue, 'APPROVED');
    });

    it('writes a "<name> = \'<value>\'" condition on each then-field', () => {
        const f = fakeField('status');
        const t1 = fakeField('amount');
        const t2 = fakeField('reason');
        new ConditionModel({
            field: f,
            fieldValue: 'APPROVED',
            thenFields: [t1, t2],
            elseFields: [],
        });
        assert.equal(t1._condition, "status = 'APPROVED'");
        assert.equal(t2._condition, "status = 'APPROVED'");
    });

    it('writes a NOT(...) condition on each else-field', () => {
        const f = fakeField('status');
        const e1 = fakeField('reject');
        new ConditionModel({
            field: f,
            fieldValue: 'APPROVED',
            thenFields: [],
            elseFields: [e1],
        });
        assert.equal(e1._condition, "NOT(status = 'APPROVED')");
    });

    it('aggregates then- and else-fields into the .fields array', () => {
        const f = fakeField('status');
        const t = fakeField('a');
        const e = fakeField('b');
        const c = new ConditionModel({
            field: f,
            fieldValue: 'X',
            thenFields: [t],
            elseFields: [e],
        });
        assert.equal(c.fields.length, 2);
        assert.equal(c.fields[0], t);
        assert.equal(c.fields[1], e);
    });
});

describe('ConditionModel — predicate form', () => {
    const fakeField = (name) => ({
        name,
        _condition: '',
        setCondition(c) { this._condition = c; },
    });

    it('joins predicates with the supplied operator', () => {
        const t = fakeField('out');
        new ConditionModel({
            predicates: [
                { field: { name: 'a' }, value: 'X' },
                { field: { name: 'b' }, value: 'Y' },
            ],
            operator: 'OR',
            thenFields: [t],
            elseFields: [],
        });
        assert.equal(t._condition, "(a = 'X') OR (b = 'Y')");
    });

    it('defaults the operator to AND when not provided', () => {
        const t = fakeField('out');
        new ConditionModel({
            predicates: [
                { field: { name: 'a' }, value: 'X' },
                { field: { name: 'b' }, value: 'Y' },
            ],
            thenFields: [t],
            elseFields: [],
        });
        assert.equal(t._condition, "(a = 'X') AND (b = 'Y')");
    });

    it('wraps the joined expression in NOT(...) for else-fields', () => {
        const e = fakeField('out');
        new ConditionModel({
            predicates: [{ field: { name: 'a' }, value: 'X' }],
            thenFields: [],
            elseFields: [e],
        });
        assert.equal(e._condition, "NOT((a = 'X'))");
    });

    it('emits "" when there are no predicates and no field/value', () => {
        const t = fakeField('out');
        new ConditionModel({
            predicates: [],
            thenFields: [t],
            elseFields: [],
        });
        assert.equal(t._condition, '');
    });

    it('name is null when no field is supplied', () => {
        const c = new ConditionModel({
            predicates: [{ field: { name: 'a' }, value: 'X' }],
            thenFields: [],
            elseFields: [],
        });
        assert.equal(c.name, null);
    });
});
