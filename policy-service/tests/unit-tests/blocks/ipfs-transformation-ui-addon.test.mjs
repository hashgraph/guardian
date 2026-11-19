import { assert } from 'chai';
import { IpfsTransformationUIAddon } from '../../../dist/policy-engine/blocks/ipfs-transformation-ui-addon.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

describe('IPFS transformation addon gateway configuration', () => {
    const originalRef = PolicyComponentsUtils.GetBlockRef;
    const originalOptions = PolicyComponentsUtils.GetBlockUniqueOptionsObject;

    afterEach(() => {
        PolicyComponentsUtils.GetBlockRef = originalRef;
        PolicyComponentsUtils.GetBlockUniqueOptionsObject = originalOptions;
    });

    it('offers Filebase as the default gateway template for a new block', () => {
        const property = IpfsTransformationUIAddon.about.properties.find((item) => item.name === 'ipfsGatewayTemplate');
        assert.exists(property);
        assert.equal(property.default, 'https://ipfs.filebase.io/ipfs/{cid}');
    });

    for (const template of ['https://ipfs.io/ipfs/{cid}', 'https://mgs.example/api/v1/ipfs/file/{cid}']) {
        it(`returns the saved template ${template} without rewriting policy data`, async () => {
            const options = { transformationType: 'ipfsGateway', ipfsGatewayTemplate: template };
            PolicyComponentsUtils.GetBlockRef = () => ({ uuid: 'block', blockType: 'ipfsTransformationUIAddon', actionType: 'remote' });
            PolicyComponentsUtils.GetBlockUniqueOptionsObject = () => options;
            const block = Object.create(IpfsTransformationUIAddon.prototype);
            const result = await block.getData({ location: 'local' });
            assert.equal(result.ipfsGatewayTemplate, template);
            assert.equal(result.transformationType, 'ipfsGateway');
            assert.deepEqual(options, { transformationType: 'ipfsGateway', ipfsGatewayTemplate: template });
        });
    }
});
