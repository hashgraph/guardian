import { Logger, MessageBrokerChannel } from '@guardian/common';
import { PolicyEvents } from '@guardian/interfaces';
import path from 'path';
import { fork } from 'node:child_process';
import * as process from 'process';

/**
 * Max policy instances
 */
const MAX_POLICY_INSTANCES = (process.env.MAX_POLICY_INSTANCES) ? parseInt(process.env.MAX_POLICY_INSTANCES, 10) : 1000;

/**
 * Refresh interval
 */
const REQUEST_REFRESH_INTERVAL = (process.env.REQUEST_REFRESH_INTERVAL) ? parseInt(process.env.REQUEST_REFRESH_INTERVAL, 10) * 1000 : 10000;

/**
 * Policy module path
 */
export const POLICY_PROCESS_PATH = path.join(__dirname, 'policy-process');

let processCount = 0;

/**
 * Run policy process
 * @param policy
 * @param policyId
 * @param policyServiceName
 * @param skipRegistration
 * @param resultsContainer
 */
function runPolicyProcess(policyId: string, policyServiceName: string, skipRegistration: boolean): void {
    const logger = new Logger();

    const childEnvironment = Object.assign(process.env, {
        POLICY_START_OPTIONS: JSON.stringify({
            policyId,
            policyServiceName,
            skipRegistration,
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
        --processCount;
    });
}

/**
 * Request and run policy process
 * @param channel
 */
async function requestAndRunPolicyProcess(channel: MessageBrokerChannel): Promise<void> {
    if (processCount <= MAX_POLICY_INSTANCES) {
        processCount++;
        const data = await channel.request(['guardians', PolicyEvents.GET_POLICY_ITEM].join('.'), {});
        if (data?.body) {
            const {
                policyServiceName,
                policyId,
                skipRegistration
            } = data.body as any;

            console.log(policyId);
            runPolicyProcess(policyId, policyServiceName, skipRegistration)
        } else {
            processCount--;
        }
    } else {
        console.log('maximum instances exceed', processCount);
    }
}

/**
 * Connect to the message broker methods of working with schemas.
 *
 * @param channel - channel
 */
export async function policyAPI(channel: MessageBrokerChannel): Promise<void> {
    setInterval(async () => {
        await requestAndRunPolicyProcess(channel);
    }, REQUEST_REFRESH_INTERVAL)

    channel.subscribe(PolicyEvents.POLICY_LIST_UPDATED, async () => {
       await requestAndRunPolicyProcess(channel);
    });
}
