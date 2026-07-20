import assert from 'node:assert/strict';
import { MathFormula } from '../../../dist/policy-engine/helpers/math-model/math-formula.js';
import { MathItemType } from '../../../dist/policy-engine/helpers/math-model/math-item.type.js';

describe('MathFormula constructor', () => {
    it('initialises type=VARIABLE, validated=false, empty depending on inputs', () => {
        const f = new MathFormula('', '');
        assert.equal(f.type, MathItemType.VARIABLE);
        assert.equal(f.validated, false);
        assert.equal(f.empty, true);
        assert.equal(f.valid, false);
        assert.equal(f.invalid, true);
    });

    it('captures name/body text and assigns a UUID id', () => {
        const f = new MathFormula('total', 'a + b');
        assert.equal(f.functionNameText, 'total');
        assert.equal(f.functionBodyText, 'a + b');
        assert.match(f.id, /^[0-9a-f-]{36}$/);
        assert.equal(f.empty, false);
    });

    it('reports name returns the parsed functionName (defaults to "")', () => {
        const f = new MathFormula('total', 'a + b');
        assert.equal(typeof f.name, 'string');
    });
});
