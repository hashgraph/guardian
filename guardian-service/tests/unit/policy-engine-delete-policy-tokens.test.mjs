import assert from 'node:assert/strict';
import { resolveDraftTokensToDelete } from '../../dist/policy-engine/policy-engine.js';

describe('resolveDraftTokensToDelete', () => {
    it('returns a draft token that no other policy references', () => {
        const token = { tokenId: 'draft-1', draftToken: true };

        const result = resolveDraftTokensToDelete([token], new Set());

        assert.deepEqual(result, [token]);
    });

    it('never returns a token with draftToken false', () => {
        const published = { tokenId: '0.0.10025736', draftToken: false };

        assert.deepEqual(resolveDraftTokensToDelete([published], new Set()), []);
        assert.deepEqual(
            resolveDraftTokensToDelete([published], new Set(['0.0.10025736'])),
            []
        );
    });

    it('never returns a token whose draftToken is missing or undefined', () => {
        const missing = { tokenId: 'dynamic-1' };
        const undef = { tokenId: 'dynamic-2', draftToken: undefined };

        assert.deepEqual(resolveDraftTokensToDelete([missing, undef], new Set()), []);
    });

    it('does not return a draft token another policy still references', () => {
        const shared = { tokenId: 'draft-shared', draftToken: true };

        const result = resolveDraftTokensToDelete([shared], new Set(['draft-shared']));

        assert.deepEqual(result, []);
    });

    it('keeps the unreferenced drafts and drops the referenced one', () => {
        const free1 = { tokenId: 'draft-1', draftToken: true };
        const shared = { tokenId: 'draft-shared', draftToken: true };
        const free2 = { tokenId: 'draft-2', draftToken: true };

        const result = resolveDraftTokensToDelete(
            [free1, shared, free2],
            new Set(['draft-shared'])
        );

        assert.deepEqual(result, [free1, free2]);
    });

    it('returns a draft token that has no tokenId instead of throwing', () => {
        const noId = { draftToken: true };

        const result = resolveDraftTokensToDelete([noId], new Set(['draft-1']));

        assert.deepEqual(result, [noId]);
    });

    it('returns an empty array for an empty candidate list', () => {
        assert.deepEqual(resolveDraftTokensToDelete([], new Set()), []);
        assert.deepEqual(resolveDraftTokensToDelete([], new Set(['draft-1'])), []);
    });

    it('does not mutate the candidate list or the set it is given', () => {
        const tokens = [
            { tokenId: 'draft-1', draftToken: true },
            { tokenId: '0.0.10025736', draftToken: false }
        ];
        const used = new Set(['draft-other']);

        resolveDraftTokensToDelete(tokens, used);

        assert.equal(tokens.length, 2);
        assert.equal(tokens[0].tokenId, 'draft-1');
        assert.equal(tokens[1].tokenId, '0.0.10025736');
        assert.deepEqual([...used], ['draft-other']);
    });
});
