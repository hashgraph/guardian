import assert from 'node:assert/strict';
import { StateField } from '../../../dist/policy-engine/helpers/decorators/state-field.js';
import { STATE_KEY } from '../../../dist/policy-engine/helpers/constants.js';

const makeClass = () => {
    class Holder {}
    StateField()(Holder.prototype, 'field');
    return Holder;
};

describe('StateField decorator', () => {
    it('reading before any write returns undefined and initializes the state bag', () => {
        const Holder = makeClass();
        const instance = new Holder();
        assert.equal(instance.field, undefined);
        assert.deepEqual(instance[STATE_KEY], {});
    });

    it('stores written values under the STATE_KEY symbol', () => {
        const Holder = makeClass();
        const instance = new Holder();
        instance.field = 7;
        assert.equal(instance.field, 7);
        assert.deepEqual(instance[STATE_KEY], { field: 7 });
    });

    it('writing first also initializes the state bag', () => {
        const Holder = makeClass();
        const instance = new Holder();
        instance.field = 'v';
        assert.deepEqual(instance[STATE_KEY], { field: 'v' });
    });

    it('keeps state isolated between instances sharing the prototype', () => {
        const Holder = makeClass();
        const a = new Holder();
        const b = new Holder();
        a.field = 1;
        b.field = 2;
        assert.equal(a.field, 1);
        assert.equal(b.field, 2);
    });
});
