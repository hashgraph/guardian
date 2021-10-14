import {BlockActionError} from "@policy-engine/errors";
import {StateContainer} from "@policy-engine/state-container";

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
    } catch (e) {
        throw new BlockActionError(e.message, StateContainer.GetBlockByUUID(updateTarget).blockType, updateTarget);
    }
    return Object.assign({}, state, updates);
}
