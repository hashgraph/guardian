import assert from 'node:assert/strict';
import { Rate } from '../../dist/analytics/compare/rates/rate.js';
import { ObjectRate } from '../../dist/analytics/compare/rates/object-rate.js';
import { FieldsRate } from '../../dist/analytics/compare/rates/fields-rate.js';
import { PropertiesRate } from '../../dist/analytics/compare/rates/properties-rate.js';
import { PermissionsRate } from '../../dist/analytics/compare/rates/permissions-rate.js';
import { EventsRate } from '../../dist/analytics/compare/rates/events-rate.js';
import { ArtifactsRate } from '../../dist/analytics/compare/rates/artifacts-rate.js';
import { RootRate } from '../../dist/analytics/compare/rates/root-rate.js';
import { RecordRate } from '../../dist/analytics/compare/rates/record-rate.js';
import { AnyPropertyModel, UUIDPropertyModel } from '../../dist/analytics/compare/models/property.model.js';
import { FieldModel } from '../../dist/analytics/compare/models/field.model.js';

const opts = (overrides = {}) => ({ propLvl: 'All', keyLvl: 'Default', idLvl: 'All', ...overrides });
const field = (name, extra = {}) => new FieldModel(name, { type: 'string', title: name, description: name, ...extra }, false);

describe('Rate base class', () => {
    it('initializes type NONE, totalRate -1', () => {
        const r = new Rate({}, {});
        assert.equal(r.type, 'NONE');
        assert.equal(r.totalRate, -1);
    });

    it('getChildren default empty, getSubRate null', () => {
        const r = new Rate('a', 'b');
        assert.deepEqual(r.getChildren(), []);
        assert.equal(r.getSubRate('x'), null);
    });

    it('getRateValue returns totalRate', () => {
        const r = new Rate('a', 'b');
        r.totalRate = 73;
        assert.equal(r.getRateValue('anything'), 73);
    });

    it('toObject serializes left/right via toObject', () => {
        const left = { toObject: () => ({ id: 'L' }) };
        const right = { toObject: () => ({ id: 'R' }) };
        const r = new Rate(left, right);
        const o = r.toObject();
        assert.deepEqual(o.items, [{ id: 'L' }, { id: 'R' }]);
    });

    it('toObject tolerates null sides', () => {
        const r = new Rate(null, null);
        assert.deepEqual(r.toObject().items, [undefined, undefined]);
    });

    it('total with no children equals totalRate', () => {
        const r = new Rate('a', 'b');
        r.totalRate = 80;
        assert.equal(r.total(), 80);
    });

    it('setChildren is a no-op on the base', () => {
        const r = new Rate('a', 'b');
        r.setChildren([1, 2]);
        assert.deepEqual(r.getChildren(), []);
    });
});

describe('PermissionsRate', () => {
    it('equal permissions yield FULL/100', () => {
        const r = new PermissionsRate('admin', 'admin');
        assert.equal(r.type, 'FULL');
        assert.equal(r.totalRate, 100);
    });

    it('left-only is LEFT/-1', () => {
        const r = new PermissionsRate('admin', null);
        assert.equal(r.type, 'LEFT');
        assert.equal(r.totalRate, -1);
    });

    it('right-only is RIGHT/-1', () => {
        const r = new PermissionsRate(null, 'admin');
        assert.equal(r.type, 'RIGHT');
        assert.equal(r.totalRate, -1);
    });

    it('both null treated as equal FULL', () => {
        const r = new PermissionsRate(null, null);
        assert.equal(r.type, 'FULL');
        assert.equal(r.totalRate, 100);
    });

    it('calc is a no-op and getSubRate null', () => {
        const r = new PermissionsRate('a', 'a');
        r.calc(opts());
        assert.equal(r.getSubRate('x'), null);
        assert.deepEqual(r.getChildren(), []);
    });

    it('toObject stores raw permission strings', () => {
        const r = new PermissionsRate('a', 'b');
        assert.deepEqual(r.toObject().items, ['a', 'b']);
    });

    it('total returns totalRate', () => {
        const r = new PermissionsRate('a', 'a');
        assert.equal(r.total(), 100);
    });
});

describe('EventsRate / ArtifactsRate', () => {
    it('EventsRate both present is FULL/100', () => {
        const r = new EventsRate({}, {});
        assert.equal(r.type, 'FULL');
        assert.equal(r.totalRate, 100);
    });

    it('EventsRate left-only LEFT', () => {
        const r = new EventsRate({}, null);
        assert.equal(r.type, 'LEFT');
    });

    it('EventsRate right-only RIGHT', () => {
        const r = new EventsRate(null, {});
        assert.equal(r.type, 'RIGHT');
    });

    it('ArtifactsRate both present FULL/100', () => {
        const r = new ArtifactsRate({}, {});
        assert.equal(r.type, 'FULL');
        assert.equal(r.totalRate, 100);
    });

    it('ArtifactsRate right-only RIGHT/-1', () => {
        const r = new ArtifactsRate(null, {});
        assert.equal(r.type, 'RIGHT');
        assert.equal(r.totalRate, -1);
    });
});

describe('RootRate', () => {
    it('constructs PARTLY/100 with null sides', () => {
        const r = new RootRate();
        assert.equal(r.type, 'PARTLY');
        assert.equal(r.totalRate, 100);
        assert.equal(r.left, null);
        assert.equal(r.right, null);
    });

    it('children round-trip', () => {
        const r = new RootRate();
        const kids = [new Rate('a', 'b')];
        r.setChildren(kids);
        assert.deepEqual(r.getChildren(), kids);
    });

    it('total aggregates child totals', () => {
        const r = new RootRate();
        const c = new Rate('a', 'b');
        c.totalRate = 50;
        r.setChildren([c]);
        assert.equal(r.total(), Math.floor((100 + 50) / 2));
    });
});

describe('RecordRate', () => {
    it('calc forces totalRate 100', () => {
        const r = new RecordRate({}, {});
        r.calc(opts());
        assert.equal(r.totalRate, 100);
    });

    it('children round-trip and getSubRate null', () => {
        const r = new RecordRate({}, {});
        r.setChildren(['x']);
        assert.deepEqual(r.getChildren(), ['x']);
        assert.equal(r.getSubRate('y'), null);
    });

    it('getRateValue returns totalRate after calc', () => {
        const r = new RecordRate({}, {});
        r.calc(opts());
        assert.equal(r.getRateValue('z'), 100);
    });
});

describe('PropertiesRate', () => {
    it('left-only is LEFT and stays -1 when not ignored', () => {
        const r = new PropertiesRate(new AnyPropertyModel('x', 'v'), null);
        r.calc(opts());
        assert.equal(r.type, 'LEFT');
        assert.equal(r.totalRate, -1);
    });

    it('right-only is RIGHT', () => {
        const r = new PropertiesRate(null, new AnyPropertyModel('x', 'v'));
        r.calc(opts());
        assert.equal(r.type, 'RIGHT');
    });

    it('equal scalar properties yield FULL/100', () => {
        const a = new AnyPropertyModel('x', 'v', 1, 'x');
        const b = new AnyPropertyModel('x', 'v', 1, 'x');
        const r = new PropertiesRate(a, b);
        r.calc(opts());
        assert.equal(r.type, 'FULL');
        assert.equal(r.totalRate, 100);
    });

    it('different scalar values yield PARTLY/0', () => {
        const a = new AnyPropertyModel('x', 'v1', 1, 'x');
        const b = new AnyPropertyModel('x', 'v2', 1, 'x');
        const r = new PropertiesRate(a, b);
        r.calc(opts());
        assert.equal(r.type, 'PARTLY');
        assert.equal(r.totalRate, 0);
    });

    it('UUID left-only with idLvl=None is ignored -> 100', () => {
        const a = new UUIDPropertyModel('id', 'A', 1, 'id');
        const r = new PropertiesRate(a, null);
        r.calc(opts({ idLvl: 'None' }));
        assert.equal(r.totalRate, -1);
    });

    it('copies name/path/lvl from the present side', () => {
        const a = new AnyPropertyModel('x', 'v', 2, 'a.x');
        const r = new PropertiesRate(a, null);
        assert.equal(r.name, 'x');
        assert.equal(r.path, 'a.x');
        assert.equal(r.lvl, 2);
    });

    it('right side used for metadata when left missing', () => {
        const b = new AnyPropertyModel('y', 'v', 3, 'b.y');
        const r = new PropertiesRate(null, b);
        assert.equal(r.name, 'y');
        assert.equal(r.lvl, 3);
    });

    it('getSubRate returns the properties array', () => {
        const a = new AnyPropertyModel('x', 'v');
        const r = new PropertiesRate(a, null);
        assert.ok(Array.isArray(r.getSubRate('x')));
    });

    it('toObject carries name/path/lvl and items', () => {
        const a = new AnyPropertyModel('x', 'v', 1, 'a.x');
        const b = new AnyPropertyModel('x', 'v', 1, 'a.x');
        const r = new PropertiesRate(a, b);
        r.calc(opts());
        const o = r.toObject();
        assert.equal(o.name, 'x');
        assert.equal(o.path, 'a.x');
        assert.equal(o.lvl, 1);
        assert.equal(o.items.length, 2);
    });

    it('total returns totalRate, getChildren empty', () => {
        const a = new AnyPropertyModel('x', 'v');
        const r = new PropertiesRate(a, a);
        r.calc(opts());
        assert.equal(r.total(), r.totalRate);
        assert.deepEqual(r.getChildren(), []);
    });
});

describe('ObjectRate', () => {
    it('both present, identical fields -> 100', () => {
        const a = field('amount');
        const b = field('amount');
        const r = new ObjectRate(a, b);
        r.calc(opts());
        assert.equal(r.type, 'FULL');
        assert.ok(r.totalRate >= 0);
    });

    it('left-only stays -1/LEFT', () => {
        const r = new ObjectRate(field('a'), null);
        r.calc(opts());
        assert.equal(r.type, 'LEFT');
        assert.equal(r.totalRate, -1);
    });

    it('getRateValue returns propertiesRate for "properties"', () => {
        const r = new ObjectRate(field('a'), field('a'));
        r.calc(opts());
        assert.equal(r.getRateValue('properties'), r.propertiesRate);
    });

    it('getRateValue returns totalRate for unknown names', () => {
        const r = new ObjectRate(field('a'), field('a'));
        r.calc(opts());
        assert.equal(r.getRateValue('whatever'), r.totalRate);
    });

    it('getSubRate returns properties list', () => {
        const r = new ObjectRate(field('a'), field('a'));
        r.calc(opts());
        assert.ok(Array.isArray(r.getSubRate('properties')));
    });

    it('differing fields lower the rate below 100', () => {
        const a = field('a', { description: 'AAAA' });
        const b = field('a', { description: 'BBBB' });
        const r = new ObjectRate(a, b);
        r.calc(opts());
        assert.ok(r.totalRate < 100);
    });
});

describe('FieldsRate', () => {
    it('identical fields index match -> indexRate 100', () => {
        const a = field('a', { $comment: JSON.stringify({ orderPosition: 2 }) });
        const b = field('a', { $comment: JSON.stringify({ orderPosition: 2 }) });
        const r = new FieldsRate(a, b);
        r.calc(opts());
        assert.equal(r.indexRate, 100);
    });

    it('different index -> indexRate 0', () => {
        const a = field('a', { $comment: JSON.stringify({ orderPosition: 1 }) });
        const b = field('a', { $comment: JSON.stringify({ orderPosition: 2 }) });
        const r = new FieldsRate(a, b);
        r.calc(opts());
        assert.equal(r.indexRate, 0);
    });

    it('getRateValue index/properties/total branches', () => {
        const r = new FieldsRate(field('a'), field('a'));
        r.calc(opts());
        assert.equal(r.getRateValue('index'), r.indexRate);
        assert.equal(r.getRateValue('properties'), r.propertiesRate);
        assert.equal(r.getRateValue('other'), r.totalRate);
    });

    it('children round-trip via setChildren/getChildren', () => {
        const r = new FieldsRate(field('a'), field('a'));
        r.setChildren(['c1']);
        assert.deepEqual(r.getChildren(), ['c1']);
    });

    it('left-only construction is LEFT and stays -1', () => {
        const r = new FieldsRate(field('a'), null);
        r.calc(opts());
        assert.equal(r.type, 'LEFT');
        assert.equal(r.totalRate, -1);
    });

    it('right-only construction is RIGHT', () => {
        const r = new FieldsRate(null, field('a'));
        assert.equal(r.type, 'RIGHT');
    });

    it('getSubRate returns the properties array', () => {
        const r = new FieldsRate(field('a'), field('a'));
        r.calc(opts());
        assert.ok(Array.isArray(r.getSubRate('properties')));
    });
});
