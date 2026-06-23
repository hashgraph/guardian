import assert from 'node:assert/strict';

function assertIncludesMembers(arr, members) {
    for (const m of members) assert.ok(arr.includes(m), `expected ${JSON.stringify(arr)} to include ${m}`);
}
import {
    projectRawNode,
    computeReachability,
} from '../dist/validators/policy-messages/reachability.js';
import {
    MSG_REACH_NO_IN,
    MSG_REACH_NO_OUT,
    MSG_REACH_ISOLATED,
} from '../dist/validators/policy-messages/types.js';

describe('projectRawNode', () => {
    it('copies the documented set of fields', () => {
        const source = {
            id: 'b1',
            tag: 't1',
            blockType: 'foo',
            properties: { stopPropagation: true },
            events: [{ a: 1 }],
            options: { events: [{ b: 2 }] },
            uiMetaData: { x: 'y' },
            stopPropagation: true,
            extra: 'should-not-appear',
        };
        const view = projectRawNode(source);
        assert.equal(view.id, 'b1');
        assert.equal(view.tag, 't1');
        assert.equal(view.blockType, 'foo');
        assert.deepEqual(view.properties, { stopPropagation: true });
        assert.equal(view.stopPropagation, true);
        assert.equal('extra' in view, false);
    });

    it('coerces stopPropagation to boolean', () => {
        const view = projectRawNode({ stopPropagation: 'truthy' });
        assert.equal(view.stopPropagation, true);

        const view2 = projectRawNode({});
        assert.equal(view2.stopPropagation, false);
    });

    it('handles null/undefined source', () => {
        const view = projectRawNode(null);
        assert.equal(view.id, undefined);
        assert.equal(view.stopPropagation, false);
    });
});

describe('computeReachability', () => {
    function source(id, opts = {}) {
        return {
            getId: () => id,
            getTag: () => opts.tag,
            getBlockType: () => opts.blockType ?? 'block',
            getParentId: () => opts.parentId,
            getRawConfig: () => opts.raw ?? {},
        };
    }

    it('returns an empty Map when context is missing or has no sources', () => {
        assert.equal(computeReachability(undefined).size, 0);
        assert.equal(computeReachability({ sources: [] }).size, 0);
    });

    it('flags an isolated block (no inbound, no outbound)', () => {
        const result = computeReachability({ sources: [source('b1')] });
        const msgs = result.get('b1');
        const codes = msgs.map((m) => m.code).sort();
        assert.deepEqual(codes, [MSG_REACH_ISOLATED, MSG_REACH_NO_IN, MSG_REACH_NO_OUT].sort());
    });

    it('records explicit edges via events[].target (by tag)', () => {
        const result = computeReachability({
            sources: [
                source('a', { tag: 'a-tag', raw: { events: [{ target: 'b-tag' }] } }),
                source('b', { tag: 'b-tag' }),
            ],
        });
        const aMsgs = result.get('a').map((m) => m.code);
        const bMsgs = result.get('b').map((m) => m.code);
        // a has outbound but no inbound → only NO_IN.
        assertIncludesMembers(aMsgs, [MSG_REACH_NO_IN]);
        // b has inbound but no outbound → only NO_OUT.
        assertIncludesMembers(bMsgs, [MSG_REACH_NO_OUT]);
    });

    it('records implicit defaultEvent → next sibling edges via the blockAbout registry', () => {
        const result = computeReachability({
            sources: [
                source('a', { parentId: 'p', blockType: 'auto', raw: { blockType: 'auto' } }),
                source('b', { parentId: 'p', blockType: 'auto', raw: { blockType: 'auto' } }),
            ],
            blockAboutRegistry: { auto: { defaultEvent: true } },
        });
        const aMsgs = result.get('a').map((m) => m.code);
        const bMsgs = result.get('b').map((m) => m.code);
        // a has outbound (default → b) but no inbound → NO_IN only.
        assertIncludesMembers(aMsgs, [MSG_REACH_NO_IN]);
        // b has inbound (from a) but no outbound → NO_OUT only.
        assertIncludesMembers(bMsgs, [MSG_REACH_NO_OUT]);
    });

    it('honours stopPropagation=true to disable implicit edges', () => {
        const result = computeReachability({
            sources: [
                source('a', { parentId: 'p', blockType: 'auto', raw: { blockType: 'auto', properties: { stopPropagation: true } } }),
                source('b', { parentId: 'p', blockType: 'auto', raw: { blockType: 'auto' } }),
            ],
            blockAboutRegistry: { auto: { defaultEvent: true } },
        });
        // Both isolated.
        assert.ok(result.get('a').some((m) => m.code === MSG_REACH_ISOLATED));
        assert.ok(result.get('b').some((m) => m.code === MSG_REACH_ISOLATED));
    });

    it('skips disabled events', () => {
        const result = computeReachability({
            sources: [
                source('a', { tag: 'a-tag', raw: { events: [{ target: 'b-tag', disabled: true }] } }),
                source('b', { tag: 'b-tag' }),
            ],
        });
        // Both isolated since the only edge was disabled.
        assert.ok(result.get('a').some((m) => m.code === MSG_REACH_ISOLATED));
        assert.ok(result.get('b').some((m) => m.code === MSG_REACH_ISOLATED));
    });
});
