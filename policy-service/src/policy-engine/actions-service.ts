import { DataBaseHelper, DatabaseServer, ITopicMessage, MessageAction, MessageServer, Policy, PolicyActionMessage, PolicyAction, TopicConfig, TopicListener } from '@guardian/common';
import { GenerateUUIDv4, PolicyActionStatus, PolicyActionType, PolicyStatus } from '@guardian/interfaces';
import { IPolicyInterfaceBlock } from './policy-engine.interface.js';
import { PolicyUser, UserCredentials } from './policy-user.js';
import { PolicyUtils } from './helpers/utils.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { PolicyActionsUtils } from './policy-actions/utils.js';

export class PolicyActionsService {
    private readonly topicId: string;
    private readonly policyId: string;
    private readonly isLocal: boolean;
    private readonly policyInstance: IPolicyInterfaceBlock;
    private readonly policyOwner: string;
    private readonly policyOwnerId: string;
    private readonly messageId: string;

    private topic: TopicConfig;
    private topicListener: TopicListener;
    private readonly callback: Map<string, Function>;

    constructor(
        policyId: string,
        policyInstance: IPolicyInterfaceBlock,
        policy: Policy,
        policyOwnerId: string | null
    ) {
        this.policyId = policyId;
        this.topicId = policy.actionsTopicId;
        this.isLocal = policy.status !== PolicyStatus.VIEW;
        this.policyInstance = policyInstance;
        this.policyOwner = policy.owner;
        this.policyOwnerId = policyOwnerId;
        this.messageId = policy.messageId;
        this.callback = new Map<string, Function>();
    }

    public async init(): Promise<void> {
        const topicConfig = await DatabaseServer.getTopicById(this.topicId);
        this.topic = await TopicConfig.fromObject(topicConfig, false, this.policyOwnerId);
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
        const userCred = await PolicyUtils.getUserCredentials(block, user.did, user.userId);
        const userHederaCred = await userCred.loadHederaCredentials(block, user.userId);
        const userSignOptions = await userCred.loadSignOptions(block, user.userId);
        const userMessageKey = await userCred.loadMessageKey(block, user.userId);

        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions,
            dryRun: block.dryRun
        });
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
        callback: (action: PolicyAction) => Promise<void>,
        userId: string | null
    ): Promise<any> {
        const policyOwnerCred = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner, this.policyOwnerId);
        const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(this.policyInstance, this.policyOwnerId);
        const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(this.policyInstance, this.policyOwnerId);
        const userMessageKey = await UserCredentials.loadMessageKeyByAccount(this.messageId, data.accountId, userId);

        const messageServer = new MessageServer({
            operatorId: policyOwnerHederaCred.hederaAccountId,
            operatorKey: policyOwnerHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: policyOwnerSignOptions
        });
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

        const cred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const row = await collection.findOne({
            messageId,
            accountId: cred.hederaAccountId,
            type: PolicyActionType.REQUEST
        });

        if (!row) {
            throw new Error('Request not found');
        }

        const data = await PolicyActionsUtils.response(row, user, user.userId);

        const userCred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const userHederaCred = await userCred.loadHederaCredentials(this.policyInstance, user.userId);
        const userSignOptions = await userCred.loadSignOptions(this.policyInstance, user.userId);
        const userMessageKey = await userCred.loadMessageKey(this.policyInstance, user.userId);
        const messageServer = new MessageServer({
            operatorId: userHederaCred.hederaAccountId,
            operatorKey: userHederaCred.hederaAccountKey,
            encryptKey: userMessageKey,
            signOptions: userSignOptions
        });

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

    public async rejectRequest(messageId: string, user: PolicyUser) {
        const collection = new DataBaseHelper(PolicyAction);
        const cred = await PolicyUtils.getUserCredentials(this.policyInstance, user.did, user.userId);
        const row = await collection.findOne({
            messageId,
            accountId: cred.hederaAccountId,
            type: PolicyActionType.REQUEST
        });

        if (!row) {
            throw new Error('Request not found');
        }

        row.status = PolicyActionStatus.REJECTED;
        row.lastStatus = PolicyActionStatus.REJECTED;
        await collection.insertOrUpdate([row], 'messageId');
        await this.updateLastStatus(row);
        await this.sentNotification(row);
        return row;
    }

    private async loadTask(data: ITopicMessage): Promise<boolean> {
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
        } catch (error) {
            console.log(error);
        }
        return true;
    }

    private async savePolicyAction(message: PolicyActionMessage, type: PolicyActionType, status: PolicyActionStatus) {
        const collection = new DataBaseHelper(PolicyAction);
        let document: any;
        try {
            await MessageServer.loadDocument(message);
            document = message.getDocument();
        } catch (error) {
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
            default: {
                lastStatus = PolicyActionStatus.NEW;
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
            if (!row || !row.document) {
                throw new Error('Invalid document');
            }

            if (row.accountId !== row.sender) {
                throw new Error('Invalid user');
            }

            // User
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByAccount(row.sender, this.policyInstance, this.policyOwnerId);
            if (!policyUser) {
                return;
            }

            // Available
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(this.policyId, row.blockTag);
            const error = await PolicyComponentsUtils.isAvailableSetData(block, policyUser);
            if (error) {
                return;
            }

            const result = await block.setData(policyUser, row.document);
            await this.sentCompleteMessage(row, policyUser, result, this.policyOwnerId);
        } catch (error) {
            await this.sentErrorMessage(row, error, this.policyOwnerId);
        }
    }

    private async sentCompleteMessage(
        row: PolicyAction,
        policyUser: PolicyUser,
        result: any,
        userId: string | null
    ) {
        try {
            const policyOwnerCred = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner, userId);
            const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(this.policyInstance, userId);
            const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(this.policyInstance, userId);
            const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, policyUser.did, userId);
            const messageServer = new MessageServer({
                operatorId: policyOwnerHederaCred.hederaAccountId,
                operatorKey: policyOwnerHederaCred.hederaAccountKey,
                encryptKey: userMessageKey,
                signOptions: policyOwnerSignOptions
            });
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

    private async sentErrorMessage(
        row: PolicyAction,
        error: string | Error,
        userId: string | null
    ) {
        try {
            if (row.sender !== row.accountId) {
                return;
            }
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByAccount(row.sender, this.policyInstance, userId);
            if (!policyUser) {
                return;
            }

            const policyOwnerCred = await PolicyUtils.getUserCredentials(this.policyInstance, this.policyOwner, userId);
            const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(this.policyInstance, userId);
            const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(this.policyInstance, userId);
            const userMessageKey = await UserCredentials.loadMessageKey(this.messageId, policyUser.did, userId);
            const messageServer = new MessageServer({
                operatorId: policyOwnerHederaCred.hederaAccountId,
                operatorKey: policyOwnerHederaCred.hederaAccountKey,
                encryptKey: userMessageKey,
                signOptions: policyOwnerSignOptions
            });
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
        const valid = await PolicyActionsUtils.validate(request, response, this.policyOwnerId);
        if (valid) {
            const callback = this.callback.get(request.messageId);
            if (callback) {
                this.callback.delete(request.messageId)
                await callback(response);
            }
        }
    }
}