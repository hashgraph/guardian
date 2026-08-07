import assert from 'node:assert/strict';
import { Singleton } from '../dist/helpers/decorators/singleton.js';

function decorate(cls) {
    return Singleton(cls);
}

describe('Singleton decorator', () => {
    it('returns the same instance for repeated `new` calls', () => {
        class Holder {
            constructor() {
                this.id = Math.random();
            }
        }
        const Wrapped = decorate(Holder);
        const a = new Wrapped();
        const b = new Wrapped();
        assert.equal(a, b);
        assert.equal(a.id, b.id);
    });

    it('preserves constructor arguments on the first construction', () => {
        class Tagged {
            constructor(label) {
                this.label = label;
            }
        }
        const Wrapped = decorate(Tagged);
        const first = new Wrapped('first');
        const second = new Wrapped('second-ignored');
        assert.equal(first.label, 'first');
        assert.equal(second, first);
    });

    it('produces independent singletons per decorated class', () => {
        class A {}
        class B {}
        const WA = decorate(A);
        const WB = decorate(B);
        assert.notEqual(new WA(), new WB());
    });

    it('returns a fresh instance when constructed via a subclass', () => {
        class Base {}
        const WrappedBase = decorate(Base);
        class Derived extends WrappedBase {}
        const baseInstance = new WrappedBase();
        const derivedInstance = new Derived();
        assert.notEqual(baseInstance, derivedInstance);
        assert.ok(derivedInstance instanceof Derived);
    });
});
