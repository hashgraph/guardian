import assert from 'node:assert/strict';
import { PolicyHelper } from '../dist/helpers/policy-helper.js';

const Status = {
    DRY_RUN: 'DRY-RUN',
    DRAFT: 'DRAFT',
    PUBLISH_ERROR: 'PUBLISH_ERROR',
    PUBLISH: 'PUBLISH',
    DISCONTINUED: 'DISCONTINUED',
    DEMO: 'DEMO',
    VIEW: 'VIEW',
};

describe('PolicyHelper.isRun', () => {
    it('returns true for DRY_RUN/DEMO/VIEW/PUBLISH/DISCONTINUED', () => {
        for (const s of [Status.DRY_RUN, Status.DEMO, Status.VIEW, Status.PUBLISH, Status.DISCONTINUED]) {
            assert.equal(PolicyHelper.isRun({ status: s }), true, `status=${s}`);
        }
    });

    it('returns false for DRAFT and PUBLISH_ERROR', () => {
        assert.equal(PolicyHelper.isRun({ status: Status.DRAFT }), false);
        assert.equal(PolicyHelper.isRun({ status: Status.PUBLISH_ERROR }), false);
    });

    it('returns false for null/undefined input', () => {
        assert.equal(PolicyHelper.isRun(null), false);
        assert.equal(PolicyHelper.isRun(undefined), false);
        assert.equal(PolicyHelper.isRun({}), false);
    });
});

describe('PolicyHelper.isDryRunMode', () => {
    it('returns true only for DRY_RUN and DEMO', () => {
        assert.equal(PolicyHelper.isDryRunMode({ status: Status.DRY_RUN }), true);
        assert.equal(PolicyHelper.isDryRunMode({ status: Status.DEMO }), true);
        assert.equal(PolicyHelper.isDryRunMode({ status: Status.PUBLISH }), false);
        assert.equal(PolicyHelper.isDryRunMode({ status: Status.VIEW }), false);
    });

    it('returns false for null input', () => {
        assert.equal(PolicyHelper.isDryRunMode(null), false);
    });
});

describe('PolicyHelper.isPublishMode', () => {
    it('returns true for PUBLISH and DISCONTINUED', () => {
        assert.equal(PolicyHelper.isPublishMode({ status: Status.PUBLISH }), true);
        assert.equal(PolicyHelper.isPublishMode({ status: Status.DISCONTINUED }), true);
    });

    it('returns false for non-publish statuses', () => {
        assert.equal(PolicyHelper.isPublishMode({ status: Status.DRAFT }), false);
        assert.equal(PolicyHelper.isPublishMode({ status: Status.DRY_RUN }), false);
        assert.equal(PolicyHelper.isPublishMode({ status: Status.VIEW }), false);
    });
});

describe('PolicyHelper.isEditMode', () => {
    it('returns true only for DRAFT and PUBLISH_ERROR', () => {
        assert.equal(PolicyHelper.isEditMode({ status: Status.DRAFT }), true);
        assert.equal(PolicyHelper.isEditMode({ status: Status.PUBLISH_ERROR }), true);
    });

    it('returns false for running and view statuses', () => {
        for (const s of [Status.PUBLISH, Status.DRY_RUN, Status.DEMO, Status.VIEW, Status.DISCONTINUED]) {
            assert.equal(PolicyHelper.isEditMode({ status: s }), false, `status=${s}`);
        }
    });

    it('returns false for null input', () => {
        assert.equal(PolicyHelper.isEditMode(null), false);
    });
});
