import assert from 'node:assert/strict';
import { pageHeader } from '../../dist/middlewares/validation/page-header.js';

describe('pageHeader response-header definition', () => {
    it('is defined and an object', () => {
        assert.equal(typeof pageHeader, 'object');
        assert.notEqual(pageHeader, null);
    });

    it('declares the X-Total-Count header', () => {
        assert.ok(Object.prototype.hasOwnProperty.call(pageHeader, 'X-Total-Count'));
    });

    it('types X-Total-Count as an integer schema', () => {
        assert.equal(pageHeader['X-Total-Count'].schema.type, 'integer');
    });

    it('carries a human-readable description', () => {
        assert.equal(pageHeader['X-Total-Count'].description, 'Total items in the collection.');
    });

    it('exposes exactly one header key', () => {
        assert.equal(Object.keys(pageHeader).length, 1);
    });
});
