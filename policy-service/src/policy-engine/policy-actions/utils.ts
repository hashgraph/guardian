import { IDocumentOptions, Message, PolicyAction, RoleMessage, Token, TopicConfig, VcDocumentDefinition } from '@guardian/common';
import { LocationType, PolicyActionStatus, PolicyStatus, TopicType } from '@guardian/interfaces';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { BlockActionError } from '../errors/index.js';
import { SignAndSendRole } from './sign-and-send-role.js';
import { GenerateDID } from './generate-did.js';
import { SignVC } from './sign-vc.js';
import { PolicyActionType } from './policy-action.type.js';
import { SendMessage } from './send-message.js';
import { CreateTopic } from './create-topic.js';
import { AssociateToken } from './associate-token.js';
import { DissociateToken } from './dissociate-token.js';
import { SendMessages } from './send-messages.js';

export class PolicyActionsUtils {
    private static needKey(status: PolicyStatus): boolean {
        switch (status) {
            case PolicyStatus.DRY_RUN: return false;
            case PolicyStatus.DEMO: return false;
            case PolicyStatus.VIEW: return false;
            case PolicyStatus.DRAFT: return false;
            case PolicyStatus.PUBLISH_ERROR: return false;
            case PolicyStatus.PUBLISH: return true;
            case PolicyStatus.DISCONTINUED: return true;
            default: return false;
        }
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ) {
        const type = request?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.validate(request, response, userId);
            }
            case PolicyActionType.GenerateDID: {
                return await GenerateDID.validate(request, response, userId);
            }
            case PolicyActionType.SignVC: {
                return await SignVC.validate(request, response, userId);
            }
            case PolicyActionType.SendMessage: {
                return await SendMessage.validate(request, response, userId);
            }
            case PolicyActionType.SendMessages: {
                return await SendMessages.validate(request, response, userId);
            }
            case PolicyActionType.CreateTopic: {
                return await CreateTopic.validate(request, response, userId);
            }
            case PolicyActionType.AssociateToken: {
                return await AssociateToken.validate(request, response, userId);
            }
            case PolicyActionType.DissociateToken: {
                return await DissociateToken.validate(request, response, userId);
            }
            default:
                return false;
        }
    }

    public static async response(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ) {
        const type = row?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.response(row, user, userId);
            }
            case PolicyActionType.GenerateDID: {
                return await GenerateDID.response(row, user, userId);
            }
            case PolicyActionType.SignVC: {
                return await SignVC.response(row, user, userId);
            }
            case PolicyActionType.SendMessage: {
                return await SendMessage.response(row, user, userId);
            }
            case PolicyActionType.SendMessages: {
                return await SendMessages.response(row, user, userId);
            }
            case PolicyActionType.CreateTopic: {
                return await CreateTopic.response(row, user, userId);
            }
            case PolicyActionType.AssociateToken: {
                return await AssociateToken.response(row, user, userId);
            }
            case PolicyActionType.DissociateToken: {
                return await DissociateToken.response(row, user, userId);
            }
            default:
                throw new Error('Invalid command');
        }
    }

    /**
     * policy-roles
     */
    public static async signAndSendRole(
        ref: AnyBlockType,
        subject: any,
        group: any,
        uuid: string,
        userId: string | null
    ): Promise<{
        vc: VcDocumentDefinition,
        message: RoleMessage
    }> {
        const did = group.owner;
        const userCred = await PolicyUtils.getUserCredentials(ref, did, userId);

        if (userCred.location === LocationType.LOCAL) {
            return await SignAndSendRole.local(ref, subject, group, uuid, userId);
        } else {
            const data = await SignAndSendRole.request(ref, subject, group, uuid, userId);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SignAndSendRole.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * action-block
     */
    public static async downloadPrivateDocument(
        ref: AnyBlockType,
        userDID: string,
        sensorDid: string,
        userId: string | null
    ) {
        const userCred = await PolicyUtils.getUserCredentials(ref, userDID, userId);
        if (userCred.location === LocationType.LOCAL) {
            const hederaCred = await userCred.loadHederaCredentials(ref, userId);
            const didDocument = await userCred.loadSubDidDocument(ref, sensorDid, userId);
            return {
                hederaAccountId: hederaCred.hederaAccountId,
                hederaAccountKey: hederaCred.hederaAccountKey,
                didDocument: didDocument.getPrivateDocument(),
            }
        } else {
            throw new Error('Unsupported action');
        }
    }

    /**
     * custom-logic-block
     */
    public static async generateId(
        ref: AnyBlockType,
        type: string,
        user: PolicyUser,
        userId: string | null
    ): Promise<string> {
        try {
            if (type === 'UUID') {
                return await ref.components.generateUUID();
            }
            if (type === 'OWNER') {
                return user.did;
            }
            if (type === 'DOCUMENT') {
                return undefined;
            }
            if (type === 'DID') {
                const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
                if (userCred.location === LocationType.LOCAL) {
                    return await GenerateDID.local(ref, user, userId);
                } else {
                    const data = await GenerateDID.request(ref, user, userId);
                    return new Promise((resolve, reject) => {
                        const callback = async (action: PolicyAction) => {
                            if (action.status === PolicyActionStatus.COMPLETED) {
                                const result = await GenerateDID.complete(action, user, userId);
                                resolve(result)
                            } else {
                                reject(action.document);
                            }
                        }
                        const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                        controller.sendRequest(data, callback, userId).catch(reject).then();
                    });
                }
            }
            return undefined;
        } catch (error) {
            ref.error(`generateId: ${type} : ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * custom-logic-block
     * request-vc-document-block-addon
     * request-vc-document-block
     * reassigning.block
     * tag-manager
     */
    public static async signVC(
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        options: IDocumentOptions,
        userId: string | null
    ): Promise<VcDocumentDefinition> {
        const userCred = await PolicyUtils.getUserCredentials(ref, issuer, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await SignVC.local(ref, subject, issuer, options, userId);
        } else {
            const data = await SignVC.request(ref, subject, issuer, options, userId);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SignVC.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * send-to-guardian-block
     * tag-manager
     */
    public static async sendMessage(
        ref: AnyBlockType,
        topic: TopicConfig,
        message: Message,
        owner: string,
        updateIpfs: boolean,
        userId: string | null
    ): Promise<Message> {
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await SendMessage.local(ref, topic, message, owner, updateIpfs, userId);
        } else {
            const data = await SendMessage.request(ref, topic, message, owner, updateIpfs, userId);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SendMessage.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * revocation-block
     * revoke-block
     */
    public static async sendMessages(
        ref: AnyBlockType,
        messages: Message[],
        owner: string,
        updateIpfs: boolean,
        userId: string | null
    ): Promise<Message[]> {
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await SendMessages.local(ref, messages, owner, updateIpfs, userId);
        } else {
            const data = await SendMessages.request(ref, messages, owner, updateIpfs, userId);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SendMessages.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * token-action-block
     */
    public static async associateToken(
        ref: AnyBlockType,
        token: Token,
        user: string,
        userId: string | null
    ): Promise<boolean> {
        const userCred = await PolicyUtils.getUserCredentials(ref, user, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await AssociateToken.local(ref, token, user, userId);
        } else {
            const data = await AssociateToken.request(ref, token, user, userId);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await AssociateToken.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * token-action-block
     */
    public static async dissociateToken(
        ref: AnyBlockType,
        token: Token,
        user: string,
        userId: string | null
    ): Promise<boolean> {
        const userCred = await PolicyUtils.getUserCredentials(ref, user, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await DissociateToken.local(ref, token, user, userId);
        } else {
            const data = await DissociateToken.request(ref, token, user, userId);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await DissociateToken.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * send-to-guardian-block
     */
    public static async getOrCreateTopic(
        ref: AnyBlockType,
        name: string,
        owner: string,
        memoObj: any,
        userId: string | null
    ): Promise<TopicConfig> {
        // Root topic
        if (!name || name === 'root') {
            return await PolicyActionsUtils.getRootTopic(ref, userId);
        }

        // Check config
        const policyTopics = ref.policyInstance.policyTopics || [];
        const config = policyTopics.find(e => e.name === name);
        if (!config) {
            throw new Error(`Topic '${name}' does not exist`);
        }

        // User topic
        const topicOwner: string = config.static ? ref.policyOwner : owner;

        const topic = await PolicyActionsUtils.getTopic(ref, name, topicOwner, userId);
        if (topic) {
            return topic;
        }

        return await PolicyActionsUtils.createTopic(ref, TopicType.DynamicTopic, config, topicOwner, memoObj, userId);
    }

    public static async getRootTopic(
        ref: AnyBlockType,
        userId: string | null
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus);
        const rootTopic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            }), needKey, userId);
        return rootTopic;
    }

    public static async getTopic(
        ref: AnyBlockType,
        name: string,
        owner: string,
        userId: string | null
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus);
        const topic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.DynamicTopic,
                name,
                owner
            }), needKey, userId);
        return topic;
    }

    public static async getTopicById(
        ref: AnyBlockType,
        topicId: string,
        userId: string | null
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus);
        const topic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopicById(topicId),
            needKey,
            userId
        );
        return topic;
    }

    public static async createTopic(
        ref: AnyBlockType,
        type: TopicType,
        config: any,
        owner: string,
        memoObj: any,
        userId: string | null
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus);
        const userCred = await PolicyUtils.getUserCredentials(ref, owner, userId);
        if (userCred.location === LocationType.LOCAL) {
            return await CreateTopic.local(ref, type, config, owner, memoObj, needKey, userId);
        } else {
            const data = await CreateTopic.request(ref, type, config, owner, memoObj, userId);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await CreateTopic.complete(action, userId);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback, userId).catch(reject).then();
            });
        }
    }

    /**
     * external-topic-block
     */

    /**
     * group-manager
     */

    /**
     * multi-sign-block
     */
}