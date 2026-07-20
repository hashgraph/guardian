import assert from 'node:assert/strict';
import { Singleton } from '../../dist/decorators/singleton.js';

describe('Singleton class decorator', () => {
    it('returns the same instance across direct construction calls', () => {
        const Counter = Singleton(class Counter {
            constructor() { this.n = 0; }
            inc() { this.n++; }
        });
        const a = new Counter();
        const b = new Counter();
        assert.equal(a, b);
        a.inc();
        assert.equal(b.n, 1);
    });

    it('preserves subclass instances as separate (not collapsed into base singleton)', () => {
        const Base = Singleton(class Base {
            constructor() { this.kind = 'base'; }
        });
        class Child extends Base {
            constructor() { super(); this.kind = 'child'; }
        }
        const childA = new Child();
        const childB = new Child();
        assert.equal(childA.kind, 'child');
        assert.equal(childB.kind, 'child');
        // Subclass construction goes through different prototype, returning fresh instances each time
        assert.notEqual(childA, childB);
    });

    it('lazy-initializes (constructor only runs once)', () => {
        let count = 0;
        const C = Singleton(class C { constructor() { count++; } });
        new C(); new C(); new C();
        assert.equal(count, 1);
    });
});
