import assert from 'node:assert/strict';
import {
    applyIgnoreRules,
    getPolicyMessagesForBlock,
    buildMessagesForValidator,
} from '../dist/validators/policy-messages/provider.js';
import {
    MSG_DEPRECATION_BLOCK,
    MSG_REACH_NO_IN,
    MSG_REACH_NO_OUT,
    MSG_REACH_ISOLATED,
} from '../dist/validators/policy-messages/types.js';
import { collapseReachabilityMessages } from '../dist/validators/policy-messages/reachability.js';

const make = (overrides) => ({
    severity: 'warning',
    code: MSG_DEPRECATION_BLOCK,
    text: 'msg',
    ...overrides,
});

describe('applyIgnoreRules', () => {
    it('returns a copy when no rules supplied', () => {
        const msgs = [make()];
        const result = applyIgnoreRules(msgs);
        assert.equal(result.length, 1);
        assert.notEqual(result, msgs);
    });

    it('drops messages matching by code', () => {
        const msgs = [
            make({ code: 'DEPRECATION_BLOCK' }),
            make({ code: 'DEPRECATION_PROP' }),
        ];
        const result = applyIgnoreRules(msgs, [{ code: 'DEPRECATION_BLOCK' }]);
        assert.equal(result.length, 1);
        assert.equal(result[0].code, 'DEPRECATION_PROP');
    });

    it('drops messages matching by blockType', () => {
        const msgs = [
            make({ blockType: 'foo' }),
            make({ blockType: 'bar' }),
        ];
        const result = applyIgnoreRules(msgs, [{ blockType: 'foo' }]);
        assert.equal(result.length, 1);
        assert.equal(result[0].blockType, 'bar');
    });

    it('matches by contains substring on text', () => {
        const msgs = [make({ text: 'hello world' }), make({ text: 'goodbye' })];
        const result = applyIgnoreRules(msgs, [{ contains: 'hello' }]);
        assert.equal(result.length, 1);
        assert.equal(result[0].text, 'goodbye');
    });

    it('matches by severity filter', () => {
        const msgs = [make({ severity: 'warning' }), make({ severity: 'info' })];
        const result = applyIgnoreRules(msgs, [{ severity: 'warning' }]);
        assert.equal(result.length, 1);
        assert.equal(result[0].severity, 'info');
    });

    it('all rule fields must match for a message to be dropped (AND semantics within a rule)', () => {
        const msgs = [
            make({ code: 'A', blockType: 'b1' }),
            make({ code: 'A', blockType: 'b2' }),
        ];
        const result = applyIgnoreRules(msgs, [{ code: 'A', blockType: 'b1' }]);
        // Only b1 matches both → dropped; b2 survives.
        assert.equal(result.length, 1);
        assert.equal(result[0].blockType, 'b2');
    });

    it('any matching rule drops the message (OR semantics across rules)', () => {
        const msgs = [make({ blockType: 'a' }), make({ blockType: 'b' })];
        const result = applyIgnoreRules(msgs, [
            { blockType: 'a' },
            { blockType: 'b' },
        ]);
        assert.equal(result.length, 0);
    });
});

describe('getPolicyMessagesForBlock', () => {
    it('returns [] for an unknown block (no deprecations registered)', () => {
        const result = getPolicyMessagesForBlock('unknown-block', {});
        assert.deepEqual(result, []);
    });

    it('appends reachability messages from the supplied per-block map', () => {
        const reachByBlock = new Map([
            ['b1', [{ severity: 'warning', code: MSG_REACH_NO_IN, text: 'no in' }]],
        ]);
        const result = getPolicyMessagesForBlock('any', {}, 'b1', reachByBlock);
        assert.equal(result.length, 1);
        assert.equal(result[0].code, MSG_REACH_NO_IN);
    });

    it('deduplicates messages by code+block+prop+text', () => {
        const dup = [
            { severity: 'warning', code: MSG_REACH_NO_IN, text: 'same' },
            { severity: 'warning', code: MSG_REACH_NO_IN, text: 'same' },
        ];
        const reachByBlock = new Map([['b1', dup]]);
        const result = getPolicyMessagesForBlock('any', {}, 'b1', reachByBlock);
        assert.equal(result.length, 1);
    });
});

describe('collapseReachabilityMessages', () => {
    it('keeps NO_IN/NO_OUT when no ISOLATED is present', () => {
        const msgs = [
            { severity: 'warning', code: MSG_REACH_NO_IN, text: 'no in' },
            { severity: 'warning', code: MSG_REACH_NO_OUT, text: 'no out' },
        ];
        const result = collapseReachabilityMessages(msgs);
        assert.equal(result.length, 2);
    });

    it('drops NO_IN/NO_OUT when ISOLATED is present (collapsed view)', () => {
        const msgs = [
            { severity: 'warning', code: MSG_REACH_NO_IN, text: 'no in' },
            { severity: 'warning', code: MSG_REACH_NO_OUT, text: 'no out' },
            { severity: 'warning', code: MSG_REACH_ISOLATED, text: 'isolated' },
        ];
        const result = collapseReachabilityMessages(msgs);
        assert.equal(result.length, 1);
        assert.equal(result[0].code, MSG_REACH_ISOLATED);
    });
});

describe('buildMessagesForValidator', () => {
    it('returns warningsText / infosText split by severity', () => {
        const reachByBlock = new Map([
            ['b1', [
                { severity: 'warning', code: MSG_REACH_NO_IN, text: 'warn-1' },
                { severity: 'info', code: MSG_REACH_NO_OUT, text: 'info-1' },
            ]],
        ]);
        const result = buildMessagesForValidator('any', {}, undefined, reachByBlock, 'b1');
        assert.deepEqual(result.warningsText, ['warn-1']);
        assert.deepEqual(result.infosText, ['info-1']);
    });

    it('applies ignore rules before splitting', () => {
        const reachByBlock = new Map([
            ['b1', [
                { severity: 'warning', code: MSG_REACH_NO_IN, text: 'kept' },
                { severity: 'warning', code: MSG_REACH_NO_OUT, text: 'dropped' },
            ]],
        ]);
        const result = buildMessagesForValidator(
            'any', {},
            [{ code: MSG_REACH_NO_OUT }],
            reachByBlock,
            'b1',
        );
        assert.equal(result.warningsText.length, 1);
        assert.equal(result.warningsText[0], 'kept');
    });
});
