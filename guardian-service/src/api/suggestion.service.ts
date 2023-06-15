import { ApiResponse } from '@api/helpers/api-response';
import {
    MessageResponse,
    MessageError,
    DatabaseServer,
    IAuthUser,
} from '@guardian/common';
import {
    ConfigType,
    MessageAPI,
    SuggestionOrderPriority,
    sortObjectsArray,
} from '@guardian/interfaces';

/**
 * Connect to the message broker methods of working with suggestion.
 */
export async function suggestionAPI(): Promise<void> {
    /**
     * Check config in template
     * @param srcNode Source config node
     * @param destNode Destination config node
     * @param parent Parent node
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
                (srcNode) => srcNode?.blockType === destNodes[0].type
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
                    srcNode.blockType !== destNode.type
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
            if (!destNodes[destNodes.length - 1].children) {
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
     * @param srcNode Source node
     * @param destNode Destination node
     * @param parent Parent
     * @returns Next and nested nodes for destination config node
     */
    function checkConfigsInTemplate(srcNodes: any, destNodes: any) {
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
     * check configs in templates
     * @param srcNodes Source nodes
     * @param destNode Destination node
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
     * @param {any} msg User and suggestion input
     * @returns Suggusted next and nested blocks
     */
    ApiResponse(MessageAPI.SUGGESTION, async (msg: any) => {
        try {
            const {
                suggestionInput,
                user,
            }: { suggestionInput: any; user: IAuthUser } = msg;
            if (!user?.did) {
                throw new Error('Invalid user did');
            }
            const suggestionConfig = await DatabaseServer.getSuggestionConfig(
                user.did
            );
            const suggestionConfigItems = sortObjectsArray(
                suggestionConfig?.items || [],
                'index'
            );
            const configs: any[] = [];
            for (const item of suggestionConfigItems) {
                const config =
                    item.type === ConfigType.POLICY
                        ? await DatabaseServer.getPolicyById(item.id)
                        : await DatabaseServer.getModuleById(item.id);
                configs.push(config?.config);
            }
            const [next, nested] = checkConfigsInTemplates(
                configs,
                Array.isArray(suggestionInput)
                    ? suggestionInput
                    : [suggestionInput]
            );
            return new MessageResponse({ next, nested });
        } catch (error) {
            return new MessageError(error);
        }
    });

    /**
     * Set suggestion config
     *
     * @param {any} msg User and items
     * @returns Applyied suggestion config items
     */
    ApiResponse(MessageAPI.SET_SUGGESTION_CONFIG, async (msg: any) => {
        try {
            const {
                items,
                user,
            }: { items: SuggestionOrderPriority; user: IAuthUser } = msg;
            if (!user?.did) {
                throw new Error('Invalid user did');
            }
            if (!Array.isArray(items)) {
                throw new Error('Invalid items for suggestion config');
            }
            const config = await DatabaseServer.setSuggestionConfig({
                user: user.did,
                items,
            } as any);
            return new MessageResponse(config.items);
        } catch (error) {
            return new MessageError(error);
        }
    });

    /**
     * Get suggestion config
     *
     * @param {any} msg User
     * @returns Suggestion config items
     */
    ApiResponse(MessageAPI.GET_SUGGESTION_CONFIG, async (msg: any) => {
        try {
            const { user }: { user: IAuthUser } = msg;
            if (!user?.did) {
                throw new Error('Invalid user did');
            }
            const config = await DatabaseServer.getSuggestionConfig(user.did);
            return new MessageResponse(config?.items || []);
        } catch (error) {
            return new MessageError(error);
        }
    });
}
