import assert from 'node:assert/strict';
import { ContractType } from '../dist/type/contract.type.js';

describe('ContractType enum', () => {
    it('exposes WIPE and RETIRE', () => {
        const values = Object.values(ContractType);
        assert.ok(values.includes('WIPE'));
        assert.ok(values.includes('RETIRE'));
    });
});
