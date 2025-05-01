import { DataBaseHelper, DatabaseServer, ITopicMessage, MessageAction, MessageServer, Policy, PolicyActionMessage, PolicyAction, TopicConfig, TopicListener } from '@guardian/common';
import { GenerateUUIDv4, PolicyActionStatus, PolicyActionType, PolicyStatus } from '@guardian/interfaces';
import { IPolicyInterfaceBlock } from './policy-engine.interface.js';
import { PolicyUser } from './policy-user.js';
import { PolicyUtils } from './helpers/utils.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { PolicyActionsUtils } from './policy-actions/utils.js';

export class PolicyActionsService {
    private readonly topicId: string;
    private readonly policyId: string;
    private readonly isLocal: boolean;
    private readonly policyInstance: IPolicyInterfaceBlock;
    private readonly policyOwner: string;
    private topic: TopicConfig;
    private topicListener: TopicListener;
    private readonly callback: Map<string, Function>;

    constructor(policyId: string, policyInstance: IPolicyInterfaceBlock, policy: Policy) {
        this.policyId = policyId;
        this.topicId = policy.actionsTopicId;
        this.isLocal = policy.status !== PolicyStatus.VIEW;
        this.policyInstance = policyInstance;
        this.policyOwner = policy.owner;
        this.callback = new Map<string, Function>();
    }

    public async init(): Promise<void> {
        console.debug('--- PolicyActionsService init')
        const topicConfig = await DatabaseServer.getTopicById(this.topicId);
        this.topic = await TopicConfig.fromObject(topicConfig);
        if (!this.topic) {
            throw Error('Invalid action topic');
        }

        this.topicListener = new TopicListener(this.topicId);
        this.topicListener.setListenerName(`policy_actions_${this.policyId}`);
        await this.topicListener.subscribe(this.loadTask.bind(this));
    }

    public async sendAction(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<any> {
        const credentials = await PolicyUtils.getUserCredentials(block, user.did);
        const userHederaCred = await credentials.loadHederaCredentials(block);
        const signOptions = await credentials.loadSignOptions(block);
        const messageServer = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            signOptions
        );
        const row: any = {
            uuid: GenerateUUIDv4(),
            type: PolicyActionType.ACTION,
            owner: user.did,
            creator: user.did,
            topicId: this.topicId,
            policyId: this.policyId,
            status: PolicyActionStatus.NEW,
            accountId: userHederaCred.hederaAccountId,
            blockTag: block.tag,
            messageId: null,
            startMessageId: null,
            sender: null,
            document: data,
            lastStatus: PolicyActionStatus.NEW
        };
        const message = new PolicyActionMessage(MessageAction.CreatePolicyAction);
        message.setDocument(row, data);

        console.debug(row, data);
        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, true);
        row.messageId = messageResult.getId();
        row.startMessageId = messageResult.getId();
        row.sender = messageResult.payer;
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create(row);
        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);
        return row;
    }

    public async sendRequest(
        data: PolicyAction,
        callback: (action: PolicyAction) => Promise<void>
    ): Promise<any> {
        const root = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner);
        const userHederaCred = await root.loadHederaCredentials(this.policyInstance);
        const signOptions = await root.loadSignOptions(this.policyInstance);
        const messageServer = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            signOptions
        );
        const collection = new DataBaseHelper(PolicyAction);
        const newRow = collection.create({
            status: PolicyActionStatus.NEW,
            type: PolicyActionType.REQUEST,
            uuid: data.uuid,
            owner: data.owner,
            creator: data.owner,
            accountId: data.accountId,
            blockTag: data.blockTag,
            topicId: data.topicId,
            policyId: this.policyId,
            document: data.document,
            messageId: null,
            startMessageId: null,
            index: null,
            lastStatus: PolicyActionStatus.NEW
        });

        const message = new PolicyActionMessage(MessageAction.CreatePolicyRequest);
        message.setDocument(newRow, newRow.document);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, true);

        newRow.messageId = messageResult.getId();
        newRow.startMessageId = messageResult.getId();
        newRow.sender = messageResult.payer;

        this.callback.set(newRow.messageId, callback);

        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(newRow);
        await this.sentNotification(newRow);

        return newRow;
    }

    public async sendResponse(messageId: string, user: PolicyUser) {
        const collection = new DataBaseHelper(PolicyAction);

        const cred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did);
        const row = await collection.findOne({
            messageId,
            accountId: cred.hederaAccountId,
            type: PolicyActionType.REQUEST
        });

        if (!row) {
            throw new Error('Request not found');
        }

        const data = await PolicyActionsUtils.response(row, user);

        const userCred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did);
        const userHederaCred = await userCred.loadHederaCredentials(this.policyInstance);
        const signOptions = await userCred.loadSignOptions(this.policyInstance);
        const messageServer = new MessageServer(
            userHederaCred.hederaAccountId,
            userHederaCred.hederaAccountKey,
            signOptions
        );

        const newRow = collection.create({
            status: PolicyActionStatus.COMPLETED,
            type: row.type,
            uuid: row.uuid,
            owner: row.owner,
            creator: row.owner,
            accountId: row.accountId,
            blockTag: row.blockTag,
            messageId: null,
            sender: null,
            startMessageId: row.messageId,
            topicId: this.topicId,
            index: null,
            policyId: this.policyId,
            document: data,
            lastStatus: PolicyActionStatus.COMPLETED
        });

        const message = new PolicyActionMessage(MessageAction.UpdatePolicyRequest);
        message.setDocument(newRow, newRow.document);

        const messageResult = await messageServer
            .setTopicObject(this.topic)
            .sendMessage(message, true);
        newRow.messageId = messageResult.getId();
        newRow.sender = messageResult.payer;

        await collection.insertOrUpdate([newRow], 'messageId');
        await this.updateLastStatus(newRow);
        await this.sentNotification(newRow);

        return newRow;
    }

    public async rejectRequest(row: PolicyAction, user: PolicyUser) {
        const collection = new DataBaseHelper(PolicyAction);
        row.status = PolicyActionStatus.REJECT;
        row.lastStatus = PolicyActionStatus.NEW;
        await collection.insertOrUpdate([row], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);
        return row;
    }

    private async loadTask(data: ITopicMessage): Promise<boolean> {
        console.debug('--- loadTask');
        try {
            const message = PolicyActionMessage.from(data);

            switch (message.action) {
                case MessageAction.CreatePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ACTION, PolicyActionStatus.NEW);
                    if (this.isLocal) {
                        await this.executeAction(row);
                    } else {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.UpdatePolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ACTION, PolicyActionStatus.COMPLETED);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.ErrorPolicyAction: {
                    const row = await this.savePolicyAction(message, PolicyActionType.ACTION, PolicyActionStatus.ERROR);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.CreatePolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REQUEST, PolicyActionStatus.NEW);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.UpdatePolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REQUEST, PolicyActionStatus.COMPLETED);
                    if (this.isLocal) {
                        await this.completeRequest(row);
                    } else {
                        await this.sentNotification(row);
                    }
                    break;
                }
                case MessageAction.ErrorPolicyRequest: {
                    const row = await this.savePolicyAction(message, PolicyActionType.REQUEST, PolicyActionStatus.ERROR);
                    if (!this.isLocal) {
                        await this.sentNotification(row);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
            console.debug('--- task --');
        } catch (error) {
            console.log(error);
        }
        return true;
    }

    private async savePolicyAction(message: PolicyActionMessage, type: PolicyActionType, status: PolicyActionStatus) {
        const collection = new DataBaseHelper(PolicyAction);
        console.debug('--- savePolicyAction --');
        let document: any;
        try {
            console.debug('--- loadDocument --');
            await MessageServer.loadDocument(message);
            document = message.getDocument();
        } catch (error) {
            console.debug('--- error --', error);
            document = null;
        }
        let lastStatus = PolicyActionStatus.NEW;
        switch (message.action) {
            case MessageAction.CreatePolicyRequest: {
                lastStatus = PolicyActionStatus.NEW;
                break;
            }
            case MessageAction.UpdatePolicyRequest: {
                lastStatus = PolicyActionStatus.COMPLETED;
                break;
            }
            case MessageAction.ErrorPolicyRequest: {
                lastStatus = PolicyActionStatus.ERROR;
                break;
            }
            case MessageAction.CreatePolicyAction: {
                lastStatus = PolicyActionStatus.NEW;
                break;
            }
            case MessageAction.UpdatePolicyAction: {
                lastStatus = PolicyActionStatus.COMPLETED;
                break;
            }
            case MessageAction.ErrorPolicyAction: {
                lastStatus = PolicyActionStatus.ERROR;
                break;
            }
        }
        let row = await collection.findOne({ messageId: message.id });
        if (!row) {
            row = collection.create({
                status,
                type,
                uuid: message.uuid,
                owner: message.owner,
                creator: message.owner,
                accountId: message.accountId,
                sender: message.payer,
                blockTag: message.blockTag,
                messageId: message.id,
                startMessageId: message.parent || message.id,
                topicId: message.topicId?.toString(),
                index: Number(message.index),
                policyId: this.policyId,
                document,
                lastStatus
            });
            await collection.insertOrUpdate([row], 'messageId');
        } else {
            row.type = type;
            row.uuid = message.uuid;
            row.owner = message.owner;
            row.creator = message.owner;
            row.accountId = message.accountId;
            row.sender = message.payer;
            row.topicId = message.topicId?.toString();
            row.blockTag = message.blockTag;
            row.messageId = message.id;
            row.index = Number(message.index);
            row.startMessageId = message.parent || message.id;
            row.policyId = this.policyId;
            row.status = status;
            row.document = document;
            row.lastStatus = lastStatus;
            await collection.insertOrUpdate([row], 'messageId');
        }
        await this.updateLastStatus(row);
        return row;
    }

    private async executeAction(row: PolicyAction) {
        try {
            console.debug('---- 1', row);
            if (!row || !row.document) {
                throw new Error('Invalid document');
            }

            if (row.accountId !== row.sender) {
                throw new Error('Invalid user');
            }

            // User
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByAccount(row.sender, this.policyInstance);
            if (!policyUser) {
                console.debug('---- 2', row);
                return;
            }

            // Available
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(this.policyId, row.blockTag);
            const error = await PolicyComponentsUtils.isAvailableSetData(block, policyUser);
            if (error) {
                console.debug('---- 3', row);
                return;
            }

            const result = await block.setData(policyUser, row.document);

            console.debug('---- 4', row);
            await this.sentCompleteMessage(row, result);
        } catch (error) {
            console.debug('---- 7', error);
            await this.sentErrorMessage(row, error);
        }
    }

    private async sentCompleteMessage(row: PolicyAction, result: any) {
        try {
            const root = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner);
            const rootHederaCred = await root.loadHederaCredentials(this.policyInstance);
            const rootSignOptions = await root.loadSignOptions(this.policyInstance);
            const messageServer = new MessageServer(
                rootHederaCred.hederaAccountId,
                rootHederaCred.hederaAccountKey,
                rootSignOptions
            );
            const collection = new DataBaseHelper(PolicyAction);
            const newRow = collection.create({
                status: PolicyActionStatus.COMPLETED,
                type: row.type,
                uuid: row.uuid,
                owner: row.owner,
                creator: row.owner,
                accountId: row.accountId,
                blockTag: row.blockTag,
                messageId: null,
                sender: null,
                startMessageId: row.messageId,
                topicId: this.topicId,
                index: null,
                policyId: this.policyId,
                document: null,
                lastStatus: PolicyActionStatus.COMPLETED
            });

            const message = new PolicyActionMessage(MessageAction.UpdatePolicyAction);
            message.setDocument(newRow, newRow.document);

            const messageResult = await messageServer
                .setTopicObject(this.topic)
                .sendMessage(message, true);
            row.messageId = messageResult.getId();
            row.sender = messageResult.payer;

            await collection.insertOrUpdate([newRow], 'messageId');

            await this.updateLastStatus(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async sentErrorMessage(row: PolicyAction, error: string | Error) {
        console.debug('- Error ???');
        try {
            if (row.sender !== row.accountId) {
                return;
            }
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByAccount(row.sender, this.policyInstance);
            if (!policyUser) {
                return;
            }

            const root = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner);
            const rootHederaCred = await root.loadHederaCredentials(this.policyInstance);
            const rootSignOptions = await root.loadSignOptions(this.policyInstance);
            const messageServer = new MessageServer(
                rootHederaCred.hederaAccountId,
                rootHederaCred.hederaAccountKey,
                rootSignOptions
            );
            const collection = new DataBaseHelper(PolicyAction);
            const newRow = collection.create({
                type: row.type,
                status: PolicyActionStatus.ERROR,
                uuid: row.uuid,
                owner: row.owner,
                creator: row.owner,
                accountId: row.accountId,
                blockTag: row.blockTag,
                messageId: null,
                startMessageId: row.messageId,
                topicId: this.topicId,
                index: null,
                policyId: this.policyId,
                document: typeof error === 'string' ? error : error.message,
                lastStatus: PolicyActionStatus.ERROR
            });

            const message = new PolicyActionMessage(MessageAction.ErrorPolicyAction);
            message.setDocument(newRow, newRow.document);

            const messageResult = await messageServer
                .setTopicObject(this.topic)
                .sendMessage(message, true);
            row.messageId = messageResult.getId();
            row.sender = messageResult.payer;

            await collection.insertOrUpdate([newRow], 'messageId');

            await this.updateLastStatus(newRow);
        } catch (error) {
            console.error(error);
        }
    }

    private async updateLastStatus(row: PolicyAction) {
        const collection = DataBaseHelper.orm.em.getCollection<PolicyAction>('PolicyAction');
        collection.updateMany(
            { startMessageId: row.startMessageId },
            { $set: { lastStatus: row.lastStatus } }
        )
    }

    private async sentNotification(row: PolicyAction) {
        PolicyComponentsUtils.sentRequestNotification(row);
    }

    private async completeRequest(response: PolicyAction) {
        const collection = new DataBaseHelper(PolicyAction);
        const request = await collection.findOne({ messageId: response.startMessageId });
        const valid = await PolicyActionsUtils.validate(request, response);
        if (valid) {
            const callback = this.callback.get(request.messageId);
            if (callback) {
                this.callback.delete(request.messageId)
                await callback(response);
            }
        }
    }
}