import assert from 'node:assert/strict';
import { AuthEvents } from '../dist/type/messages/auth-events.js';

describe('AuthEvents enum', () => {
    it('uses identity values (key equals value) for every member', () => {
        for (const [k, v] of Object.entries(AuthEvents)) {
            assert.equal(k, v);
        }
    });

    it('maps user/account subjects', () => {
        assert.equal(AuthEvents.GET_USER_BY_TOKEN, 'GET_USER_BY_TOKEN');
        assert.equal(AuthEvents.REGISTER_NEW_USER, 'REGISTER_NEW_USER');
        assert.equal(AuthEvents.GENERATE_NEW_TOKEN, 'GENERATE_NEW_TOKEN');
        assert.equal(AuthEvents.GENERATE_NEW_ACCESS_TOKEN, 'GENERATE_NEW_ACCESS_TOKEN');
        assert.equal(AuthEvents.GET_ALL_USER_ACCOUNTS, 'GET_ALL_USER_ACCOUNTS');
        assert.equal(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS, 'GET_ALL_STANDARD_REGISTRY_ACCOUNTS');
    });

    it('maps role subjects', () => {
        assert.equal(AuthEvents.GET_ROLES, 'GET_ROLES');
        assert.equal(AuthEvents.CREATE_ROLE, 'CREATE_ROLE');
        assert.equal(AuthEvents.UPDATE_ROLE, 'UPDATE_ROLE');
        assert.equal(AuthEvents.DELETE_ROLE, 'DELETE_ROLE');
        assert.equal(AuthEvents.SET_DEFAULT_ROLE, 'SET_DEFAULT_ROLE');
    });

    it('maps Meeco subjects', () => {
        assert.equal(AuthEvents.MEECO_AUTH_START, 'MEECO_AUTH_START');
        assert.equal(AuthEvents.MEECO_VERIFY_VP, 'MEECO_VERIFY_VP');
        assert.equal(AuthEvents.MEECO_VERIFY_VP_FAILED, 'MEECO_VERIFY_VP_FAILED');
        assert.equal(AuthEvents.MEECO_APPROVE_SUBMISSION, 'MEECO_APPROVE_SUBMISSION');
        assert.equal(AuthEvents.MEECO_REJECT_SUBMISSION, 'MEECO_REJECT_SUBMISSION');
    });

    it('maps relayer subjects', () => {
        assert.equal(AuthEvents.GET_RELAYER_ACCOUNT, 'GET_RELAYER_ACCOUNT');
        assert.equal(AuthEvents.CREATE_RELAYER_ACCOUNT, 'CREATE_RELAYER_ACCOUNT');
        assert.equal(AuthEvents.GENERATE_RELAYER_ACCOUNT, 'GENERATE_RELAYER_ACCOUNT');
        assert.equal(AuthEvents.RELAYER_ACCOUNT_EXIST, 'RELAYER_ACCOUNT_EXIST');
    });

    it('maps OTP subjects', () => {
        assert.equal(AuthEvents.OTP_GENERATE_SECRET, 'OTP_GENERATE_SECRET');
        assert.equal(AuthEvents.OTP_CONFIRM_SECRET, 'OTP_CONFIRM_SECRET');
        assert.equal(AuthEvents.OTP_GET_STATUS, 'OTP_GET_STATUS');
        assert.equal(AuthEvents.OTP_DEACTIVATE, 'OTP_DEACTIVATE');
    });

    it('has unique values and a sizeable surface', () => {
        const values = Object.values(AuthEvents);
        assert.equal(new Set(values).size, values.length);
        assert.ok(values.length > 40);
    });
});
