import { assert } from 'chai';
import { Singleton } from '../../../dist/decorators/singleton.js';

describe('Singleton (functional decorator usage)', () => {
    it('returns the same instance on repeated `new` calls', () => {
        class Plain {
            constructor() {
                this.value = Math.random();
            }
        }
        const Wrapped = Singleton(Plain);
        const a = new Wrapped();
        const b = new Wrapped();
        assert.strictEqual(a, b);
        assert.strictEqual(a.value, b.value);
    });

    it('the cached instance keeps the constructor arguments from the first call', () => {
        class Greeter {
            constructor(name) {
                this.name = name;
            }
        }
        const Wrapped = Singleton(Greeter);
        const a = new Wrapped('Alice');
        const b = new Wrapped('Bob');
        assert.equal(a.name, 'Alice');
        assert.equal(b.name, 'Alice', 'second new() must reuse first instance, not rebuild');
    });

    it('subclasses still construct independently per call (not affected by parent singleton cache)', () => {
        class Base {
            constructor() { this.kind = 'base'; }
        }
        const WrappedBase = Singleton(Base);

        class Child extends WrappedBase {
            constructor() {
                super();
                this.kind = 'child';
            }
        }

        const c1 = new Child();
        const c2 = new Child();
        // Subclass construction goes through the Reflect.construct branch,
        // so each `new Child()` produces a new Child instance.
        assert.notStrictEqual(c1, c2);
        assert.equal(c1.kind, 'child');
        assert.equal(c2.kind, 'child');
    });

    it('two different singletoned classes have independent caches', () => {
        class X {}
        class Y {}
        const SX = Singleton(X);
        const SY = Singleton(Y);
        const x = new SX();
        const y = new SY();
        assert.notStrictEqual(x, y);
        assert.instanceOf(x, X);
        assert.instanceOf(y, Y);
    });
});
