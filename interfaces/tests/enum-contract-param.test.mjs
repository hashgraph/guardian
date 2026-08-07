import assert from 'node:assert/strict';
import { ContractParamType } from '../dist/type/contract-param.type.js';

describe('ContractParamType enum', () => {
    it('uses Solidity ABI type strings', () => {
        assert.equal(ContractParamType.ADDRESS, 'address');
        assert.equal(ContractParamType.ADDRESS_ARRAY, 'address[]');
        assert.equal(ContractParamType.UINT8, 'uint8');
        assert.equal(ContractParamType.BOOL, 'bool');
        assert.equal(ContractParamType.INT64, 'int64');
        assert.equal(ContractParamType.INT64_ARRAY, 'int64[]');
    });
});
