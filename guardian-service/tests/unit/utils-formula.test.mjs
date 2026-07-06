import assert from 'node:assert/strict';
import { initMathjs } from '../../dist/utils/formula.js';

describe('initMathjs', () => {
    it('returns a math engine with an evaluate function', () => {
        const engine = initMathjs();
        assert.equal(typeof engine.evaluate, 'function');
    });

    it('is a singleton across calls', () => {
        assert.equal(initMathjs(), initMathjs());
    });

    it('evaluates basic arithmetic', () => {
        assert.equal(initMathjs().evaluate('1 + 2 * 3'), 7);
    });

    it('respects operator precedence and parentheses', () => {
        assert.equal(initMathjs().evaluate('(1 + 2) * 3'), 9);
    });

    it('exposes formulajs SUM', () => {
        assert.equal(initMathjs().evaluate('SUM(1, 2, 3, 4)'), 10);
    });

    it('exposes formulajs AVERAGE', () => {
        assert.equal(initMathjs().evaluate('AVERAGE(2, 4, 6)'), 4);
    });

    it('exposes formulajs MAX and MIN', () => {
        const engine = initMathjs();
        assert.equal(engine.evaluate('MAX(3, 7, 1)'), 7);
        assert.equal(engine.evaluate('MIN(3, 7, 1)'), 1);
    });

    it('overrides equal to use loose equality', () => {
        assert.equal(initMathjs().evaluate('equal(1, 1)'), true);
    });

    it('keeps mathjs PI excluded from formulajs override', () => {
        const pi = initMathjs().evaluate('PI');
        assert.ok(Math.abs(pi - Math.PI) < 1e-9);
    });

    it('evaluates nested formula functions', () => {
        assert.equal(initMathjs().evaluate('SUM(1, 2) + AVERAGE(2, 4)'), 6);
    });

    it('evaluates power and modulo operators', () => {
        const engine = initMathjs();
        assert.equal(engine.evaluate('2 ^ 3'), 8);
        assert.equal(engine.evaluate('10 mod 3'), 1);
    });

    it('exposes formulajs ROUND', () => {
        assert.equal(initMathjs().evaluate('ROUND(3.14159, 2)'), 3.14);
    });

    it('evaluates COUNT over a list of values', () => {
        assert.equal(initMathjs().evaluate('COUNT(1, 2, 3, 4)'), 4);
    });
});
