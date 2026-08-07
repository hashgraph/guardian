import { assert } from 'chai';
import { PolicyStatus, PolicyAvailability } from '@guardian/interfaces';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';

describe('PolicyActionsUtils.needKey', () => {
    const noKeyStatuses = [
        PolicyStatus.DRY_RUN,
        PolicyStatus.DEMO,
        PolicyStatus.VIEW,
        PolicyStatus.DRAFT,
        PolicyStatus.PUBLISH_ERROR
    ];

    for (const status of noKeyStatuses) {
        it(`returns false for ${status} regardless of availability (private)`, () => {
            assert.isFalse(PolicyActionsUtils.needKey(status, PolicyAvailability.PRIVATE));
        });
        it(`returns false for ${status} regardless of availability (public)`, () => {
            assert.isFalse(PolicyActionsUtils.needKey(status, PolicyAvailability.PUBLIC));
        });
    }

    it('returns false for PUBLISH when availability is PUBLIC', () => {
        assert.isFalse(PolicyActionsUtils.needKey(PolicyStatus.PUBLISH, PolicyAvailability.PUBLIC));
    });

    it('returns true for PUBLISH when availability is PRIVATE', () => {
        assert.isTrue(PolicyActionsUtils.needKey(PolicyStatus.PUBLISH, PolicyAvailability.PRIVATE));
    });

    it('returns false for DISCONTINUED when availability is PUBLIC', () => {
        assert.isFalse(PolicyActionsUtils.needKey(PolicyStatus.DISCONTINUED, PolicyAvailability.PUBLIC));
    });

    it('returns true for DISCONTINUED when availability is PRIVATE', () => {
        assert.isTrue(PolicyActionsUtils.needKey(PolicyStatus.DISCONTINUED, PolicyAvailability.PRIVATE));
    });

    it('returns false for an unknown status', () => {
        assert.isFalse(PolicyActionsUtils.needKey('SOMETHING_ELSE', PolicyAvailability.PRIVATE));
    });

    it('returns false for an undefined status', () => {
        assert.isFalse(PolicyActionsUtils.needKey(undefined, PolicyAvailability.PRIVATE));
    });
});

describe('PolicyActionsUtils.validate', () => {
    it('returns false for an unknown document type', async () => {
        const result = await PolicyActionsUtils.validate({ tenantId: null }, { document: { type: 'NOPE' } }, {}, null);
        assert.isFalse(result);
    });

    it('returns false when request is missing', async () => {
        const result = await PolicyActionsUtils.validate({ tenantId: null }, null, {}, null);
        assert.isFalse(result);
    });

    it('returns false when document is missing', async () => {
        const result = await PolicyActionsUtils.validate({ tenantId: null }, {}, {}, null);
        assert.isFalse(result);
    });
});

describe('PolicyActionsUtils.complete', () => {
    it('returns false for an unknown document type', async () => {
        const result = await PolicyActionsUtils.complete({ tenantId: null }, { document: { type: 'NOPE' } }, {}, 'owner', null, 'pid');
        assert.isFalse(result);
    });

    it('returns false when remoteAction is missing', async () => {
        const result = await PolicyActionsUtils.complete({ tenantId: null }, null, {}, 'owner', null, 'pid');
        assert.isFalse(result);
    });

    it('returns false when document is missing', async () => {
        const result = await PolicyActionsUtils.complete({ tenantId: null }, {}, {}, 'owner', null, 'pid');
        assert.isFalse(result);
    });
});

describe('PolicyActionsUtils.response', () => {
    it('throws "Invalid command" for an unknown document type', async () => {
        let message = null;
        try {
            await PolicyActionsUtils.response({ row: { document: { type: 'NOPE' } } });
        } catch (error) {
            message = error.message;
        }
        assert.equal(message, 'Invalid command');
    });

    it('throws "Invalid command" when options are empty', async () => {
        let message = null;
        try {
            await PolicyActionsUtils.response({});
        } catch (error) {
            message = error.message;
        }
        assert.equal(message, 'Invalid command');
    });

    it('throws "Invalid command" when row document is missing', async () => {
        let message = null;
        try {
            await PolicyActionsUtils.response({ row: {} });
        } catch (error) {
            message = error.message;
        }
        assert.equal(message, 'Invalid command');
    });
});
