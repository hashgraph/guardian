import { LocationType } from '@guardian/interfaces';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { UIAddon } from '../helpers/decorators/index.js';
import { IPolicyGetData, AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';

/**
 * IPFS Transformation UI Addon
 */
@UIAddon({
    blockType: 'ipfsTransformationUIAddon',
    actionType: LocationType.REMOTE,
    commonBlock: false,
    about: {
        label: 'IPFS Transformation UI Addon',
        title: `Add 'Transformation UI Addon' Block`,
        post: false,
        get: true,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [
            {
                name: 'transformationType',
                label: 'Transformation Type',
                title: 'Transformation Type',
                type: PropertyType.Select,
                items: [
                    {
                        label: 'Base64',
                        value: 'base64'
                    },
                    {
                        label: 'IPFS Gateway',
                        value: 'ipfsGateway'
                    },
                ],
                default: 'base64',
                required: true,
            },
            {
                name: 'ipfsGatewayTemplate',
                label: 'IPFS Gateway Template',
                title: 'IPFS Gateway Template',
                type: PropertyType.Input,
                visible: 'transformationType === "ipfsGateway"',
                default: 'https://{cid}.ipfs.w3s.link',
                required: true
            },
        ]
    },
    variables: []
})
export class IpfsTransformationUIAddon {

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const options = PolicyComponentsUtils.GetBlockUniqueOptionsObject(this);
        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            expression: options.expression,
            transformationType: options.transformationType,
            ipfsGatewayTemplate: options.ipfsGatewayTemplate,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            )
        };
    }
}