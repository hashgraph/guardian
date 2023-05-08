import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { DocumentSignature, Schema, TopicType } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyDocument, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser, PolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import {
    VcDocument as VcDocumentCollection,
    VcDocumentDefinition as VcDocument,
    VcHelper,
    MessageServer,
    MessageAction,
    SchemaMessage,
    UrlType,
    MessageType,
    TopicMessage,
} from '@guardian/common';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

interface ExternalTopic {
    blockUUID: string,
    owner: string,
    topicId: string,
    schemas: any[],
    schema: any,
    schemaId: string,
    lastIndex: number,
    policy: any,
    instance: any,
    status: boolean,
    lastUpdate: string,
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
    private __map = new Map<string, ExternalTopic>();


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

    private async searchTopic(topicId: string, topicTree: any = {}): Promise<any> {
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
            if(topicMessage && (
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
                topicTree.policy = topicMessage;
                const messages = await MessageServer.getMessages(topicId);
                topicTree.schemas = messages.filter(m => m.action === MessageAction.PublishSchema);
                return topicTree;
            } else if (topicMessage.messageType === TopicType.InstancePolicyTopic) {
                topicTree.instance = topicMessage;
                return await this.searchTopic(topicMessage.parentId, topicTree);
            } else if (topicMessage.messageType === TopicType.DynamicTopic) {
                return await this.searchTopic(topicMessage.parentId, topicTree);
            }
        }
        throw new BlockActionError('Invalid topic', ref.blockType, ref.uuid);
    }

    private async addTopic(user: IPolicyUser, topicId: string): Promise<ExternalTopic> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        if (this.__map.has(user.did)) {
            throw new BlockActionError('', ref.blockType, ref.uuid);
        }

        const topicTree = await this.searchTopic(topicId);
        console.log('???');
        console.log(topicTree)
        console.log('???');

        const policy = topicTree.policy;
        const instance = topicTree.instance;
        const schemas = topicTree.schemas.map((s: SchemaMessage) => {
            return {
                id: s.getContextUrl(UrlType.url),
                name: s.name
            }
        });

        const item: ExternalTopic = {
            blockUUID: ref.uuid,
            owner: user.did,
            topicId: topicId,
            schemas,
            schema: null,
            schemaId: '',
            lastIndex: 0,
            policy,
            instance,
            status: false,
            lastUpdate: ''
        }
        this.__map.set(user.did, item);

        return item;
    }

    private async addSchema(user: IPolicyUser, schemaId: string): Promise<ExternalTopic> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const item = this.__map.get(user.did);

        if (!item) {
            throw new BlockActionError('Topic not set.', ref.blockType, ref.uuid);
        }
        if (item.status) {
            throw new BlockActionError('Schema already set', ref.blockType, ref.uuid);
        }
        if (!item.schemas) {
            throw new BlockActionError('Schema not found', ref.blockType, ref.uuid);
        }

        const schema = item.schemas.find(s => s.id === schemaId);
        if (!schema) {
            throw new BlockActionError('Schema not found', ref.blockType, ref.uuid);
        }

        item.schemaId = schemaId;
        item.schema = schema;
        item.status = true;
        this.__map.set(user.did, item);

        return item;
    }

    private async receiveData(item: ExternalTopic): Promise<IPolicyDocument[]> {
        const result: IPolicyDocument[] = [];
        const schema = await this.getSchema();

        // const docOwner = await PolicyUtils.getHederaAccount(ref, data.owner);
        // const vc = VcDocument.fromJsonTree(data.document);
        // const accounts = PolicyUtils.getHederaAccounts(vc, docOwner.hederaAccountId, schema);
        // let doc = PolicyUtils.createVC(ref, user, vc);
        // doc.type = ref.options.entityType;
        // doc.schema = ref.options.schema;
        // doc.accounts = accounts;
        // doc.signature = (verify ?
        //     DocumentSignature.VERIFIED :
        //     DocumentSignature.INVALID);
        // doc = PolicyUtils.setDocumentRef(doc, documentRef);

        const data: any[] = [];
        for (const message of data) {
            // const error = await this.validateDocuments(user, message);
            // if (error) {
            //     continue;
            // }
            // let verify: boolean;
            // try {
            //     const VCHelper = new VcHelper();
            //     const res = await VCHelper.verifySchema(data.document);
            //     verify = res.ok;
            //     if (verify) {
            //         verify = await VCHelper.verifyVC(data.document);
            //     }
            // } catch (error) {
            //     ref.error(`Verify VC: ${PolicyUtils.getErrorMessage(error)}`)
            //     verify = false;
            // }

            result.push(message);
        }
        item.lastUpdate = (new Date()).toISOString();
        this.__map.set(item.owner, item);
        return result;
    }

    private async runByUser(item: ExternalTopic): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const documents = await this.receiveData(item);
        if (documents && documents.length) {
            const state = { data: documents };
            const user = new PolicyUser(item.owner, !!ref.dryRun);
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
                documents: ExternalDocuments(documents)
            }));
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
        const items = this.__map.values();
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

        console.log(JSON.stringify(data));

        if (!user?.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        const { operation, value } = data;

        if (!value) {
            throw new BlockActionError('Invalid value', ref.blockType, ref.uuid);
        }

        try {

            switch (operation) {
                case 'SetTopic': {
                    await this.addTopic(user, value);
                    return true;
                }
                case 'SetSchema': {
                    const item = await this.addSchema(user, value);
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
        const item = this.__map.get(user?.did);
        if (item) {
            return {
                topic: item.topicId,
                policy: item.policy,
                instance: item.instance,
                schemas: item.schemas,
                schema: item.schema,
                lastUpdate: item.lastUpdate
            };
        } else {
            return {};
        }
    }
}
