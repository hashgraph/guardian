import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    PolicyCommentUserDTO,
    PolicyCommentRelationshipDTO,
    NewPolicyDiscussionDTO,
    NewPolicyCommentDTO,
    PolicyCommentSearchDTO,
    PolicyCommentCountDTO,
} from '../../dist/middlewares/validation/schemas/policy-comments.dto.js';

describe('PolicyCommentUserDTO', () => {
    it('accepts a valid user entry', () => {
        assert.equal(isClean(errorsFor(PolicyCommentUserDTO, { label: 'l', value: 'v', type: 'role' })), true);
    });

    it('accepts a user entry with roles', () => {
        assert.equal(isClean(errorsFor(PolicyCommentUserDTO, { label: 'l', value: 'v', type: 'user', roles: ['Administrator'] })), true);
    });

    for (const field of ['label', 'value', 'type']) {
        it(`rejects a missing ${field}`, () => {
            const base = { label: 'l', value: 'v', type: 'role' };
            delete base[field];
            assert.equal(hasError(errorsFor(PolicyCommentUserDTO, base), field), true);
        });
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyCommentUserDTO, { label: 'l', value: 'v', type: 'role', [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-array roles', () => {
        assert.equal(hasConstraint(errorsFor(PolicyCommentUserDTO, { label: 'l', value: 'v', type: 'user', roles: 'x' }), 'roles', 'isArray'), true);
    });
});

describe('PolicyCommentRelationshipDTO', () => {
    it('accepts a valid relationship', () => {
        assert.equal(isClean(errorsFor(PolicyCommentRelationshipDTO, { label: 'l', value: 'v' })), true);
    });

    it('rejects a missing label', () => {
        assert.equal(hasError(errorsFor(PolicyCommentRelationshipDTO, { value: 'v' }), 'label'), true);
    });

    it('rejects a non-string value', () => {
        assert.equal(hasConstraint(errorsFor(PolicyCommentRelationshipDTO, { label: 'l', value: 5 }), 'value', 'isString'), true);
    });
});

describe('NewPolicyDiscussionDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(NewPolicyDiscussionDTO, {})), true);
    });

    it('accepts a populated discussion', () => {
        const errs = errorsFor(NewPolicyDiscussionDTO, {
            name: 'n', field: 'f', fieldName: 'fn', parent: 'p', privacy: 'public',
            roles: ['r'], users: ['u'], relationships: ['rel'],
        });
        assert.equal(isClean(errs), true);
    });

    for (const field of ['name', 'field', 'fieldName', 'parent', 'privacy']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(NewPolicyDiscussionDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }

    for (const field of ['roles', 'users', 'relationships']) {
        it(`rejects a non-array ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(NewPolicyDiscussionDTO, { [field]: 'x' }), field, 'isArray'), true);
        });
    }
});

describe('NewPolicyCommentDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(NewPolicyCommentDTO, {})), true);
    });

    it('accepts a populated comment', () => {
        assert.equal(isClean(errorsFor(NewPolicyCommentDTO, { anchor: 'a', recipients: ['r'], fields: ['f'], text: 't', files: ['x'] })), true);
    });

    for (const field of ['anchor', 'text']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(NewPolicyCommentDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }

    for (const field of ['recipients', 'fields', 'files']) {
        it(`rejects a non-array ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(NewPolicyCommentDTO, { [field]: 'x' }), field, 'isArray'), true);
        });
    }
});

describe('PolicyCommentSearchDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyCommentSearchDTO, {})), true);
    });

    it('accepts valid search filters', () => {
        assert.equal(isClean(errorsFor(PolicyCommentSearchDTO, { search: 's', field: 'f', lt: 'a', gt: 'b' })), true);
    });

    for (const field of ['search', 'field', 'lt', 'gt']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyCommentSearchDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('PolicyCommentCountDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyCommentCountDTO, {})), true);
    });

    it('accepts a valid count', () => {
        assert.equal(isClean(errorsFor(PolicyCommentCountDTO, { fields: { a: 1 }, count: 3 })), true);
    });

    it('rejects a non-number count', () => {
        assert.equal(hasConstraint(errorsFor(PolicyCommentCountDTO, { count: 'x' }), 'count', 'isNumber'), true);
    });
});
