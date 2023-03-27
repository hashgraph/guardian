import { Logger, NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import path from 'path';
import { execFile, fork, ChildProcess } from 'node:child_process';
import * as process from 'process';
import { headers, NatsConnection } from 'nats';

/**
 * Max policy instances
 */
const MAX_POLICY_INSTANCES = (process.env.MAX_POLICY_INSTANCES) ? parseInt(process.env.MAX_POLICY_INSTANCES, 10) : 1000;
/**
 * Service scripts
 */
const { RUN_SERVICE_SCRIPT, STOP_SERVICE_SCRIPT } = process.env;

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
        this.connection.subscribe(event, {
            queue: this.messageQueueName,
            callback: async (error, msg) => {
                const messageId = msg.headers.get('messageId');
                const head = headers();
                head.append('messageId', messageId);

                const respond = await cb(this.jsonCodec.decode(msg.data), msg.headers);
                if (respond) {
                    msg.respond(this.jsonCodec.encode(null), {headers: head});
                }
            }
        });
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

let processCount = 0;

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
        --processCount;
        if (processCount === 0) {
            execFile(STOP_SERVICE_SCRIPT, (error, _data) => {
                if (error) {
                    logger.error(error, ['POLICY-SERVICE', STOP_SERVICE_SCRIPT]);
                    return;
                }
                logger.info(_data, ['POLICY-SERVICE', STOP_SERVICE_SCRIPT]);
            })
        }
    });
    models.set(policyId, childProcess);
    processCount++;
}

/**
 * Connect to the message broker methods of working with schemas.
 *
 * @param cn
 */
export async function policyAPI(cn: NatsConnection): Promise<void> {
    const channel = new PolicyEngineChannel();
    await channel.setConnection(cn).init();

    channel.subscribe(PolicyEvents.GET_FREE_POLICY_SERVICES, (msg) => {
        const { replySubject } = msg;
        if (replySubject) {
            channel.publish(replySubject, {
                service: process.env.SERVICE_CHANNEL,
                free: processCount <= MAX_POLICY_INSTANCES
            })
        }
    });

    channel.registerListener(PolicyEvents.GENERATE_POLICY, async (data: any) => {
        if (processCount <= MAX_POLICY_INSTANCES) {
            const {
                policy,
                policyServiceName,
                policyId,
                skipRegistration,
                resultsContainer
            } = data;
            runPolicyProcess(policy, policyId, policyServiceName, skipRegistration, resultsContainer);
            return true;
        } else {
            if (RUN_SERVICE_SCRIPT) {
                const freeServices = [];
                const sub = channel.subscribe([channel.replySubject, PolicyEvents.POLICY_SERVICE_FREE_STATUS].join('-'), (msg) => {
                    freeServices.push(msg);
                })

                channel.publish(PolicyEvents.GET_FREE_POLICY_SERVICES, {
                    replySubject: [channel.replySubject, PolicyEvents.POLICY_SERVICE_FREE_STATUS].join('-')
                });

                setTimeout(() => {
                    sub.unsubscribe();
                    console.log(freeServices);
                    let freeExist = true;

                    for (const s of freeServices) {
                        freeExist = freeExist && s.free
                    }
                    if (!freeExist) {
                        console.log('run', RUN_SERVICE_SCRIPT);
                        execFile(RUN_SERVICE_SCRIPT, (error, _data) => {
                            const logger = new Logger();
                            if (error) {
                                logger.error(error, ['POLICY-SERVICE', RUN_SERVICE_SCRIPT]);
                                return;
                            }
                            logger.info(_data, ['POLICY-SERVICE', RUN_SERVICE_SCRIPT]);
                        })
                    }
                }, 1000);
            }
        }

        return false;
    });

    channel.registerListener(PolicyEvents.DELETE_POLICY, async (data: any) => {
        const { policyId } = data;

        stopPolicyProcess(policyId);
        return true;
    });
}
