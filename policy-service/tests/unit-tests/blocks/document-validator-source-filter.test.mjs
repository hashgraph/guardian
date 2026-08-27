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

});
