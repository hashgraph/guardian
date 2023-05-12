import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { IVC, IVCDocument, Schema, TopicType } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyDocument, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser, PolicyUser } from '@policy-engine/policy-user';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import {
    MessageServer,
    MessageAction,
    SchemaMessage,
    UrlType,
    PolicyMessage,
    TopicMessage,
    ExternalDocument,
    Message,
    MessageType,
    VCMessage,
    VcHelper,
} from '@guardian/common';
import {
    ExternalDocuments,
    ExternalEvent,
    ExternalEventType
} from '@policy-engine/interfaces/external-event';


/**
 * Search Topic Result
 */
interface TopicResult {
    count?: number;
    schemas?: SchemaMessage[];
    instance?: PolicyMessage;
    root?: TopicMessage;
    instanceTopic?: TopicMessage;
    policyTopic?: TopicMessage;
}

/**
 * External topic block
 */
@EventBlock({
    blockType: 'externalTopicBlock',
    commonBlock: false,
    about: {
        label: 'External Topic',
        title: `Add 'External Topic' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.TimerEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true,
        properties: [{
            name: 'schema',
            label: 'Schema',
            title: 'Schema',
            type: PropertyType.Schemas
        }]
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class ExternalTopicBlock {
    /**
     * Schema
     * @private
     */
    private schema: Schema | null;

    /**
     * Get Validators
     */
    protected getValidators(): IPolicyValidatorBlock[] {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const validators: IPolicyValidatorBlock[] = [];
        for (const child of ref.children) {
            if (child.blockClassName === 'ValidatorBlock') {
                validators.push(child as IPolicyValidatorBlock);
            }
        }
        return validators;
    }

    /**
     * Validate Documents
     * @param user
     * @param state
     */
    protected async validateDocuments(user: IPolicyUser, state: any): Promise<string> {
        const validators = this.getValidators();
        for (const validator of validators) {
            const error = await validator.run({
                type: null,
                inputType: null,
                outputType: null,
                policyId: null,
                source: null,
                sourceId: null,
                target: null,
                targetId: null,
                user,
                data: state
            });
            if (error) {
                return error;
            }
        }
        return null;
    }

    /**
     * Get Schema
     */
    private async getSchema(): Promise<Schema> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (!ref.options.schema) {
            return null;
        }
        if (!this.schema) {
            const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
            this.schema = schema ? new Schema(schema) : null;
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    private async getUser(user: IPolicyUser): Promise<ExternalDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        let item = await ref.databaseServer.getExternalTopic(ref.policyId, ref.uuid, user.did);
        if (!item) {
            item = await ref.databaseServer.createExternalTopic({
                policyId: ref.policyId,
                blockId: ref.uuid,
                owner: user.did,
                documentTopicId: '',
                policyTopicId: '',
                instanceTopicId: '',
                documentMessage: '',
                policyMessage: '',
                policyInstanceMessage: '',
                schemas: [],
                schema: null,
                schemaId: null,
                active: false,
                lastMessage: '',
                lastUpdate: '',
                status: 'NEED_TOPIC'
            });
        }
        return item;
    }

    private async searchTopic(topicId: string, topicTree: TopicResult = {}): Promise<TopicResult> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (topicTree.count) {
            topicTree.count++;
        } else {
            topicTree.count = 1;
        }
        if (topicTree.count > 20) {
            throw new BlockActionError('Max attempts of 20 was reached for request: Get topic info', ref.blockType, ref.uuid);
        }
        const topicMessage = await MessageServer.getTopic(topicId);
        if (!topicTree.root) {
            if (topicMessage && (
                topicMessage.messageType === TopicType.InstancePolicyTopic ||
                topicMessage.messageType === TopicType.DynamicTopic
            )) {
                topicTree.root = topicMessage;
            } else {
                throw new BlockActionError('Invalid topic', ref.blockType, ref.uuid);
            }
        }
        if (topicMessage) {
            if (topicMessage.messageType === TopicType.PolicyTopic) {
                if (!topicTree.instanceTopic) {
                    throw new BlockActionError('Invalid topic', ref.blockType, ref.uuid);
                }
                topicTree.policyTopic = topicMessage;
                const messages: any[] = await MessageServer.getMessages(topicId);
                topicTree.schemas = messages.filter((m: SchemaMessage) =>
                    m.action === MessageAction.PublishSchema);
                topicTree.instance = messages.find((m: PolicyMessage) =>
                    m.action === MessageAction.PublishPolicy &&
                    m.instanceTopicId === topicTree.instanceTopic.topicId);
                return topicTree;
            } else if (topicMessage.messageType === TopicType.InstancePolicyTopic) {
                topicTree.instanceTopic = topicMessage;
                return await this.searchTopic(topicMessage.parentId, topicTree);
            } else if (topicMessage.messageType === TopicType.DynamicTopic) {
                return await this.searchTopic(topicMessage.parentId, topicTree);
            }
        }
        throw new BlockActionError('Invalid topic', ref.blockType, ref.uuid);
    }

    private async addTopic(item: ExternalDocument, topicId: string): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        item.status = 'SEARCH';
        await ref.databaseServer.updateExternalTopic(item);

        const topicTree = await this.searchTopic(topicId);

        const topic = topicTree.root;
        const policy = topicTree.policyTopic;
        const instance = topicTree.instance;
        const list = topicTree.schemas.map((s: SchemaMessage) => {
            return {
                id: s.getContextUrl(UrlType.url),
                name: s.name
            }
        });

        item.status = 'NEED_SCHEMA';
        item.documentTopicId = topic.topicId?.toString();
        item.policyTopicId = policy.topicId?.toString();
        item.instanceTopicId = instance.instanceTopicId?.toString();
        item.documentMessage = topic.toMessageObject();
        item.policyMessage = policy.toMessageObject();
        item.policyInstanceMessage = instance.toMessageObject();
        item.schemas = list;
        item.active = false;
        item.lastMessage = '';
        item.lastUpdate = '';
        await ref.databaseServer.updateExternalTopic(item);
    }

    private async addSchema(item: ExternalDocument, schemaId: string): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        if (item.status === 'NEED_TOPIC') {
            throw new BlockActionError('Topic not set.', ref.blockType, ref.uuid);
        }
        if (item.status !== 'NEED_SCHEMA') {
            throw new BlockActionError('Schema already set', ref.blockType, ref.uuid);
        }
        if (!item.schemas) {
            throw new BlockActionError('Schema not found', ref.blockType, ref.uuid);
        }

        const schema = item.schemas.find(s => s.id === schemaId);
        if (!schema) {
            throw new BlockActionError('Schema not found', ref.blockType, ref.uuid);
        }

        item.status = 'FREE';
        item.schemaId = schemaId;
        item.schema = schema;
        item.active = true;
        await ref.databaseServer.updateExternalTopic(item);
    }

    private async checkDocument(item: ExternalDocument, document: IVC): Promise<string> {
        if (!document) {
            return 'Invalid document';
        }

        if (
            !Array.isArray(document['@context']) ||
            document['@context'].indexOf(item.schemaId) === -1
        ) {
            return 'Invalid schema';
        }

        let verify: boolean;
        try {
            const VCHelper = new VcHelper();
            const res = await VCHelper.verifySchema(document);
            verify = res.ok;
            if (verify) {
                verify = await VCHelper.verifyVC(document);
            }
        } catch (error) {
            verify = false;
        }

        if (!verify) {
            return 'Invalid proof';
        }

        return null;
    }

    private async checkMessage(
        ref: AnyBlockType,
        item: ExternalDocument,
        hederaAccount: IHederaAccount,
        user: IPolicyUser,
        message: VCMessage
    ): Promise<void> {
        if (message.type !== MessageType.VCDocument) {
            console.log(' --- ', message.type);
            return;
        }
        // if (message.payer !== hederaAccount.hederaAccountId) {
        //     console.log(' --- ', message.payer);
        //     return;
        // }

        await MessageServer.loadDocument(message, hederaAccount.hederaAccountKey);

        const document: IVC = message.getDocument();
        const error = await this.checkDocument(item, document);
        if (error) {
            console.log(' --- ', error);
            return;
        }

        const result: IPolicyDocument = PolicyUtils.createPolicyDocument(ref, user, document);

        const state = { data: result };
        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            documents: ExternalDocuments(result)
        }));
    }

    private async receiveData(item: ExternalDocument): Promise<void> {
        console.log('--- receiveData ---');
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const hederaAccount = await PolicyUtils.getHederaAccount(ref, item.owner);
        const user = await PolicyUtils.createPolicyUser(ref, item.owner);
        const messages: VCMessage[] = await MessageServer.getMessages(
            item.documentTopicId,
            null,
            null,
            item.lastMessage
        );
        for (const message of messages) {
            await this.checkMessage(ref, item, hederaAccount, user, message);
            item.lastMessage = message.id;
            await ref.databaseServer.updateExternalTopic(item);
        }
    }

    private async runByUser(item: ExternalDocument): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (item.status === 'PROCESSING') {
            throw new BlockActionError('Process already started', ref.blockType, ref.uuid);
        }
        item.status = 'PROCESSING';
        item.lastUpdate = (new Date()).toISOString();
        await ref.databaseServer.updateExternalTopic(item);
        try {
            await this.receiveData(item);
            item.status = 'FREE';
            await ref.databaseServer.updateExternalTopic(item);
        } catch (error) {
            item.status = 'FREE';
            await ref.databaseServer.updateExternalTopic(item);
            ref.error(`setData: ${PolicyUtils.getErrorMessage(error)}`);
        }
    }

    /**
     * Tick cron
     * @event PolicyEventType.TimerEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.TimerEvent,
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    public async run(event: IPolicyEvent<string[]>) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const items = await ref.databaseServer.getActiveExternalTopics(ref.policyId, ref.uuid);
        for (const item of items) {
            await this.runByUser(item);
        }
    }

    /**
     * Set block data
     * @param user
     * @param _data
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ]
    })
    public async setData(user: IPolicyUser, data: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        ref.log(`setData`);

        if (!user?.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        const { operation, value } = data;

        if (!value) {
            throw new BlockActionError('Invalid value', ref.blockType, ref.uuid);
        }

        try {
            const item = await this.getUser(user);
            switch (operation) {
                case 'SetTopic': {
                    await this.addTopic(item, value);
                    return true;
                }
                case 'SetSchema': {
                    await this.addSchema(item, value);
                    return true;
                }
                case 'Refresh': {
                    await this.runByUser(item);
                    return true;
                }
                default: {
                    throw new BlockActionError('Invalid operation', ref.blockType, ref.uuid);
                }
            }
        } catch (error) {
            ref.error(`setData: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * Get block data
     * @param user
     */
    public async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const item = await ref.databaseServer.getExternalTopic(ref.policyId, ref.uuid, user.did);
        if (item) {
            return {
                documentTopicId: item.documentTopicId,
                policyTopicId: item.policyTopicId,
                instanceTopicId: item.instanceTopicId,
                documentMessage: item.documentMessage,
                policyMessage: item.policyMessage,
                policyInstanceMessage: item.policyInstanceMessage,
                schemas: item.schemas,
                schema: item.schema,
                lastUpdate: item.lastUpdate,
                status: item.status
            };
        } else {
            return {};
        }
    }
}

