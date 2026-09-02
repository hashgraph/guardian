import { MessageResponse, NatsService, PinoLogger, Singleton } from '@guardian/common';
import { ChildProcess, execFile, fork } from 'node:child_process';
import process from 'node:process';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { Subscription } from 'nats';
import { POLICY_PROCESS_PATH } from '../api/policy-process-path.js';

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

    /**
     * Policy owner id
     */
    policyOwnerId: string;

    /**
     * Enable Mock
     */
    enableMock: boolean;
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

    /**
     * Whether this service has recently asked for a new replica
     */
    startNewPolicyServiceTriggered?: boolean

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
     * Generate policy subscription
     * @private
     */
    private generatePolicySubscription: Subscription;

    /**
     * Identity of the live GENERATE_POLICY subscription. A pending unsubscribe
     * timer only tears down the generation it was scheduled for.
     * @private
     */
    private generateSubscriptionGeneration: number = 0;

    /**
     * Whether this service is currently listening for GENERATE_POLICY.
     * @private
     */
    private intakeSubscribed: boolean = false;

    /**
     * A service has usable capacity only when it is below its limit AND actually
     * listening. Reporting slots it will never fill keeps every other service's
     * `hasFree` true, which suppresses scale-up across the whole fleet.
     * @private
     */
    private get canAcceptPolicies(): boolean {
        return this.intakeSubscribed && this.processCount < this.maxPolicyInstances;
    }

    /**
     * Consecutive failed starts per policy, for the crash-loop backoff.
     * @private
     */
    private readonly restartAttempts: Map<string, number> = new Map();
    private readonly maxRestartAttempts: number = process.env.POLICY_MAX_RESTART_ATTEMPTS
        ? parseInt(process.env.POLICY_MAX_RESTART_ATTEMPTS, 10)
        : 10;
    private readonly restartBaseDelayMs: number = process.env.POLICY_RESTART_BASE_DELAY_MS
        ? parseInt(process.env.POLICY_RESTART_BASE_DELAY_MS, 10)
        : 10000;
    private readonly restartMaxDelayMs: number = process.env.POLICY_RESTART_MAX_DELAY_MS
        ? parseInt(process.env.POLICY_RESTART_MAX_DELAY_MS, 10)
        : 5 * 60 * 1000;

    /**
     * When this service last asked for a replica. Replaces the permanent boolean
     * seal so a fleet that stays saturated can keep scaling.
     * @private
     */
    private lastScaleTriggeredAt: number = 0;

    /**
     * Guards checkForRunNewInstance against overlapping runs.
     * @private
     */
    private scaleCheckInFlight: boolean = false;

    private readonly scaleCooldownMs: number = process.env.SCALE_COOLDOWN_MS
        ? parseInt(process.env.SCALE_COOLDOWN_MS, 10)
        : 60000;

    /**
     * Fleet headroom, in policy slots, below which a full service asks for another
     * replica. Defaults to one service's worth of capacity.
     * @private
     */
    private readonly scaleHeadroomSlots: number | null =
        process.env.SCALE_HEADROOM_SLOTS === undefined
            ? null
            : parseInt(process.env.SCALE_HEADROOM_SLOTS, 10);

    /**
     * Start new policy-service triggered
     * @private
     */
    private get startNewPolicyServiceTriggered(): boolean {
        return this.lastScaleTriggeredAt > 0
            && (Date.now() - this.lastScaleTriggeredAt) < this.scaleCooldownMs;
    }

    private set startNewPolicyServiceTriggered(value: boolean) {
        this.lastScaleTriggeredAt = value ? Date.now() : 0;
    }

    constructor(private readonly logger: PinoLogger) {
        super();
        this.container = new Map();
        this.maxPolicyInstances = (process.env.MAX_POLICY_INSTANCES) ? parseInt(process.env.MAX_POLICY_INSTANCES, 10) : 1000;
        this.runServiceScript = process.env.RUN_SERVICE_SCRIPT;
        this.stopServiceScript = process.env.RUN_SERVICE_SCRIPT;
        this.instanceId = GenerateUUIDv4();
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
                    free: this.canAcceptPolicies,
                    count: this.canAcceptPolicies ? this.maxPolicyInstances - this.processCount : 0,
                    instanceId: this.instanceId,
                    requestId,
                    startNewPolicyServiceTriggered: this.startNewPolicyServiceTriggered
                })
            }
        });

        this.getMessages([this.replySubject, PolicyEvents.POLICY_SERVICE_FREE_STATUS, this.instanceId].join('.'), (msg: IPolicyServiceInfo) => {
            // Drop replies for a request we are not collecting. Creating the bucket
            // on demand let a late reply re-create an entry that nothing deletes -
            // getFreePolicyServices only removes the id it is waiting on - so this
            // leaked one Map entry per late reply for the lifetime of the process.
            const arr = this._policiInfoArrays.get(msg?.requestId);
            if (!arr) {
                return;
            }
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
        // Register before publishing so a reply can never arrive for an id we are
        // not tracking.
        this._policiInfoArrays.set(requestId, []);
        this.publish(PolicyEvents.GET_FREE_POLICY_SERVICES, {
            replySubject: [this.replySubject, PolicyEvents.POLICY_SERVICE_FREE_STATUS, this.instanceId].join('.'),
            requestId
        });

        return new Promise(resolve => {
            setTimeout(() => {
                const arr = this._policiInfoArrays.get(requestId) || [];
                this._policiInfoArrays.delete(requestId);
                resolve(arr);
            }, 500);
        })
    }

    /**
     * Subscribe to generate policy;
     * @private
     */
    private subscribeForModelGeneration(): void {
        // Drop any prior listener first, so repeated exit/respawn cycles cannot
        // accumulate GENERATE_POLICY handlers.
        this.generatePolicySubscription?.unsubscribe();
        this.generateSubscriptionGeneration++;
        this.generatePolicySubscription = this.getMessages(PolicyEvents.GENERATE_POLICY, async (data: IPolicyStartOptions) => {
            const confirmed = this.addPolicy(data);
            return new MessageResponse({ confirmed, free: this.maxPolicyInstances - this.processCount })
        });
        this.intakeSubscribed = true;
        this.startNewPolicyServiceTriggered = false;
    }

    /**
     * Unsubscribe from model generation
     * @private
     */
    private unsubscribeFromModelGeneration(): void {
        /*
         * Cancel only the subscription this call was scheduled for. The timer used
         * to dereference `generatePolicySubscription` when it fired, so a policy
         * exiting inside the 500ms window - which re-subscribes - had its NEW
         * subscription torn down instead. That left the service below capacity and
         * deaf to GENERATE_POLICY while still advertising free slots, which also
         * suppressed fleet-wide scale-up through checkForRunNewInstance.
         */
        const generation = this.generateSubscriptionGeneration;
        setTimeout(() => {
            if (generation !== this.generateSubscriptionGeneration) {
                return;
            }
            this.generatePolicySubscription?.unsubscribe();
            this.intakeSubscribed = false;
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
        /*
         * The 1s interval does not await this and the scatter below takes ~500ms, so
         * without a synchronous guard two invocations can both pass the seal check
         * before either records a trigger, and both ask for a replica.
         */
        if (this.scaleCheckInFlight) {
            return;
        }
        this.scaleCheckInFlight = true;
        try {
            const freeCheck = await this.getFreePolicyServices();
            /*
             * An EMPTY reply set means nothing answered the scatter, not that the
             * fleet is full - otherwise a broker hiccup reads as "no capacity" and
             * scales up on its own.
             */
            if (!freeCheck || freeCheck.length === 0) {
                return;
            }

            /*
             * Scale on fleet headroom rather than "any service has a slot". This one
             * is already full; if what is left across the fleet is under a single
             * service's worth, another replica is warranted.
             */
            //null is unset, not zero: an explicit SCALE_HEADROOM_SLOTS=0 asks for no
            //buffer at all, which the floor of 1 turns into "scale when nothing is free"
            const configured = Number.isFinite(this.scaleHeadroomSlots)
                ? this.scaleHeadroomSlots
                : this.maxPolicyInstances;
            const headroom = Math.max(1, configured);
            const totalFree = freeCheck.reduce(
                (sum, info) => sum + (info.free ? (Number.isFinite(info.count) ? info.count : 1) : 0),
                0
            );
            if (totalFree >= headroom) {
                return;
            }

            /*
             * Only one service should scale per cooldown. With a permanent seal that
             * was emergent - each service scaled at most once ever - but a re-arming
             * seal makes a stampede reachable, so the winner is elected explicitly.
             */
            if (freeCheck.some(info => info.instanceId !== this.instanceId && info.startNewPolicyServiceTriggered)) {
                return;
            }
            //a peer with capacity returns at the first line of checkForRunNewInstance and
            //never reaches the spawn, so electing one parks the whole fleet behind a
            //leader that cannot act
            const candidates = freeCheck
                .filter(info => !info.free && !info.startNewPolicyServiceTriggered)
                .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
            if (candidates.length && candidates[0].instanceId !== this.instanceId) {
                // Another service is the elected scaler; hold off until the cooldown.
                this.startNewPolicyServiceTriggered = true;
                return;
            }

            execFile(this.runServiceScript, (error, _data) => {
                if (error) {
                    this.logger.error(error, ['POLICY_SERVICE', this.runServiceScript], null);
                    return;
                }
                this.logger.info(_data, ['POLICY_SERVICE', this.runServiceScript], null);
            });
            this.startNewPolicyServiceTriggered = true;
        } finally {
            this.scaleCheckInFlight = false;
        }
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
            skipRegistration,
            policyOwnerId,
            enableMock
        } = instance.options;

        const childEnvironment = Object.assign(process.env, {
            POLICY_START_OPTIONS: JSON.stringify({
                policyId,
                policyServiceName,
                skipRegistration,
                policyOwnerId,
                enableMock
            }),
        });

        const p = fork(POLICY_PROCESS_PATH, {
            env: childEnvironment,
            silent: false,
            detached: false
        });
        p.once('error', (error) => {
            this.logger.error(error.message, ['POLICY_SERVICE', policyId], policyOwnerId);
            /*
             * Node emits 'error' when a process cannot be SPAWNED (EAGAIN, ENOMEM, a
             * bad process path) and 'exit' may never follow, so nothing else runs.
             * `instance.process` is already assigned and runPolicyProcess skips any
             * instance that has one, so the policy stayed wedged forever, holding a
             * slot it never used.
             *
             * Routed through the same backoff as a non-zero exit: a spawn that keeps
             * failing is a crash loop too, and the 1s sweep would otherwise retry it
             * every tick with no ceiling.
             */
            if (instance.process === p) {
                this.scheduleRestart(policyId, instance, policyOwnerId);
            }
        });
        p.once('exit', (code) => {
            this.logger.info(`Policy process exit with code ${code}`, ['POLICY_SERVICE', policyId], policyOwnerId);
            if (code === 0) {
                this.container.delete(policyId);
                this.restartAttempts.delete(policyId);

                if (this.processCount < this.maxPolicyInstances) {
                    this.subscribeForModelGeneration();
                }

                if (this.processCount === 0) {
                    if (this.stopServiceScript) {
                        execFile(this.stopServiceScript, (error, _data) => {
                            if (error) {
                                this.logger.error(error, ['POLICY_SERVICE', this.stopServiceScript], policyOwnerId);
                                return;
                            }
                            this.logger.info(_data, ['POLICY_SERVICE', this.stopServiceScript], policyOwnerId);
                        })
                    }
                }
            } else {
                this.scheduleRestart(policyId, instance, policyOwnerId);
            }
        });
        instance.process = p;
    }

    /*
     * Back off, and eventually stop. This used to re-fork every 10s with no ceiling,
     * so a policy that could not start hammered the service forever - each attempt a
     * full policy generation.
     *
     * Giving up RELEASES the slot rather than holding one that is never used.
     * guardian-service can still assign the policy again through GENERATE_POLICY, so
     * this is a local stop, not a permanent verdict.
     */
    private scheduleRestart(
        policyId: string,
        instance: IPolicyInstance,
        policyOwnerId: string | null
    ): void {
        const attempts = (this.restartAttempts.get(policyId) || 0) + 1;
        this.restartAttempts.set(policyId, attempts);

        if (attempts >= this.maxRestartAttempts) {
            this.logger.error(
                `Policy ${policyId} failed to start ${attempts} times; releasing its slot instead of respawning`,
                ['POLICY_SERVICE', policyId], policyOwnerId
            );
            this.container.delete(policyId);
            this.restartAttempts.delete(policyId);
            if (this.processCount < this.maxPolicyInstances) {
                this.subscribeForModelGeneration();
            }
            return;
        }

        const delay = Math.min(
            this.restartBaseDelayMs * Math.pow(2, attempts - 1),
            this.restartMaxDelayMs
        );
        setTimeout(() => {
            this.logger.warn(`Process for policy with id: ${policyId} respawning (attempt ${attempts + 1}) after ${delay}ms`, ['POLICY_SERVICE', policyId], policyOwnerId);
            instance.process = null;
        }, delay)
    }
}
