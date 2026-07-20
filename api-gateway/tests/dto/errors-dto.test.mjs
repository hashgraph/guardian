import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    InternalServerErrorDTO,
    ServiceUnavailableErrorDTO,
    UnprocessableEntityErrorDTO,
    UnauthorizedErrorDTO,
    ForbiddenErrorDTO,
    ConflictErrorDTO,
    NotFoundErrorDTO,
    BadRequestErrorDTO,
} from '../../dist/middlewares/validation/schemas/errors.js';

describe('InternalServerErrorDTO', () => {
    it('accepts a valid error', () => {
        assert.equal(isClean(errorsFor(InternalServerErrorDTO, { statusCode: 500, message: 'boom' })), true);
    });

    it('rejects a non-number statusCode', () => {
        assert.equal(hasConstraint(errorsFor(InternalServerErrorDTO, { statusCode: '500', message: 'm' }), 'statusCode', 'isNumber'), true);
    });

    it('requires message', () => {
        assert.equal(hasConstraint(errorsFor(InternalServerErrorDTO, { statusCode: 500 }), 'message', 'isString'), true);
    });
});

describe('ServiceUnavailableErrorDTO', () => {
    it('accepts a valid error', () => {
        assert.equal(isClean(errorsFor(ServiceUnavailableErrorDTO, { statusCode: 503, message: 'down' })), true);
    });

    it('rejects a string statusCode', () => {
        assert.equal(hasConstraint(errorsFor(ServiceUnavailableErrorDTO, { statusCode: 'x', message: 'm' }), 'statusCode', 'isNumber'), true);
    });
});

describe('UnprocessableEntityErrorDTO', () => {
    it('accepts a string message', () => {
        assert.equal(isClean(errorsFor(UnprocessableEntityErrorDTO, { statusCode: 422, message: 'bad' })), true);
    });

    it('accepts an array message', () => {
        assert.equal(isClean(errorsFor(UnprocessableEntityErrorDTO, { statusCode: 422, message: ['a', 'b'] })), true);
    });

    it('accepts an optional error label', () => {
        assert.equal(isClean(errorsFor(UnprocessableEntityErrorDTO, { statusCode: 422, message: 'm', error: 'Unprocessable Entity' })), true);
    });

    it('rejects a non-string error label', () => {
        assert.equal(hasConstraint(errorsFor(UnprocessableEntityErrorDTO, { statusCode: 422, message: 'm', error: 1 }), 'error', 'isString'), true);
    });
});

describe('UnauthorizedErrorDTO', () => {
    it('accepts a valid error', () => {
        assert.equal(isClean(errorsFor(UnauthorizedErrorDTO, { statusCode: 401, message: 'Unauthorized' })), true);
    });

    it('flags both fields when empty', () => {
        const errs = errorsFor(UnauthorizedErrorDTO, {});
        assert.equal(hasError(errs, 'statusCode'), true);
        assert.equal(hasError(errs, 'message'), true);
    });
});

describe('ForbiddenErrorDTO', () => {
    it('accepts a valid error without label', () => {
        assert.equal(isClean(errorsFor(ForbiddenErrorDTO, { statusCode: 403, message: 'Forbidden resource' })), true);
    });

    it('accepts an optional error label', () => {
        assert.equal(isClean(errorsFor(ForbiddenErrorDTO, { statusCode: 403, message: 'm', error: 'Forbidden' })), true);
    });

    it('rejects a non-string error label', () => {
        assert.equal(hasConstraint(errorsFor(ForbiddenErrorDTO, { statusCode: 403, message: 'm', error: {} }), 'error', 'isString'), true);
    });
});

describe('ConflictErrorDTO', () => {
    it('accepts a valid error', () => {
        assert.equal(isClean(errorsFor(ConflictErrorDTO, { statusCode: 409, message: 'Conflict' })), true);
    });

    it('rejects a non-string message', () => {
        assert.equal(hasConstraint(errorsFor(ConflictErrorDTO, { statusCode: 409, message: 1 }), 'message', 'isString'), true);
    });
});

describe('NotFoundErrorDTO', () => {
    it('accepts a valid error', () => {
        assert.equal(isClean(errorsFor(NotFoundErrorDTO, { statusCode: 404, message: 'missing' })), true);
    });

    it('requires statusCode', () => {
        assert.equal(hasConstraint(errorsFor(NotFoundErrorDTO, { message: 'm' }), 'statusCode', 'isNumber'), true);
    });
});

describe('BadRequestErrorDTO', () => {
    it('accepts a string message', () => {
        assert.equal(isClean(errorsFor(BadRequestErrorDTO, { statusCode: 400, message: 'bad' })), true);
    });

    it('accepts an array message', () => {
        assert.equal(isClean(errorsFor(BadRequestErrorDTO, { statusCode: 400, message: ['a'] })), true);
    });

    it('rejects a non-string error label', () => {
        assert.equal(hasConstraint(errorsFor(BadRequestErrorDTO, { statusCode: 400, message: 'm', error: 0 }), 'error', 'isString'), true);
    });
});
