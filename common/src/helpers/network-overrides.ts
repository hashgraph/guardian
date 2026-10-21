import { Environment } from './environment.js';

/**
 * Receives the name of the variable holding invalid JSON and the parse error
 */
export type NetworkOverrideWarn = (variableName: string, error: Error) => Promise<void> | void;

/**
 * Apply OVERRIDE_* network variables to Environment.
 * Must run before Environment.setNetwork, which derives the mirror API from them.
 * @param env Environment variables
 * @param warn Called for each variable that is not valid JSON; the others are still applied
 */
export async function applyNetworkOverrides(
    env: NodeJS.ProcessEnv,
    warn: NetworkOverrideWarn
): Promise<void> {
    if (env.OVERRIDE_NETWORK_CONFIGURATION !== 'true') {
        return;
    }

    if (env.OVERRIDE_HEDERA_CONSENSUS_NODES) {
        try {
            Environment.setNodes(JSON.parse(env.OVERRIDE_HEDERA_CONSENSUS_NODES));
        } catch (error) {
            await warn('OVERRIDE_HEDERA_CONSENSUS_NODES', error);
        }
    }

    if (env.OVERRIDE_HEDERA_MIRROR_NODES) {
        try {
            Environment.setMirrorNodes(JSON.parse(env.OVERRIDE_HEDERA_MIRROR_NODES));
        } catch (error) {
            await warn('OVERRIDE_HEDERA_MIRROR_NODES', error);
        }
    }

    if (env.OVERRIDE_HEDERA_MIRROR_NODES_BASE_API) {
        Environment.setMirrorNodesBaseApi(env.OVERRIDE_HEDERA_MIRROR_NODES_BASE_API);
    }
}
