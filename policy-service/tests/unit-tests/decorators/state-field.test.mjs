import { assert } from 'chai';
import { StateField } from '../../../dist/policy-engine/helpers/decorators/state-field.js';

function makeSubjectClass() {
    class Subject {}
    // Seed the property on the prototype so the decorator's `delete target[propertyKey]`
    // succeeds (it's defined as enumerable + configurable by default).
    Subject.prototype.count = undefined;
    StateField()(Subject.prototype, 'count');
    return Subject;
}

describe('StateField decorator', () => {
    it('proxies reads/writes through a private STATE_KEY map', () => {
        const Subject = makeSubjectClass();
        const obj = new Subject();
        obj.count = 1;
        assert.equal(obj.count, 1);
        obj.count = 2;
        assert.equal(obj.count, 2);
    });

    it('keeps state per instance (not shared via prototype)', () => {
        const Subject = makeSubjectClass();
        const a = new Subject();
        const b = new Subject();
        a.count = 'a';
        b.count = 'b';
        assert.equal(a.count, 'a');
        assert.equal(b.count, 'b');
    });

    it('returns undefined before any write', () => {
        const Subject = makeSubjectClass();
        const obj = new Subject();
        assert.equal(obj.count, undefined);
    });

    it('does not own the property on the instance (lives on the prototype)', () => {
        const Subject = makeSubjectClass();
        const obj = new Subject();
        obj.count = 1;
        assert.notInclude(Object.getOwnPropertyNames(obj), 'count');
    });
});
