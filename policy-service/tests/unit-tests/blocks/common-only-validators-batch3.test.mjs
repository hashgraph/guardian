import { assert } from 'chai';
import { DataTransformationAddon } from '../../../dist/policy-engine/block-validators/blocks/data-transformation-addon.js';
import { IpfsTransformationUIAddon } from '../../../dist/policy-engine/block-validators/blocks/ipfs-transformation-ui-addon.js';
import { TransformationUIAddon } from '../../../dist/policy-engine/block-validators/blocks/transformation-ui-addon.js';
import { HttpRequestUIAddon } from '../../../dist/policy-engine/block-validators/blocks/http-request-ui-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refOK = () => ({ options: {} });

describe('@unit Final batch — CommonBlock-delegating validators', () => {
    const cases = [
        ['dataTransformationAddon', DataTransformationAddon, refOK],
        ['ipfsTransformationUIAddon', IpfsTransformationUIAddon, refOK],
        ['transformationUIAddon', TransformationUIAddon, () => ({ options: { expression: '1 + 1' } })],
        ['httpRequestUIAddon', HttpRequestUIAddon, () => ({ options: { url: 'https://example.com/api', method: 'get' } })],
    ];

    for (const [expected, Block] of cases) {
        it(`${Block.name}.blockType === '${expected}'`, () => {
            assert.equal(Block.blockType, expected);
        });
    }

    for (const [, Block, makeRef] of cases) {
        it(`${Block.name}.validate produces no errors for a valid options object`, async () => {
            const v = new FakeValidator();
            await Block.validate(v, makeRef());
            assert.deepEqual(v.errors, []);
        });
    }

    for (const [, Block] of cases) {
        it(`${Block.name}.validate captures an unhandled exception as an error (does not throw)`, async () => {
            const v = new FakeValidator();
            // CommonBlock walks ref.options.artifacts; throw from getArtifact to force the catch path.
            v.getArtifact = async () => { throw new Error('boom'); };
            await Block.validate(v, { options: { artifacts: [{ uuid: 'a-1' }] } });
            assert.equal(
                v.errors.some((e) => /boom|does not exist|Artifact/i.test(e)),
                true,
                `expected captured error, got: ${JSON.stringify(v.errors)}`,
            );
        });
    }
});
