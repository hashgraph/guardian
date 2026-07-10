import { assert } from 'chai';
import { insertVariables } from '../../../dist/helpers/insert-variables.js';

describe('insertVariables', () => {
    it('substitutes a single ${path} from a flat object', () => {
        assert.equal(insertVariables('Hello ${name}', { name: 'world' }), 'Hello world');
    });

    it('substitutes multiple placeholders in one expression', () => {
        assert.equal(
            insertVariables('${a} + ${b}', { a: '1', b: '2' }),
            '1 + 2',
        );
    });

    it('resolves dotted paths via lodash.get', () => {
        assert.equal(
            insertVariables('user=${user.name}', { user: { name: 'alice' } }),
            'user=alice',
        );
    });

    it('substitutes empty string for missing paths', () => {
        assert.equal(insertVariables('Hi ${user.missing}', {}), 'Hi ');
    });

    it('returns the input unchanged when no placeholder is present', () => {
        assert.equal(insertVariables('plain text', {}), 'plain text');
    });

    it('returns falsy expressions unchanged (short-circuit)', () => {
        assert.equal(insertVariables('', { x: 1 }), '');
        assert.equal(insertVariables(null, { x: 1 }), null);
        assert.equal(insertVariables(undefined, { x: 1 }), undefined);
    });

    it('supports array indices in dotted paths', () => {
        assert.equal(
            insertVariables('first=${items[0].id}', { items: [{ id: 'a' }, { id: 'b' }] }),
            'first=a',
        );
    });

    it('does not substitute placeholders containing characters outside the allowed set', () => {
        // The regex is ${[A-Za-z0-9.\[\]@]+} — spaces, dashes, parens are not allowed.
        assert.equal(insertVariables('${has space}', { 'has space': 'x' }), '${has space}');
    });
});
