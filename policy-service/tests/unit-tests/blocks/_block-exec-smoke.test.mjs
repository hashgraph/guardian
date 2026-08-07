import assert from 'node:assert/strict';
import { LocationType } from '@guardian/interfaces';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { InformationBlock } from '../../../dist/policy-engine/blocks/information-block.js';

describe('@unit block-exec harness smoke', () => {
    after(() => restoreHarness());

    it('InformationBlock.getData returns the block envelope', async () => {
        const { block } = makeBlock(InformationBlock, {
            uuid: 'info-1',
            options: { uiMetaData: { title: 'Hello' } },
            policyOverrides: { locationType: LocationType.LOCAL },
        });
        const data = await block.getData(makeUser());
        assert.equal(data.id, 'info-1');
        assert.equal(data.blockType, 'informationBlock');
        assert.deepEqual(data.uiMetaData, { title: 'Hello' });
        assert.equal(data.readonly, false);
    });

    it('InformationBlock is a LOCAL block, so getData stays non-readonly even for a remote user', async () => {
        const { block } = makeBlock(InformationBlock, { options: {} });
        const data = await block.getData(makeUser({ location: LocationType.REMOTE }));
        assert.equal(data.actionType, LocationType.LOCAL);
        assert.equal(data.readonly, false);
    });

    it('exposes uuid / options / tag from construction', () => {
        const { block } = makeBlock(InformationBlock, { uuid: 'u9', tag: 't9', options: { a: 1 } });
        assert.equal(block.uuid, 'u9');
        assert.equal(block.tag, 't9');
        assert.deepEqual(block.options, { a: 1 });
    });
});
