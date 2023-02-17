import { Logger, MessageBrokerChannel } from '@guardian/common';
import { PolicyEvents } from '@guardian/interfaces';
import path from 'path';
import { fork, ChildProcess } from 'node:child_process';
import * as process from 'process';

/**
 * Policy processes
 */
const models = new Map<string, ChildProcess>();

/**
 * Policy module path
 */
export const POLICY_PROCESS_PATH = path.join(__dirname, 'policy-process');

/**
 * Stop policy process
 * @param policyId
 * @param policyServiceName
 */
function stopPolicyProcess(policyId: string, policyServiceName: string): void {
    const logger = new Logger();

    if (models.has(policyServiceName)) {
        models.get(policyServiceName).kill(9);
        models.delete(policyServiceName);

        logger.info(`Policy process killed`, ['POLICY-SERVICE', policyId]);
    }
}

/**
 * Run policy process
 * @param policy
 * @param policyId
 * @param policyServiceName
 * @param skipRegistration
 * @param resultsContainer
 */
function runPolicyProcess(policy: unknown, policyId: string, policyServiceName: string, skipRegistration: boolean, resultsContainer: unknown): void {
    stopPolicyProcess(policyId, policyServiceName);

    const logger = new Logger();

    const childEnvironment = Object.assign(process.env, {
        POLICY_START_OPTIONS: JSON.stringify({
            policy,
            policyId,
            policyServiceName,
            skipRegistration,
            resultsContainer
        }),

    })

    const childProcess = fork(POLICY_PROCESS_PATH, {
        env: childEnvironment,
        silent: false,
        detached: false
    });
    childProcess.on('error', (error) => {
        logger.error(error.message, ['POLICY-SERVICE', policyId]);
        // Restart policy
    });
    childProcess.on('exit', (code) => {
        logger.info(`Policy process exit with code ${code}`, ['POLICY-SERVICE', policyId]);
    });
    models.set(policyServiceName, childProcess);
}

/**
 * Connect to the message broker methods of working with schemas.
 *
 * @param channel - channel
 */
export async function policyAPI(channel: MessageBrokerChannel): Promise<void> {
    channel.subscribe(PolicyEvents.GENERATE_POLICY, async (data: any) => {
        const {
            policy,
            policyServiceName,
            policyId,
            skipRegistration,
            resultsContainer
        } = data;

        runPolicyProcess(policy, policyId, policyServiceName, skipRegistration, resultsContainer);
    });

    channel.subscribe(PolicyEvents.DELETE_POLICY, async (data: any) => {
        const { policyId, policyServiceName } = data;

        stopPolicyProcess(policyId, policyServiceName);
    });
}
