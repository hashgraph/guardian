import { ApiResponse } from '../api/helpers/api-response.js';
import {
    MessageResponse,
    MessageError,
    DatabaseServer,
    IAuthUser,
} from '@guardian/common';
import {
    ConfigType,
    MessageAPI,
    SuggestionsOrderPriority,
    sortObjectsArray,
} from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with suggestions.
 */
export async function suggestionsAPI(): Promise<void> {
    /**
     * Check config in template
     * @param srcNodes Source nodes
     * @param destNodes Destination nodes
     * @returns Next and nested nodes for destination config node
     */
    function checkConfigInTemplate(srcNodes: any[], destNodes: any[]): any {
        const stack: any = [
            {
                srcNodes,
                destNodes,
            },
        ];
        while (stack.length > 0) {
            // tslint:disable-next-line:no-shadowed-variable
            const { srcNodes, destNodes } = stack.pop();
            if (!srcNodes || !destNodes || !destNodes[0]) {
                continue;
            }
            const i = srcNodes.findIndex(
                (srcNode) => srcNode?.blockType === destNodes[0].blockType
            );
            if (i < 0) {
                continue;
            }
            let notMatch = false;
            for (let j = 0; j < destNodes.length; j++) {
                const srcNode = srcNodes[i + j];
                const destNode = destNodes[j];
                if (
                    !destNode ||
                    !srcNode ||
                    srcNode.blockType !== destNode.blockType
                ) {
                    notMatch = true;
                    break;
                }
            }
            if (notMatch) {
                if (srcNodes.length > i + 1) {
                    stack.push({
                        srcNodes: srcNodes.slice(i + 1, srcNodes.length),
                        destNodes,
                    });
                }
                continue;
            }
            if (!destNodes[destNodes.length - 1].children?.length) {
                return [
                    (srcNodes && srcNodes[i + destNodes.length]?.blockType) ||
                    null,
                    (srcNodes[i + destNodes.length - 1].children &&
                        srcNodes[i + destNodes.length - 1]?.children[0]
                            ?.blockType) ||
                    null,
                ];
            }
            stack.push({
                srcNodes: srcNodes[i + destNodes.length - 1].children,
                destNodes: destNodes[destNodes.length - 1].children,
            });
        }
        return [null, null];
    }

    /**
     * Check configs in templates
     * @param srcNodes Source nodes
     * @param destNodes Destination nodes
     * @returns Next and nested nodes for destination config node
     */
    function checkConfigsInTemplate(srcNodes: any[], destNodes: any[]) {
        const stack: any = [
            {
                srcNodes,
                destNodes,
            },
        ];
        while (stack.length > 0) {
            // tslint:disable-next-line:no-shadowed-variable
            const { srcNodes, destNodes } = stack.pop();
            if (!srcNodes) {
                continue;
            }
            let [next, nested] = checkConfigInTemplate(srcNodes, destNodes);
            next = next === 'module' ? null : next;
            nested = nested === 'module' ? null : nested;
            if (next || nested) {
                return [next, nested];
            }
            stack.push(
                ...srcNodes
                    .map((srcNode) => ({
                        srcNodes: srcNode?.children,
                        destNodes,
                    }))
                    .reverse()
            );
        }
        return [null, null];
    }

    /**
     * Check configs in templates
     * @param srcNodes Source nodes
     * @param destNodes Destination nodes
     * @returns Next and nested nodes for destination config node
     */
    function checkConfigsInTemplates(srcNodes: any[], destNodes: any[]) {
        const stack: any = [
            {
                srcNodes,
                destNodes,
            },
        ];
        while (stack.length > 0) {
            // tslint:disable-next-line:no-shadowed-variable
            const { srcNodes, destNodes } = stack.pop();
            let next = null;
            let nested = null;
            if (!destNodes?.length || !srcNodes.length) {
                continue;
            }
            [next, nested] = checkConfigsInTemplate(srcNodes, destNodes);
            if (next || nested) {
                return [next, nested];
            }
            if (!next && !nested) {
                if (destNodes.length === 1) {
                    stack.push({
                        srcNodes,
                        destNodes: destNodes[0].children,
                    });
                } else {
                    destNodes.shift();
                    stack.push({
                        srcNodes,
                        destNodes,
                    });
                }
            }
        }
        return [null, null];
    }

    /**
     * Get next and nested block
     *
     * @param {any} msg User and suggestions input
     * @returns Suggusted next and nested blocks
     */
    ApiResponse(MessageAPI.SUGGESTIONS,
        async (msg: { suggestionsInput: any, user: IAuthUser }) => {
            try {
                const { suggestionsInput, user } = msg;
                if (!user?.did) {
                    throw new Error('Invalid user did');
                }
                const suggestionsConfig = await DatabaseServer.getSuggestionsConfig(
                    user.did
                );
                const suggestionsConfigItems = sortObjectsArray(
                    suggestionsConfig?.items || [],
                    'index'
                );
                const configs: any[] = [];
                for (const item of suggestionsConfigItems) {
                    const config =
                        item.type === ConfigType.POLICY
                            ? await DatabaseServer.getPolicyById(item.id)
                            : await DatabaseServer.getModuleById(item.id);
                    if (config) {
                        configs.push(config.config);
                    }
                }
                const [next, nested] = checkConfigsInTemplates(
                    configs,
                    Array.isArray(suggestionsInput)
                        ? suggestionsInput
                        : [suggestionsInput]
                );
                return new MessageResponse({ next, nested });
            } catch (error) {
                return new MessageError(error);
            }
        });

    /**
     * Set suggestions config
     *
     * @param {any} msg User and items
     * @returns Applyied suggestions config items
     */
    ApiResponse(MessageAPI.SET_SUGGESTIONS_CONFIG,
        async (msg: { items: SuggestionsOrderPriority[], user: IAuthUser }) => {
            try {
                const { items, user } = msg;
                if (!user?.did) {
                    throw new Error('Invalid user did');
                }
                if (!Array.isArray(items)) {
                    throw new Error('Invalid items for suggestions config');
                }
                const config = await DatabaseServer.setSuggestionsConfig({
                    user: user.did,
                    items,
                });
                return new MessageResponse(config.items);
            } catch (error) {
                return new MessageError(error);
            }
        });

    /**
     * Get suggestions config
     *
     * @param {any} msg User
     * @returns Suggestions config items
     */
    ApiResponse(MessageAPI.GET_SUGGESTIONS_CONFIG,
        async (msg: { user: IAuthUser }) => {
            try {
                const { user } = msg;
                if (!user?.did) {
                    throw new Error('Invalid user did');
                }
                const config = await DatabaseServer.getSuggestionsConfig(user.did);
                return new MessageResponse(config?.items || []);
            } catch (error) {
                return new MessageError(error);
            }
        });
}
