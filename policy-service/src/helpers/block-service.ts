import { MessageResponse, NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { BlockEngine } from '../policy-engine/block-engine/index.js';
import { PolicyUser } from '../policy-engine/policy-user.js';

/**
 * Policy container
 */
@Singleton
export class BlockService extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'block-service-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'block-service-queue-reply-' + GenerateUUIDv4();

    constructor() {
        super();
    }

    /**
     * Init
     */
    public async init(): Promise<void> {
        await super.init();

        this.getMessages(PolicyEvents.DRY_RUN_BLOCK, async (msg: any) => {
            try {
                const { policyId, user, block, data } = msg;
                const userFull = new PolicyUser(user, { policyId } as any);
                const blockEngine = new BlockEngine(policyId);
                await blockEngine.build(block);
                await blockEngine.run(userFull, data);
                const result = blockEngine.getResult();
                return new MessageResponse(result);
            } catch (error) {
                return new MessageResponse({
                    input: '',
                    logs: [],
                    output: '',
                    errors: [String(error)]
                });
            }
        });
    }
}
