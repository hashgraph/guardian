import { assert } from 'chai';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';

const block = () => Object.create(DocumentValidatorBlock.prototype);
const ref = { policyId: 'policy-1' };

describe('documentValidatorBlock source filter', () => {
    describe('group-scoped restriction with no active group', () => {
        it('matches nothing rather than everything', () => {
            const filter = block().buildSourceFilter(
                { onlyOwnByGroupDocuments: true }, ref, {}, { did: 'did:user' }
            );

            // skipping the clause entirely let any participant's document qualify
            assert.deepEqual(filter.group, { $in: [] });
        });

        it('does the same for the assigned-by-group variant', () => {
            const filter = block().buildSourceFilter(
                { onlyAssignByGroupDocuments: true }, ref, {}, { did: 'did:user' }
            );

            assert.deepEqual(filter.assignedToGroup, { $in: [] });
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
