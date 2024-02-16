import { BlockActionError } from '@policy-engine/errors';
import { PolicyComponentsUtils } from '../../policy-components-utils';

/**
 * Transform block state
 * @param rules
 * @param state
 * @param updateSource
 * @param updateTarget
 * @constructor
 */
export function TransformState(rules: any, state: any, updateSource: string, updateTarget: string): any {
    if (!rules) {
        return state;
    }

    let rule = updateSource;
    if (!updateSource) {
        rule = 'self';
    }
    const configuration = rules[rule];

    if (!configuration) {
        return state;
    }

    const expression = new Function('state', `with (state) { return ${configuration.expression} ${configuration.source} }`);
    const updates = {};
    try {
        updates[configuration.target] = expression(state);
    } catch (error) {
        throw new BlockActionError(error.message, PolicyComponentsUtils.GetBlockByUUID(updateTarget).blockType, updateTarget);
    }
    return Object.assign({}, state, updates);
}
