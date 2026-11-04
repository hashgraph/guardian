import { VcHelper } from '@guardian/hedera/vc-helper';
import { LocationType } from '@guardian/interfaces';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';

export function installCredentialPreparation() {
    const saved = [
        [VcHelper, 'getSchemaByContext', VcHelper.getSchemaByContext],
        [PolicyUtils, 'getUserCredentials', PolicyUtils.getUserCredentials],
        [PolicyUtils, 'getBlockTags', PolicyUtils.getBlockTags],
        [PolicyUtils, 'getGroupContext', PolicyUtils.getGroupContext]
    ];
    VcHelper.getSchemaByContext = async () => null;
    PolicyUtils.getUserCredentials = async (_ref, did) => ({
        did,
        location: LocationType.LOCAL,
        loadDidDocument: async () => ({ getDid: () => did })
    });
    PolicyUtils.getBlockTags = async () => [];
    PolicyUtils.getGroupContext = async () => null;
    return () => {
        for (const [target, key, value] of saved) target[key] = value;
    };
}
