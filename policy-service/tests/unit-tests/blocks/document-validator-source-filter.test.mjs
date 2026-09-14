import { assert } from 'chai';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';

const block = () => Object.create(DocumentValidatorBlock.prototype);
const ref = { policyId: 'policy-1' };

describe('documentValidatorBlock source filter', () => {
    describe('group-scoped restriction with no active group', () => {
        it('matches group-less documents, not everything and not nothing', () => {
            const filter = block().buildSourceFilter(
                { onlyOwnByGroupDocuments: true }, ref, {}, { did: 'did:user' }
            );

            // skipping the clause entirely let any participant's document qualify;
            // $in: [] went too far the other way and rejected what the block's own
            // direct check accepts (document.group !== userGroup is false when both
            // are absent), so a group-less policy could never satisfy its own source.
            assert.deepEqual(filter.group, { $eq: null });
        });

        it('does the same for the assigned-by-group variant', () => {
            const filter = block().buildSourceFilter(
                { onlyAssignByGroupDocuments: true }, ref, {}, { did: 'did:user' }
            );

            assert.deepEqual(filter.assignedToGroup, { $eq: null });
        });

        it('still excludes a document carrying a real group from a group-less user', () => {
            const filter = block().buildSourceFilter(
                { onlyOwnByGroupDocuments: true }, ref, {}, { did: 'did:user' }
            );

            // $eq: null matches null/missing only - 'g-1' is not a candidate
            assert.deepEqual(filter.group, { $eq: null });
            assert.notDeepEqual(filter.group, { $eq: 'g-1' });
        });

        it('still scopes to the group when the user has one', () => {
            const filter = block().buildSourceFilter(
                { onlyOwnByGroupDocuments: true }, ref, {}, { did: 'did:user', group: 'g-1' }
            );

            assert.deepEqual(filter.group, { $eq: 'g-1' });
        });

        it('adds no group clause when the option is off', () => {
            const filter = block().buildSourceFilter({}, ref, {}, { did: 'did:user' });

            assert.isUndefined(filter.group);
            assert.isUndefined(filter.assignedToGroup);
        });
    });

    describe('two filters on the same field', () => {
        const filtersFor = (filters) => block().buildSourceFilter({ filters }, ref, {}, {}).$and;

        const range = { field: 'document.credentialSubject.0.projectId', type: 'gte', value: 'PRJ-100', typeValue: 'value' };
        const exclude = { field: 'document.credentialSubject.0.projectId', type: 'not_equal', value: 'PRJ-150', typeValue: 'value' };

        it('composes both predicates instead of overwriting one', () => {
            // assigning into filter[field] kept only the last filter, so the range
            // bound vanished and PRJ-050 satisfied the source validation
            assert.deepEqual(filtersFor([range, exclude]), [
                { 'document.credentialSubject.0.projectId': { $gte: 'PRJ-100' } },
                { 'document.credentialSubject.0.projectId': { $nin: ['PRJ-150'] } }
            ]);
        });

        it('does not depend on the order the author configured them in', () => {
            const reversed = filtersFor([exclude, range]);

            assert.sameDeepMembers(reversed, filtersFor([range, exclude]));
        });

        it('keeps a widened range alongside a same-field in list', () => {
            const $and = filtersFor([
                { field: 'amount', type: 'gte', value: '100', typeValue: 'value' },
                { field: 'amount', type: 'in', value: '100, 200', typeValue: 'value' }
            ]);

            assert.lengthOf($and, 2);
            assert.deepEqual($and[0].$or, [
                { amount: { $gte: 100 } },
                { amount: { $gte: '100' } }
            ]);
            assert.deepEqual($and[1], { amount: { $in: [100, '100', 200, '200'] } });
        });

        it('gives distinct fields one clause each', () => {
            assert.deepEqual(filtersFor([
                { field: 'a', type: 'equal', value: 'x', typeValue: 'value' },
                { field: 'b', type: 'equal', value: 'y', typeValue: 'value' }
            ]), [
                { a: { $in: ['x'] } },
                { b: { $in: ['y'] } }
            ]);
        });

        it('adds no $and when there are no filters', () => {
            assert.isUndefined(block().buildSourceFilter({}, ref, {}, {}).$and);
        });
    });
});
