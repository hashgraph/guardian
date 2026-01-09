import { MessageError, MessageResponse, NatsService, Singleton } from '@guardian/common';
import { GenerateUUIDv4, PolicyEvents } from '@guardian/interfaces';
import { BlockEngine } from './block-engine/index.js';
import { PolicyUser } from './policy-user.js';
import { PolicyValidator, ModuleValidator, ToolValidator } from './block-validators/index.js';
import { GetBlockAbout } from './blocks/index.js';

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

    public readonly BlockAboutString = JSON.stringify(GetBlockAbout());

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

        this.getMessages(PolicyEvents.GET_BLOCK_ABOUT, async (msg: any) => {
            try {
                return new MessageResponse(this.BlockAboutString);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.getMessages(PolicyEvents.VALIDATE_POLICY, async (msg: any) => {
            try {
                const { policy, isDruRun, ignoreRules, reachability } = msg;
                const policyValidator = new PolicyValidator(policy, isDruRun, ignoreRules, reachability);
                await policyValidator.build(policy);
                await policyValidator.validate();
                const result = policyValidator.getSerializedErrors();
                return new MessageResponse(result);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.getMessages(PolicyEvents.VALIDATE_MODULE, async (msg: any) => {
            try {
                const { module } = msg;
                const moduleValidator = new ModuleValidator(module.config);
                await moduleValidator.build(module.config);
                await moduleValidator.validate();
                const result = moduleValidator.getSerializedErrors();
                return new MessageResponse(result);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.getMessages(PolicyEvents.VALIDATE_TOOL, async (msg: any) => {
            try {
                const { tool } = msg;
                const toolValidator = new ToolValidator(tool.config);
                await toolValidator.build(tool);
                await toolValidator.validate();
                const result = toolValidator.getSerializedErrors();
                return new MessageResponse(result);
            } catch (error) {
                return new MessageError(error);
            }
        });
    }
}
