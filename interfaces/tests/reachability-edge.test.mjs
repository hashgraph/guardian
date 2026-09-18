import assert from 'node:assert/strict';
import {
    computeReachability,
} from '../dist/validators/policy-messages/reachability.js';
import {
    MSG_REACH_NO_IN,
    MSG_REACH_NO_OUT,
    MSG_REACH_ISOLATED,
} from '../dist/validators/policy-messages/types.js';

function source(id, opts = {}) {
    return {
        getId: () => id,
        getTag: () => opts.tag,
        getBlockType: () => opts.blockType ?? 'block',
        getParentId: () => opts.parentId,
        getRawConfig: () => ('raw' in opts ? opts.raw : {}),
    };
}

describe('computeReachability edge branches', () => {
    it('resolves a target given as a raw id (not a tag)', () => {
        const result = computeReachability({
            sources: [
                source('a', { raw: { events: [{ target: 'b' }] } }),
                source('b', {}),
            ],
        });
        assert.ok(result.get('a').map((m) => m.code).includes(MSG_REACH_NO_IN));
        assert.ok(result.get('b').map((m) => m.code).includes(MSG_REACH_NO_OUT));
    });

    it('leaves an unresolvable target reference unconnected', () => {
        const result = computeReachability({
            sources: [source('a', { raw: { events: [{ target: 'nope' }] } })],
        });
        const codes = result.get('a').map((m) => m.code).sort();
        assert.deepEqual(codes, [MSG_REACH_ISOLATED, MSG_REACH_NO_IN, MSG_REACH_NO_OUT].sort());
    });

    it('ignores a non-string / blank target reference', () => {
        const result = computeReachability({
            sources: [
                source('a', { raw: { events: [{ target: 42 }, { to: '  ' }] } }),
            ],
        });
        assert.ok(result.get('a').some((m) => m.code === MSG_REACH_ISOLATED));
    });

    it('skips explicit-connection processing when the raw config is not an object', () => {
        const result = computeReachability({
            sources: [source('a', { raw: null })],
        });
        assert.ok(result.get('a').some((m) => m.code === MSG_REACH_ISOLATED));
    });

    it('reads edges from options.events as well as events', () => {
        const result = computeReachability({
            sources: [
                source('a', { tag: 'a-tag', raw: { options: { events: [{ target: 'b-tag' }] } } }),
                source('b', { tag: 'b-tag' }),
            ],
        });
        assert.ok(result.get('a').map((m) => m.code).includes(MSG_REACH_NO_IN));
        assert.ok(result.get('b').map((m) => m.code).includes(MSG_REACH_NO_OUT));
    });

    it('does not self-connect when a node targets itself', () => {
        const result = computeReachability({
            sources: [source('a', { tag: 'a-tag', raw: { events: [{ target: 'a-tag' }] } })],
        });
        assert.ok(result.get('a').some((m) => m.code === MSG_REACH_ISOLATED));
    });

    it('falls back to getBlockType when raw config has no blockType for implicit edges', () => {
        const result = computeReachability({
            sources: [
                source('a', { parentId: 'p', blockType: 'auto', raw: {} }),
                source('b', { parentId: 'p', blockType: 'auto', raw: {} }),
            ],
            blockAboutRegistry: { auto: { defaultEvent: true } },
        });
        assert.ok(result.get('a').map((m) => m.code).includes(MSG_REACH_NO_IN));
        assert.ok(result.get('b').map((m) => m.code).includes(MSG_REACH_NO_OUT));
    });

    it('treats a blank current block type as having no implicit default event', () => {
        const result = computeReachability({
            sources: [
                source('a', { parentId: 'p', blockType: '', raw: {} }),
                source('b', { parentId: 'p', blockType: '', raw: {} }),
            ],
            blockAboutRegistry: { auto: { defaultEvent: true } },
        });
        assert.ok(result.get('a').some((m) => m.code === MSG_REACH_ISOLATED));
        assert.ok(result.get('b').some((m) => m.code === MSG_REACH_ISOLATED));
    });
});
