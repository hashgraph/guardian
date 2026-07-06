import assert from 'node:assert/strict';
import {
    GetMehodologiesByPolicies,
    GroupCategories,
} from '../dist/helpers/general-helper.js';

const policy = (id, name, extra = {}) => ({
    _id: { toString: () => id },
    name,
    topicDescription: extra.topicDescription,
    detailsUrl: extra.detailsUrl,
});

describe('GetMehodologiesByPolicies', () => {
    it('returns empty when no policy name appears in the response', () => {
        const result = GetMehodologiesByPolicies(
            'unrelated text about cats',
            [policy('p1', 'Methodology Alpha')],
        );
        assert.deepEqual(result, []);
    });

    it('matches a policy whose name is mentioned in the response', () => {
        const result = GetMehodologiesByPolicies(
            'See the Methodology Alpha for details.',
            [
                policy('p1', 'Methodology Alpha', {
                    topicDescription: 'desc',
                    detailsUrl: 'https://example.com/a',
                }),
            ],
        );
        assert.deepEqual(result, [
            { id: 'p1', label: 'Methodology Alpha', text: 'desc', url: 'https://example.com/a' },
        ]);
    });

    it('matches case-insensitively but on whole-word boundaries', () => {
        const policies = [policy('p1', 'Alpha')];
        // Whole-word boundary: 'AlphaBeta' should NOT match because of \b.
        assert.deepEqual(
            GetMehodologiesByPolicies('the AlphaBeta system', policies),
            [],
        );
        assert.equal(
            GetMehodologiesByPolicies('the Alpha system', policies).length,
            1,
        );
    });

    it('deduplicates policies even if mentioned multiple times', () => {
        const result = GetMehodologiesByPolicies(
            'Alpha is good. Alpha is great. ALPHA wins.',
            [policy('p1', 'Alpha')],
        );
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 'p1');
    });

    it("falls back to '' for missing topicDescription / detailsUrl", () => {
        const result = GetMehodologiesByPolicies(
            'Mention of Alpha here',
            [policy('p1', 'Alpha')],
        );
        assert.deepEqual(result, [{ id: 'p1', label: 'Alpha', text: '', url: '' }]);
    });
});

describe('GroupCategories', () => {
    it('groups categories by their type field', () => {
        const grouped = GroupCategories([
            { type: 'A', name: 'a1' },
            { type: 'B', name: 'b1' },
            { type: 'A', name: 'a2' },
        ]);
        assert.equal(grouped.A.length, 2);
        assert.equal(grouped.B.length, 1);
        assert.equal(grouped.A[0].name, 'a1');
    });

    it('returns an empty object for an empty list', () => {
        assert.deepEqual(GroupCategories([]), {});
    });
});
