import assert from 'node:assert/strict';
import { Singleton } from '../../../dist/helpers/decorators/singleton.js';

describe('Singleton decorator additional behaviour', () => {
    it('passes through constructor arguments on first construction only', () => {
        const C = Singleton(class C { constructor(x) { this.x = x; } });
        const a = new C('first');
        const b = new C('second');
        assert.equal(a.x, 'first');
        assert.equal(b.x, 'first');
        assert.equal(a, b);
    });

    it('returns an instance that is instanceof the decorated class', () => {
        const C = Singleton(class C {});
        assert.ok(new C() instanceof C);
    });

    it('keeps singletons isolated across two separately decorated classes', () => {
        const A = Singleton(class A {});
        const B = Singleton(class B {});
        assert.notEqual(new A(), new B());
        assert.ok(new A() instanceof A);
        assert.ok(new B() instanceof B);
    });

    it('constructs a fresh instance for each subclass invocation (prototype mismatch path)', () => {
        const Base = Singleton(class Base { constructor() { this.tag = 'base'; } });
        class Child extends Base { constructor() { super(); this.tag = 'child'; } }
        const c1 = new Child();
        const c2 = new Child();
        assert.notEqual(c1, c2);
        assert.equal(c1.tag, 'child');
    });

    it('the base singleton is independent from subclass instances', () => {
        const Base = Singleton(class Base {});
        class Child extends Base {}
        const base = new Base();
        const child = new Child();
        assert.notEqual(base, child);
        assert.equal(new Base(), base);
    });

    it('preserves state set on the cached instance across constructions', () => {
        const C = Singleton(class C { constructor() { this.count = 0; } });
        const a = new C();
        a.count = 5;
        const b = new C();
        assert.equal(b.count, 5);
    });
});
