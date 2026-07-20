import { assert } from 'chai';
import { insertVariables } from '../../../dist/helpers/insert-variables.js';

describe('insertVariables — value coercion', () => {
    it('stringifies a numeric value', () => {
        assert.equal(insertVariables('n=${n}', { n: 5 }), 'n=5');
    });

    it('stringifies a boolean value', () => {
        assert.equal(insertVariables('b=${b}', { b: true }), 'b=true');
    });

    it('stringifies an object value as [object Object]', () => {
        assert.equal(insertVariables('o=${o}', { o: { a: 1 } }), 'o=[object Object]');
    });

    it('emits "null" for a present-but-null value (default only fills undefined)', () => {
        assert.equal(insertVariables('x=${x}', { x: null }), 'x=null');
    });
});

describe('insertVariables — placeholder syntax edges', () => {
    it('resolves a key beginning with @', () => {
        assert.equal(insertVariables('t=${@type}', { '@type': 'VC' }), 't=VC');
    });

    it('leaves an empty ${} placeholder literal (needs one+ chars)', () => {
        assert.equal(insertVariables('a${}b', {}), 'a${}b');
    });

    it('substitutes adjacent placeholders', () => {
        assert.equal(insertVariables('${a}${b}', { a: '1', b: '2' }), '12');
    });

    it('treats $-sequences in the substituted value literally', () => {
        assert.equal(insertVariables('v=${a}', { a: '$& and $1' }), 'v=$& and $1');
    });
});
