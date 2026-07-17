import assert from 'node:assert/strict';
import { OrderDirection } from '../dist/type/order-direction.type.js';

describe('OrderDirection enum', () => {
    it('exposes ASC / DESC', () => {
        assert.equal(OrderDirection.ASC, 'ASC');
        assert.equal(OrderDirection.DESC, 'DESC');
        assert.equal(Object.keys(OrderDirection).length, 2);
    });
});
