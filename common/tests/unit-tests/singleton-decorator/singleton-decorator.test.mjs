import assert from 'node:assert/strict';
import { Singleton } from '../../../dist/decorators/singleton.js';

const decorate = (cls) => Singleton(cls);

describe('Singleton (common decorator)', () => {
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

    it('preserves constructor arguments on the first construction only', () => {
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

    it('is the same Singleton symbol across multiple invocations', () => {
        class Foo {}
        const A = decorate(Foo);
        const B = decorate(Foo);
        // Each call creates a new Proxy, but the underlying SINGLETON_KEY is set on
        // the same target — so once an instance is constructed via either Proxy,
        // both Proxies return that same instance.
        const a = new A();
        const b = new B();
        assert.equal(a, b);
    });

    it('preserves the prototype chain of the wrapped class', () => {
        class Foo {
            greet() { return 'hi'; }
        }
        const Wrapped = decorate(Foo);
        const instance = new Wrapped();
        assert.equal(instance.greet(), 'hi');
        assert.ok(instance instanceof Foo);
    });
});
