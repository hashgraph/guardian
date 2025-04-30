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

    public static async validate(request: PolicyAction, response: PolicyAction) {
        const type = request?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.validate(request, response);
            }
            case PolicyActionType.GenerateDID: {
                return await GenerateDID.validate(request, response);
            }
            case PolicyActionType.SignVC: {
                return await SignVC.validate(request, response);
            }
            case PolicyActionType.SendMessage: {
                return await SendMessage.validate(request, response);
            }
            case PolicyActionType.CreateTopic: {
                return await CreateTopic.validate(request, response);
            }
            case PolicyActionType.AssociateToken: {
                return await AssociateToken.validate(request, response);
            }
            case PolicyActionType.DissociateToken: {
                return await DissociateToken.validate(request, response);
            }
            default:
                return false;
        }
    }

    public static async response(row: PolicyAction, user: PolicyUser) {
        const type = row?.document?.type;
        switch (type) {
            case PolicyActionType.SignAndSendRole: {
                return await SignAndSendRole.response(row, user);
            }
            case PolicyActionType.GenerateDID: {
                return await GenerateDID.response(row, user);
            }
            case PolicyActionType.SignVC: {
                return await SignVC.response(row, user);
            }
            case PolicyActionType.SendMessage: {
                return await SendMessage.response(row, user);
            }
            case PolicyActionType.CreateTopic: {
                return await CreateTopic.response(row, user);
            }
            case PolicyActionType.AssociateToken: {
                return await AssociateToken.response(row, user);
            }
            case PolicyActionType.DissociateToken: {
                return await DissociateToken.response(row, user);
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
        uuid: string
    ): Promise<{
        vc: VcDocumentDefinition,
        message: RoleMessage
    }> {
        const did = group.owner;
        const userCred = await PolicyUtils.getUserCredentials(ref, did);

        if (userCred.location === LocationType.LOCAL) {
            return await SignAndSendRole.local(ref, subject, group, uuid);
        } else {
            const data = await SignAndSendRole.request(ref, subject, group, uuid);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SignAndSendRole.complete(action);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback).catch(reject).then();
            });
        }
    }

    /**
     * action-block
     */
    public static async downloadPrivateDocument(ref: AnyBlockType, userDID: string, sensorDid: string) {
        const userCred = await PolicyUtils.getUserCredentials(ref, userDID);
        if (userCred.location === LocationType.LOCAL) {
            const hederaCred = await userCred.loadHederaCredentials(ref);
            const didDocument = await userCred.loadSubDidDocument(ref, sensorDid);
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
        user: PolicyUser
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
                const userCred = await PolicyUtils.getUserCredentials(ref, user.did);
                if (userCred.location === LocationType.LOCAL) {
                    return await GenerateDID.local(ref, user);
                } else {
                    const data = await GenerateDID.request(ref, user);
                    return new Promise((resolve, reject) => {
                        const callback = async (action: PolicyAction) => {
                            if (action.status === PolicyActionStatus.COMPLETED) {
                                const result = await GenerateDID.complete(action, user);
                                resolve(result)
                            } else {
                                reject(action.document);
                            }
                        }
                        const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                        controller.sendRequest(data, callback).catch(reject).then();
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
     */
    public static async signVC(
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        options: IDocumentOptions
    ): Promise<VcDocumentDefinition> {
        const userCred = await PolicyUtils.getUserCredentials(ref, issuer);
        if (userCred.location === LocationType.LOCAL) {
            return await SignVC.local(ref, subject, issuer, options);
        } else {
            const data = await SignVC.request(ref, subject, issuer, options);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SignVC.complete(action);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback).catch(reject).then();
            });
        }
    }

    /**
     * send-to-guardian-block
     */
    public static async sendMessage(
        ref: AnyBlockType,
        topic: TopicConfig,
        message: Message,
        owner: string,
    ): Promise<Message> {
        const userCred = await PolicyUtils.getUserCredentials(ref, owner);
        if (userCred.location === LocationType.LOCAL) {
            return await SendMessage.local(ref, topic, message, owner);
        } else {
            const data = await SendMessage.request(ref, topic, message, owner);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await SendMessage.complete(action);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback).catch(reject).then();
            });
        }
    }

    /**
     * external-data-block
     */

    /**
     * external-topic-block
     */

    /**
     * group-manager
     */

    /**
     * multi-sign-block
     */

    /**
     * reassigning.block
     */

    /**
     * revocation-block
     */

    /**
     * revoke-block
     */

    /**
     * tag-manager
     */

    /**
     * token-action-block
     */
    public static async associateToken(
        ref: AnyBlockType,
        token: Token,
        user: string,
    ): Promise<boolean> {
        const userCred = await PolicyUtils.getUserCredentials(ref, user);
        if (userCred.location === LocationType.LOCAL) {
            return await AssociateToken.local(ref, token, user);
        } else {
            const data = await AssociateToken.request(ref, token, user);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await AssociateToken.complete(action);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback).catch(reject).then();
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
    ): Promise<boolean> {
        const userCred = await PolicyUtils.getUserCredentials(ref, user);
        if (userCred.location === LocationType.LOCAL) {
            return await DissociateToken.local(ref, token, user);
        } else {
            const data = await DissociateToken.request(ref, token, user);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await DissociateToken.complete(action);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback).catch(reject).then();
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
    ): Promise<TopicConfig> {
        // Root topic
        if (!name || name === 'root') {
            return await PolicyActionsUtils.getRootTopic(ref);
        }

        // Check config
        const policyTopics = ref.policyInstance.policyTopics || [];
        const config = policyTopics.find(e => e.name === name);
        if (!config) {
            throw new Error(`Topic '${name}' does not exist`);
        }

        // User topic
        const topicOwner: string = config.static ? ref.policyOwner : owner;

        const topic = await PolicyActionsUtils.getTopic(ref, name, topicOwner);
        if (topic) {
            return topic;
        }

        return await PolicyActionsUtils.createTopic(ref, TopicType.DynamicTopic, config, topicOwner, memoObj);
    }

    public static async getRootTopic(
        ref: AnyBlockType,

    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus);
        const rootTopic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            }), needKey);
        return rootTopic;
    }

    public static async getTopic(
        ref: AnyBlockType,
        name: string,
        owner: string
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus);
        const topic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.DynamicTopic,
                name,
                owner
            }), needKey);
        return topic;
    }

    public static async createTopic(
        ref: AnyBlockType,
        type: TopicType,
        config: any,
        owner: string,
        memoObj: any,
    ): Promise<TopicConfig> {
        const needKey = PolicyActionsUtils.needKey(ref.policyStatus);
        const userCred = await PolicyUtils.getUserCredentials(ref, owner);
        if (userCred.location === LocationType.LOCAL) {
            return await CreateTopic.local(ref, type, config, owner, memoObj, needKey);
        } else {
            const data = await CreateTopic.request(ref, type, config, owner, memoObj);
            return new Promise((resolve, reject) => {
                const callback = async (action: PolicyAction) => {
                    if (action.status === PolicyActionStatus.COMPLETED) {
                        const result = await CreateTopic.complete(action);
                        resolve(result)
                    } else {
                        reject(action.document);
                    }
                }
                const controller = PolicyComponentsUtils.getActionsController(ref.policyId);
                controller.sendRequest(data, callback).catch(reject).then();
            });
        }
    }
}