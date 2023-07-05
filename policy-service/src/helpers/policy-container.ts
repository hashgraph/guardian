import { Logger, MessageResponse, NatsService, Singleton } from '@guardian/common';
import { ChildProcess, execFile, fork } from 'node:child_process';
import process from 'process';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { Subscription } from 'nats';
import { POLICY_PROCESS_PATH } from '@api/policy-process-path';

/**
 * Policy start options
 */
export interface IPolicyStartOptions {
    /**
     * Service name
     */
    policyServiceName: string;

    /**
     * Policy ID
     */
    policyId: string;

    /**
     * Skip registration
     */
    skipRegistration: boolean;
}

/**
 * Policy instance
 */
export interface IPolicyInstance {
    /**
     * Process
     */
    process: ChildProcess | null;
    /**
     * Options
     */
    options: IPolicyStartOptions
}

/**
 * Policy info
 */
export interface IPolicyServiceInfo {
    /**
     * Service name
     */
    service: string;

    /**
     * Is free
     */
    free: boolean;

    /**
     * Free count
     */
    count: number;

    /**
     * Instance ID
     */
    instanceId: string;

    /**
     * Request ID
     */
    requestId: string

}

/**
 * Policy container
 */
@Singleton
export class PolicyContainer extends NatsService {
    /**
     * Instance ID
     * @private
     */
    private readonly instanceId: string;

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
     * Container
     * @private
     */
    private readonly container: Map<string, IPolicyInstance>;

    /**
     * Max policy instances
     * @private
     */
    private readonly maxPolicyInstances: number;

    /**
     * Script path
     * @private
     */
    private readonly runServiceScript: string;

    /**
     * Script path
     * @private
     */
    private readonly stopServiceScript: string;

    /**
     * Policy info array
     * @private
     */
    private readonly _policiInfoArrays: Map<string, IPolicyServiceInfo[]>

    /**
     * Process count
     * @private
     */
    private get processCount(): number {
        return this.container.size
    }

    /**
     * Logger instance
     * @private
     */
    private readonly logger: Logger

    /**
     * Generate policy subscription
     * @private
     */
    private generatePolicySubscription: Subscription;

    /**
     * Start new policy-service triggered
     * @private
     */
    private startNewPolicyServiceTriggered: boolean = false;

    constructor() {
        super();
        this.container = new Map();
        this.maxPolicyInstances = (process.env.MAX_POLICY_INSTANCES) ? parseInt(process.env.MAX_POLICY_INSTANCES, 10) : 1000;
        this.runServiceScript = process.env.RUN_SERVICE_SCRIPT;
        this.stopServiceScript = process.env.RUN_SERVICE_SCRIPT;
        this.instanceId = GenerateUUIDv4();
        this.logger = new Logger();
        this._policiInfoArrays = new Map();
    }

    /**
     * Init
     */
    public async init(): Promise<void> {
        await super.init();

        this.subscribe(PolicyEvents.GET_FREE_POLICY_SERVICES, (msg) => {
            const { replySubject, requestId } = msg;
            if (replySubject) {
                this.sendMessage(replySubject, {
                    service: process.env.SERVICE_CHANNEL,
                    free: this.processCount < this.maxPolicyInstances,
                    count: this.maxPolicyInstances - this.processCount,
                    instanceId: this.instanceId,
                    requestId
                })
            }
        });

        this.getMessages([this.replySubject, PolicyEvents.POLICY_SERVICE_FREE_STATUS, this.instanceId].join('.'), (msg: IPolicyServiceInfo) => {
            if (!this._policiInfoArrays.has(msg.requestId)) {
                this._policiInfoArrays.set(msg.requestId, [])
            }
            const arr = this._policiInfoArrays.get(msg.requestId);
            arr.push(msg);
        });

        setInterval(() => {
            this.container.forEach(this.runPolicyProcess, this);
            this.checkForRunNewInstance();
        }, 1000);

        this.subscribeForModelGeneration();
    }
    /**
     * Add policy to run queue
     * @param config
     */
    public addPolicy(config: IPolicyStartOptions): boolean {
        console.log(JSON.stringify(config, null, 4))
        if (this.processCount >= this.maxPolicyInstances) {
            this.unsubscribeFromModelGeneration();
            return false
        }
        this.container.set(config.policyId, {
            options: config,
            process: null
        });

        return true;
    }

    /**
     * Get free services
     */
    public getFreePolicyServices(): Promise<IPolicyServiceInfo[]> {
        const requestId = GenerateUUIDv4();
        this.publish(PolicyEvents.GET_FREE_POLICY_SERVICES, {
            replySubject: [this.replySubject, PolicyEvents.POLICY_SERVICE_FREE_STATUS, this.instanceId].join('.'),
            requestId
        });

        return new Promise(resolve => {
            setTimeout(() => {
                const arr = this._policiInfoArrays.get(requestId);
                resolve(arr);
                this._policiInfoArrays.delete(requestId);
            }, 500);
        })
    }

    /**
     * Subscribe to generate policy;
     * @private
     */
    private subscribeForModelGeneration(): void {
        this.generatePolicySubscription = this.getMessages(PolicyEvents.GENERATE_POLICY, async (data: IPolicyStartOptions) => {
            const confirmed = this.addPolicy(data);
            return new MessageResponse({ confirmed, free: this.maxPolicyInstances - this.processCount })
        });
        this.startNewPolicyServiceTriggered = false;
    }

    /**
     * Unsubscribe from model generation
     * @private
     */
    private unsubscribeFromModelGeneration(): void {
        setTimeout(() => {
            this.generatePolicySubscription.unsubscribe();
        }, 500);
    }

    /**
     * Check for run new instance
     * @private
     */
    private async checkForRunNewInstance(): Promise<void> {
        if (this.processCount < this.maxPolicyInstances) {
            return;
        }
        if (this.startNewPolicyServiceTriggered) {
            return;
        }
        if (!this.runServiceScript) {
            return;
        }
        const freeCheck = await this.getFreePolicyServices();
        if (!freeCheck) {
            return;
        }
        let hasFree = false;
        for (const info of freeCheck) {
            hasFree = hasFree || info.free
        }
        if (hasFree) {
            return;
        }

        execFile(this.runServiceScript, (error, _data) => {
            if (error) {
                this.logger.error(error, ['POLICY-SERVICE', this.runServiceScript]);
                return;
            }
            this.logger.info(_data, ['POLICY-SERVICE', this.runServiceScript]);
        });
        this.startNewPolicyServiceTriggered = true;
    }

    /**
     * Run policy process
     * @private
     * @param instance
     */
    private runPolicyProcess(instance: IPolicyInstance): void {
        if (instance.process) {
            return;
        }

        const {
            policyId,
            policyServiceName,
            skipRegistration
        } = instance.options;

        const childEnvironment = Object.assign(process.env, {
            POLICY_START_OPTIONS: JSON.stringify({
                policyId,
                policyServiceName,
                skipRegistration
            }),
        });

        const p = fork(POLICY_PROCESS_PATH, {
            env: childEnvironment,
            silent: false,
            detached: false
        });
        p.once('error', (error) => {
            this.logger.error(error.message, ['POLICY-SERVICE', policyId]);
            // Restart policy
        });
        p.once('exit', (code) => {
            this.logger.info(`Policy process exit with code ${code}`, ['POLICY-SERVICE', policyId]);
            if (code === 0) {
                this.container.delete(policyId);

                if (this.processCount < this.maxPolicyInstances) {
                    this.subscribeForModelGeneration();
                }

                if (this.processCount === 0) {
                    if (this.stopServiceScript) {
                        execFile(this.stopServiceScript, (error, _data) => {
                            if (error) {
                                this.logger.error(error, ['POLICY-SERVICE', this.stopServiceScript]);
                                return;
                            }
                            this.logger.info(_data, ['POLICY-SERVICE', this.stopServiceScript]);
                        })
                    }
                }
            } else {
                // rerun every 10 secs
                setTimeout(() => {
                    this.logger.warn(`Process for policy with id: ${policyId} respawning`, ['POLICY-SERVICE', policyId]);
                    instance.process = null;
                }, 10000)
            }
        });
        instance.process = p;
    }
}
