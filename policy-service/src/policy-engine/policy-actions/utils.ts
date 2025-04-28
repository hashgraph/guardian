import { PolicyAction, RoleMessage, VcDocumentDefinition } from "@guardian/common";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { LocationType, PolicyActionStatus } from "@guardian/interfaces";
import { PolicyUtils } from "../helpers/utils.js";
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from "@policy-engine/policy-user.js";
import { BlockActionError } from '../errors/index.js';
import { SignAndSendRole } from "./sign-and-send-role.js";
import { GenerateDID } from "./generate-did.js";
import { SignVC } from "./sign-vc.js";

export enum PolicyActionType {
    SignAndSendRole = 'sign-and-send-role',
    GenerateDID = 'generate-did',
    SignVC = 'sign-vc',
}

export class PolicyActionsUtils {
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
        }
        return false;
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
        }
        throw new Error('Invalid command');
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
     */
    public static async signVC(
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        uuid: string,
    ): Promise<VcDocumentDefinition> {
        const userCred = await PolicyUtils.getUserCredentials(ref, issuer);
        if (userCred.location === LocationType.LOCAL) {
            return await SignVC.local(ref, subject, issuer, uuid);
        } else {
            const data = await SignVC.request(ref, subject, issuer, uuid);
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
     * request-vc-document-block-addon
     */

    /**
     * request-vc-document-block
     */   

    /**
     * revocation-block
     */

    /**
     * revoke-block
     */

    /**
     * send-to-guardian-block
     */

    /**
     * tag-manager
     */

    /**
     * token-action-block
     */
}