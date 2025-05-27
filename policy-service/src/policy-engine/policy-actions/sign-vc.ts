import { VcHelper, PolicyAction, IDocumentOptions, VcDocumentDefinition } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyComponentsUtils } from './../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyActionType } from './policy-action.type.js';

export class SignVC {
    public static async local(
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        options: IDocumentOptions,
        userId: string | null
    ): Promise<VcDocumentDefinition> {
        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, issuer, userId);
        const didDocument = await userCred.loadDidDocument(ref, userId);
        const newVC = await vcHelper.createVerifiableCredential(
            subject,
            didDocument,
            null,
            options
        );
        return newVC;
    }

    public static async request(
        ref: AnyBlockType,
        subject: any,
        issuer: string,
        options: IDocumentOptions,
        userId: string | null
    ): Promise<any> {
        const vcHelper = new VcHelper();
        const userAccount = await PolicyUtils.getHederaAccountId(ref, issuer, userId);

        const rootCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
        const rootDidDocument = await rootCred.loadDidDocument(ref, userId);
        const rootVC = await vcHelper.createVerifiableCredential(
            subject,
            rootDidDocument,
            null,
            options
        );

        const data = {
            uuid: GenerateUUIDv4(),
            owner: issuer,
            accountId: userAccount,
            blockTag: ref.tag,
            document: {
                type: PolicyActionType.SignVC,
                options,
                issuer,
                document: rootVC.getDocument(),
            }
        };

        return data;
    }

    public static async response(
        row: PolicyAction,
        user: PolicyUser,
        userId: string | null
    ) {
        const ref = PolicyComponentsUtils.GetBlockByTag<any>(row.policyId, row.blockTag);
        const data = row.document;
        const document = data.document;
        const options = data.options;

        const vc = VcDocumentDefinition.fromJsonTree(document);
        const subject = vc.getCredentialSubject().toJsonTree();

        const vcHelper = new VcHelper();
        const userCred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
        const userDidDocument = await userCred.loadDidDocument(ref, userId);
        const userVC = await vcHelper.createVerifiableCredential(
            subject,
            userDidDocument,
            null,
            options
        );

        return {
            type: PolicyActionType.SignAndSendRole,
            options,
            issuer: user.did,
            document: userVC.getDocument()
        };
    }

    public static async complete(
        row: PolicyAction,
        userId: string | null
    ): Promise<VcDocumentDefinition> {
        const data = row.document;
        const userVC = VcDocumentDefinition.fromJsonTree(data.document);
        return userVC;
    }

    public static async validate(
        request: PolicyAction,
        response: PolicyAction,
        userId: string | null
    ): Promise<boolean> {
        if (request && response && request.accountId === response.accountId) {
            return true;
        }
        return false;
    }
}
