import { assert } from 'chai';
import { CustomLogicBlock } from '../../../dist/policy-engine/block-validators/blocks/custom-logic-block.js';
import { ExtractDataBlock } from '../../../dist/policy-engine/block-validators/blocks/extract-data.js';
import { SetRelationshipsBlock } from '../../../dist/policy-engine/block-validators/blocks/set-relationships-block.js';
import { TagsManagerBlock } from '../../../dist/policy-engine/block-validators/blocks/tag-manager.js';
import { SelectiveAttributes } from '../../../dist/policy-engine/block-validators/blocks/selective-attributes-addon.js';
import { MessagesReportBlock } from '../../../dist/policy-engine/block-validators/blocks/messages-report-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refOK = () => ({ options: {} });

describe('Additional CommonBlock-delegating validators', () => {
    const cases = [
        ['customLogicBlock', CustomLogicBlock],
        ['extractDataBlock', ExtractDataBlock],
        ['setRelationshipsBlock', SetRelationshipsBlock],
        ['tagsManager', TagsManagerBlock],
        ['selectiveAttributes', SelectiveAttributes],
        ['messagesReportBlock', MessagesReportBlock],
    ];

    for (const [expected, Block] of cases) {
        it(`${Block.name}.blockType === '${expected}'`, () => {
            assert.equal(Block.blockType, expected);
        });
    }

    for (const [_, Block] of cases) {
        it(`${Block.name}.validate produces no errors for an empty options object`, async () => {
            const v = new FakeValidator();
            await Block.validate(v, refOK());
            assert.deepEqual(v.errors, []);
        });
    }
});
