import { assert } from 'chai';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';

/*
 * The draft lookup keyed on draftId + policyId only, so a draftId from another user
 * in the same policy resolved to their row and the update overwrote it.
 */
describe('@unit SendToGuardianBlock draft lookup is owner-scoped', () => {
    const block = () => Object.create(SendToGuardianBlock.prototype);

    const refWith = (row) => {
        const seen = [];
        return {
            policyId: 'policy-1',
            databaseServer: {
                async getVcDocument(filter) { seen.push(filter); return row; },
            },
            seen,
        };
    };

    it('asks for the draft by owner as well as id and policy', async () => {
        const ref = refWith(null);

        await block().getVCRecord(
            { draftId: 'd-1', owner: 'did:alice', draft: true }, 'create', ref
        );

        const [filter] = ref.seen;
        assert.deepEqual(filter.owner, { $eq: 'did:alice' },
            'without this a draftId from another user in the same policy still resolves');
        assert.deepEqual(filter.id, { $eq: 'd-1' });
        assert.deepEqual(filter.policyId, { $eq: 'policy-1' });
    });

    it('leaves the hash path alone', async () => {
        const ref = refWith(null);

        await block().getVCRecord({ hash: 'h-1' }, 'create', ref);

        const [filter] = ref.seen;
        assert.isUndefined(filter.owner, 'the hash branch is not a per-user lookup');
        assert.deepEqual(filter.hash, { $eq: 'h-1' });
    });

    /*
     * mapDocument is shared by the approval, DID and VP paths. Excluding `owner` there
     * would silently drop setRelationshipsBlock's changeOwner reassignment, which is a
     * far wider change than the draft bug - the owner filter above is what closes it.
     */
    it('mapDocument still carries a reassigned owner', () => {
        const old = { owner: 'did:alice', value: 1 };

        const merged = block().mapDocument(old, { owner: 'did:bob', value: 2 });

        assert.equal(merged.owner, 'did:bob', 'changeOwner reassignment must survive');
        assert.equal(merged.value, 2);
    });

    it('mapDocument still refuses to copy the identity fields', () => {
        const old = { id: 'keep', _id: 'keep', value: 1 };

        const merged = block().mapDocument(old, { id: 'new', _id: 'new', value: 2 });

        assert.equal(merged.id, 'keep');
        assert.equal(merged._id, 'keep');
    });
});
