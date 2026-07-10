import assert from 'node:assert/strict';
import * as middlewares from '../../dist/middlewares/index.js';
import * as validation from '../../dist/middlewares/validation/index.js';

describe('middlewares barrel (middlewares/index.js)', () => {
    it('does not re-export the default binding (export * skips default)', () => {
        assert.equal(middlewares.default, undefined);
    });

    it('re-exports prepareValidationResponse', () => {
        assert.equal(typeof middlewares.prepareValidationResponse, 'function');
        assert.equal(middlewares.prepareValidationResponse, validation.prepareValidationResponse);
    });

    it('re-exports the Examples enum from validation', () => {
        assert.equal(middlewares.Examples, validation.Examples);
        assert.equal(typeof middlewares.Examples, 'object');
    });

    it('re-exports ObjectExamples from validation', () => {
        assert.equal(middlewares.ObjectExamples, validation.ObjectExamples);
    });

    it('re-exports the pageHeader definition', () => {
        assert.equal(middlewares.pageHeader, validation.pageHeader);
        assert.ok(Object.prototype.hasOwnProperty.call(middlewares.pageHeader, 'X-Total-Count'));
    });

    it('re-exports every named (non-default) binding present on the validation module', () => {
        for (const key of Object.keys(validation)) {
            if (key === 'default') {
                continue;
            }
            assert.ok(
                Object.prototype.hasOwnProperty.call(middlewares, key),
                `barrel is missing re-export "${key}"`
            );
            assert.equal(middlewares[key], validation[key], `binding "${key}" should be identical`);
        }
    });
});
