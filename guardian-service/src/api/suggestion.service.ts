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
    function checkConfigInTemplate(
        srcNode: any,
        destNode: any,
        parent?: any
    ): any {
        const stack: any = [
            {
                srcNode,
                destNode,
                parent,
            },
        ];
        while (stack.length > 0) {
            // tslint:disable-next-line:no-shadowed-variable
            const { srcNode, destNode, parent } = stack.pop();
            if (!destNode || !srcNode || srcNode.blockType !== destNode.type) {
                return [null, null];
            }
            if (!destNode.children) {
                return [
                    (parent?.children &&
                        parent.children[parent.children.indexOf(srcNode) + 1]
                            ?.blockType) ||
                        null,
                    (srcNode?.children && srcNode?.children[0]?.blockType) ||
                        null,
                ];
            }
            if (!srcNode.children?.length) {
                return [null, null];
            }
            for (let i = 0; i < destNode.children.length; i++) {
                const srcChild = srcNode.children[i];
                const destChild = destNode.children[i];
                if (
                    !srcChild ||
                    !destChild ||
                    srcChild?.blockType !== destChild.type
                ) {
                    return [null, null];
                }
            }
            stack.push({
                srcNode: srcNode.children[destNode.children.length - 1],
                destNode: destNode.children[destNode.children.length - 1],
                parent: srcNode,
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
    function checkConfigsInTemplate(srcNode: any, destNode: any, parent?: any) {
        const stack: any = [
            {
                srcNode,
                destNode,
                parent,
            },
        ];
        while (stack.length > 0) {
            // tslint:disable-next-line:no-shadowed-variable
            const { srcNode, destNode, parent } = stack.pop();
            let [next, nested] = checkConfigInTemplate(
                srcNode,
                destNode,
                parent
            );
            next = next === 'module' ? null : next;
            nested = nested === 'module' ? null : nested;
            if (next || nested) {
                return [next, nested];
            }
            if (srcNode?.children) {
                stack.push(
                    ...srcNode.children
                        .map((item) => ({
                            srcNode: item,
                            destNode,
                            parent: srcNode,
                        }))
                        .reverse()
                );
            }
        }
        return [null, null];
    }

    /**
     * check configs in templates
     * @param srcNodes Source nodes
     * @param destNode Destination node
     * @returns Next and nested nodes for destination config node
     */
    function checkConfigsInTemplates(srcNodes: any[], destNode: any) {
        const stack: any = [
            {
                srcNodes,
                destNode,
            },
        ];
        while (stack.length > 0) {
            // tslint:disable-next-line:no-shadowed-variable
            const { srcNodes, destNode } = stack.pop();
            let next = null;
            let nested = null;
            if (!destNode || !srcNodes.length) {
                return [next, nested];
            }
            for (const srcNode of srcNodes) {
                [next, nested] = checkConfigsInTemplate(srcNode, destNode);
                if (next || nested) {
                    return [next, nested];
                }
            }
            if (
                !next &&
                !nested &&
                destNode.children &&
                destNode.children[destNode.children.length - 1]
            ) {
                stack.push({
                    srcNodes,
                    destNode: destNode.children[destNode.children.length - 1],
                });
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
            return new MessageResponse(
                checkConfigsInTemplates(configs, suggestionInput)
            );
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
