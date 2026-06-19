import { assert } from 'chai';
import { Log } from '../../../dist/entity/log.js';
import { PolicyProperty } from '../../../dist/entity/policy-property.js';
import { Settings } from '../../../dist/entity/settings.js';

describe('Log entity (common)', () => {
    it('extends BaseEntity (createDate/updateDate present)', () => {
        const l = new Log();
        assert.instanceOf(l.createDate, Date);
        assert.instanceOf(l.updateDate, Date);
    });

    it('initialises datetime to a Date close to now', () => {
        const before = Date.now();
        const l = new Log();
        const after = Date.now();
        assert.instanceOf(l.datetime, Date);
        assert.isAtLeast(l.datetime.getTime(), before - 5);
        assert.isAtMost(l.datetime.getTime(), after + 5);
    });

    it('exposes assignable message/type/attributes/userId fields', () => {
        const l = new Log();
        l.message = 'hello';
        l.type = 'INFO';
        l.attributes = ['a', 'b'];
        l.userId = 'u-1';
        assert.equal(l.message, 'hello');
        assert.equal(l.type, 'INFO');
        assert.deepEqual(l.attributes, ['a', 'b']);
        assert.equal(l.userId, 'u-1');
    });

    it('attributes / userId are optional and undefined by default', () => {
        const l = new Log();
        assert.equal(l.attributes, undefined);
        assert.equal(l.userId, undefined);
    });
});

describe('PolicyProperty entity', () => {
    it('extends BaseEntity', () => {
        const p = new PolicyProperty();
        assert.instanceOf(p.createDate, Date);
    });

    it('exposes assignable title/value fields', () => {
        const p = new PolicyProperty();
        p.title = 'limit';
        p.value = '42';
        assert.equal(p.title, 'limit');
        assert.equal(p.value, '42');
    });
});

describe('Settings entity', () => {
    it('extends BaseEntity', () => {
        const s = new Settings();
        assert.instanceOf(s.createDate, Date);
    });

    it('name / value are optional and undefined by default', () => {
        const s = new Settings();
        assert.equal(s.name, undefined);
        assert.equal(s.value, undefined);
    });

    it('toJSON includes the assigned name/value fields', () => {
        const s = new Settings();
        s.id = 'sid';
        s.name = 'flag';
        s.value = 'on';
        const json = s.toJSON();
        assert.equal(json.id, 'sid');
        assert.equal(json.name, 'flag');
        assert.equal(json.value, 'on');
    });
});
