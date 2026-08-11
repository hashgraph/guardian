import { BlockErrorActions } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '../../policy-components-utils.js';
import { PinoLogger } from '@guardian/common';
import { PolicyOutputEventType } from '../../interfaces/index.js';

/**
 * Move the enclosing interfaceStepBlock off a failed non-UI child so the user is not left
 * on "This step isn't available to you right now" with no way forward. No-op unless the
 * parent is a step block that is actually parked on this block.
 * @param block
 * @param user
 * @param userId
 */
async function unparkStep(block: any, user: any, userId: string | null): Promise<void> {
    const parent = block?.parent;
    if (parent?.blockType !== 'interfaceStepBlock' || typeof parent.unparkStalledChild !== 'function') {
        return;
    }
    try {
        await parent.unparkStalledChild(user, block);
    } catch (error) {
        await new PinoLogger()?.error(
            error,
            ['guardian-service', block?.uuid, block?.blockType, 'unparkStalledChild failed', block?.policyId],
            userId
        );
    }
}

/**
 * Catch errors decorator
 * @constructor
 */
export function CatchErrors() {
    // tslint:disable-next-line:only-arrow-functions
    return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value = new Proxy(_target[propertyKey], {
            async apply(target: any, thisArg: any, argArray: any[]): Promise<any> {
                const user = argArray[0].user;
                const userId = argArray[0]?.userId;

                const data = argArray[0].data;
                const f = async () => {
                    try {
                        return await target.apply(thisArg, argArray);
                    } catch (error) {
                        switch (thisArg.options.onErrorAction) {
                            case BlockErrorActions.RETRY: {
                                await new PinoLogger().error(error, ['guardian-service', thisArg.uuid, thisArg.blockType, 'block-runtime', thisArg.policyId], userId);
                                PolicyComponentsUtils.BlockErrorFn(thisArg.blockType, error.message, user)
                                    .catch(async (err) => await new PinoLogger()?.error(err, ['guardian-service', thisArg?.uuid, thisArg?.blockType, 'BlockErrorFn failed', thisArg?.policyId], userId));
                                thisArg.triggerEvents(PolicyOutputEventType.ErrorEvent, user, data);

                                setTimeout(f, parseInt(thisArg.options.errorTimeout, 10));
                                break;
                            }

                            case BlockErrorActions.GOTO_STEP: {
                                await new PinoLogger().error(error, ['guardian-service', thisArg.uuid, thisArg.blockType, 'block-runtime', thisArg.policyId], userId);
                                PolicyComponentsUtils.BlockErrorFn(thisArg.blockType, error.message, user)
                                    .catch(async (err) => await new PinoLogger()?.error(err, ['guardian-service', thisArg?.uuid, thisArg?.blockType, 'BlockErrorFn failed', thisArg?.policyId], userId));
                                thisArg.triggerEvents(PolicyOutputEventType.ErrorEvent, user, data);

                                const stepParent = thisArg.parent;
                                const targetBlock = stepParent.children[parseInt(thisArg.options.errorFallbackStep, 10)];
                                if ((stepParent.blockType === 'interfaceStepBlock') && targetBlock) {
                                    await stepParent.changeStep(user, {}, targetBlock)
                                }
                                break;
                            }

                            case BlockErrorActions.GOTO_TAG: {
                                await new PinoLogger().error(error, ['guardian-service', thisArg.uuid, thisArg.blockType, 'block-runtime', thisArg.policyId], userId);
                                PolicyComponentsUtils.BlockErrorFn(thisArg.blockType, error.message, user)
                                    .catch(async (err) => await new PinoLogger()?.error(err, ['guardian-service', thisArg?.uuid, thisArg?.blockType, 'BlockErrorFn failed', thisArg?.policyId], userId));
                                thisArg.triggerEvents(PolicyOutputEventType.ErrorEvent, user, data);

                                const stepParent = thisArg.parent;
                                const targetBlock = stepParent.children.find(c => c.tag === thisArg.options.errorFallbackTag);
                                if ((stepParent.blockType === 'interfaceStepBlock') && targetBlock) {
                                    await stepParent.changeStep(user, {}, targetBlock)
                                }
                                break;
                            }

                            case BlockErrorActions.DEBUG: {
                                thisArg.debugError(error);
                                return;
                            }

                            default:
                                await new PinoLogger().error(error, ['guardian-service', thisArg.uuid, thisArg.blockType, 'block-runtime', thisArg.policyId], userId);
                                PolicyComponentsUtils.BlockErrorFn(thisArg.blockType, error.message, user)
                                    .catch(async (err) => await new PinoLogger()?.error(err, ['guardian-service', thisArg?.uuid, thisArg?.blockType, 'BlockErrorFn failed', thisArg?.policyId], userId));
                                thisArg.triggerEvents(PolicyOutputEventType.ErrorEvent, user, data);
                                // 'no-action' means "don't reroute the workflow", not "strand the
                                // user". A non-UI block that dies mid-chain leaves its enclosing
                                // step pointing at something with no UI, which the viewer renders
                                // as "This step isn't available to you right now" forever.
                                await unparkStep(thisArg, user, userId);
                                return;

                        }
                    }
                }

                return await f();
            }
        })
    }
}
