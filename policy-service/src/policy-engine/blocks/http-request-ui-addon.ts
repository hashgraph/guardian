import { LocationType } from '@guardian/interfaces';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { UIAddon } from '../helpers/decorators/index.js';
import { IPolicyGetData, AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';

/**
 * Http Request UI Addon
 */
@UIAddon({
    blockType: 'httpRequestUIAddon',
    actionType: LocationType.REMOTE,
    commonBlock: false,
    about: {
        label: 'Http Request UI Addon',
        title: `Add 'Http Request UI Addon' Block`,
        post: false,
        get: true,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [
            {
                name: 'method',
                label: 'Method',
                title: 'Method',
                type: PropertyType.Select,
                items: [
                    {
                        label: 'Get',
                        value: 'get'
                    },
                    {
                        label: 'Post',
                        value: 'post'
                    },
                    {
                        label: 'Put',
                        value: 'put'
                    }
                ],
                default: 'get',
                required: true
            },
            {
                name: 'url',
                label: 'URL',
                title: 'URL',
                type: PropertyType.Input,
                required: true
            },
            {
                name: 'authentication',
                label: 'Authentication',
                title: 'Authentication',
                type: PropertyType.Select,
                items: [
                    {
                        label: 'No Auth',
                        value: ''
                    },
                    {
                        label: 'Bearer Token',
                        value: 'bearerToken'
                    },
                ],
                default: ''
            },
            {
                name: 'authenticationURL',
                label: 'Authentication Url',
                title: 'Authentication Url',
                type: PropertyType.Input,
                visible: 'authentication === "bearerToken"',
                default: ''
            },
            {
                name: 'authenticationClientId',
                label: 'Authentication ClientId',
                title: 'Authentication ClientId',
                type: PropertyType.Input,
                visible: 'authentication === "bearerToken"',
                default: ''
            },
            {
                name: 'authenticationScopes',
                label: 'Authentication Scopes',
                title: 'Authentication Scopes',
                type: PropertyType.Input,
                visible: 'authentication === "bearerToken"',
                default: ''
            },
            {
                name: 'headers',
                label: 'Headers',
                title: 'Headers',
                type: PropertyType.Array,
                items: {
                    label: 'Header',
                    value: '',
                    properties: [
                        {
                            name: 'name',
                            label: 'Header name',
                            title: 'Header name',
                            type: PropertyType.Input
                        },
                        {
                            name: 'value',
                            label: 'Header value',
                            title: 'Header value',
                            type: PropertyType.Input
                        }
                    ]
                }
            }
        ]
    },
    variables: []
})
export class HttpRequestUIAddon {

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
            method: options.method,
            url: options.url,
            headers: options.headers,
            authentication: options.authentication,
            authenticationClientId: options.authenticationClientId,
            authenticationScopes: options.authenticationScopes,
            authenticationURL: options.authenticationURL,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            )
        };
    }
}
