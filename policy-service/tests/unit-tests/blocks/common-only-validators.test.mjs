import { assert } from 'chai';
import { PolicyRolesBlock } from '../../../dist/policy-engine/block-validators/blocks/policy-roles.js';
import { GroupManagerBlock } from '../../../dist/policy-engine/block-validators/blocks/group-manager.js';
import { PaginationAddon } from '../../../dist/policy-engine/block-validators/blocks/pagination-addon.js';
import { InterfaceContainerBlock } from '../../../dist/policy-engine/block-validators/blocks/container-block.js';
import { HistoryAddon } from '../../../dist/policy-engine/block-validators/blocks/history-addon.js';
import { InterfaceStepBlock } from '../../../dist/policy-engine/block-validators/blocks/step-block.js';
import { ReportBlock } from '../../../dist/policy-engine/block-validators/blocks/report-block.js';
import { ReportItemBlock } from '../../../dist/policy-engine/block-validators/blocks/report-item-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refOK = () => ({ options: {} });

describe('CommonBlock-delegating validators expose the expected blockType', () => {
    const cases = [
        ['policyRolesBlock', PolicyRolesBlock],
        ['groupManagerBlock', GroupManagerBlock],
        ['paginationAddon', PaginationAddon],
        ['interfaceContainerBlock', InterfaceContainerBlock],
        ['historyAddon', HistoryAddon],
        ['interfaceStepBlock', InterfaceStepBlock],
        ['reportBlock', ReportBlock],
        ['reportItemBlock', ReportItemBlock],
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
