import assert from 'node:assert/strict';
import { Singleton } from '../../dist/helpers/decorators/singleton.js';

describe('api-gateway Singleton decorator', () => {
    it('returns the same instance for repeated direct construction', () => {
        const C = Singleton(class C { constructor() { this.id = Math.random(); } });
        const a = new C();
        const b = new C();
        assert.equal(a, b);
    });
    it('runs the constructor only once', () => {
        let count = 0;
        const C = Singleton(class C { constructor() { count++; } });
        new C(); new C(); new C();
        assert.equal(count, 1);
    });
    it('subclass instances are not collapsed into the base singleton', () => {
        const Base = Singleton(class Base { constructor() {} });
        class Child extends Base { constructor() { super(); } }
        const a = new Child();
        const b = new Child();
        assert.notEqual(a, b);
    });
});
