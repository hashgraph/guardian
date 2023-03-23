import { Logger, NatsService } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import path from 'path';
import { fork, ChildProcess } from 'node:child_process';
import * as process from 'process';
import { Singleton } from 'api-gateway/dist/helpers/decorators/singleton';
import { NatsConnection } from 'nats';

/**
 * PolicyEngineChannel
 */
@Singleton
export class PolicyEngineChannel extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'policy-service-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'policy-service-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listener
     * @param event
     * @param cb
     */
    registerListener(event: string, cb: Function): void {
        this.getMessages(event, cb, true);
    }
}

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
function stopPolicyProcess(policyId: string): void {
    const logger = new Logger();

    if (models.has(policyId)) {
        models.get(policyId).kill(9);
        models.delete(policyId);

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
    stopPolicyProcess(policyId);

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
    models.set(policyId, childProcess);
}

/**
 * Connect to the message broker methods of working with schemas.
 *
 * @param cn
 */
export async function policyAPI(cn: NatsConnection): Promise<void> {
    const channel = new PolicyEngineChannel();
    await channel.setConnection(cn).init();

    channel.registerListener(PolicyEvents.GENERATE_POLICY, async (data: any) => {
        const {
            policy,
            policyServiceName,
            policyId,
            skipRegistration,
            resultsContainer
        } = data;

        runPolicyProcess(policy, policyId, policyServiceName, skipRegistration, resultsContainer);
    });

    channel.registerListener(PolicyEvents.DELETE_POLICY, async (data: any) => {
        const { policyId, policyServiceName } = data;

        stopPolicyProcess(policyId, policyServiceName);
    });
}
