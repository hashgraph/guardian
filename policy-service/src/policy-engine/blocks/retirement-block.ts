import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { Token as TokenCollection, VcHelper, VcDocumentDefinition as VcDocument, MessageServer, VCMessage, MessageAction, VPMessage, HederaDidDocument } from '@guardian/common';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser, UserCredentials } from '@policy-engine/policy-user';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { MintService } from '@policy-engine/mint/mint-service';

/**
 * Retirement block
 */
@BasicBlock({
    blockType: 'retirementDocumentBlock',
    commonBlock: true,
    about: {
        label: 'Wipe',
        title: `Add 'Wipe' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.tokenId', alias: 'token', type: 'Token' }
    ]
})
export class RetirementBlock {
    /**
     * Create wipe VC
     * @param didDocument
     * @param token
     * @param data
     * @param ref
     * @private
     */
    private async createWipeVC(
        didDocument: HederaDidDocument,
        token: any,
        data: any,
        ref: AnyBlockType
    ): Promise<VcDocument> {
        const vcHelper = new VcHelper();
        const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.WIPE_TOKEN);
        const amount = data as string;
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            tokenId: token.tokenId,
            amount: amount.toString()
        }
        const uuid = await ref.components.generateUUID();
        const wipeVC = await vcHelper.createVerifiableCredential(
            vcSubject,
            didDocument,
            null,
            { uuid });
        return wipeVC;
    }

    /**
     * Create VP
     * @param root
     * @param uuid
     * @param vcs
     * @private
     */
    private async createVP(didDocument: HederaDidDocument, uuid: string, vcs: VcDocument[]) {
        const vcHelper = new VcHelper();
        const vp = await vcHelper.createVerifiablePresentation(
            vcs,
            didDocument,
            null,
            { uuid }
        );
        return vp;
    }

    /**
     * Retirement processing
     * @param token
     * @param documents
     * @param relationships
     * @param topicId
     * @param root
     * @param user
     * @private
     */
    private async retirementProcessing(
        token: TokenCollection,
        documents: VcDocument[],
        relationships: string[],
        topicId: string,
        root: UserCredentials,
        user: IPolicyUser,
        targetAccountId: string
    ): Promise<[IPolicyDocument, number]> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        const didDocument = await root.loadDidDocument(ref);
        const hederaCred = await root.loadHederaCredentials(ref);

        const uuid: string = await ref.components.generateUUID();
        const amount = PolicyUtils.aggregate(ref.options.rule, documents);
        const [tokenValue, tokenAmount] = PolicyUtils.tokenAmount(token, amount);
        const wipeVC = await this.createWipeVC(didDocument, token, tokenAmount, ref);
        const vcs = [].concat(documents, wipeVC);
        const vp = await this.createVP(didDocument, uuid, vcs);

        const messageServer = new MessageServer(hederaCred.hederaAccountId, hederaCred.hederaAccountKey, ref.dryRun);
        ref.log(`Topic Id: ${topicId}`);
        const topic = await PolicyUtils.getPolicyTopic(ref, topicId);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(wipeVC);
        vcMessage.setRelationships(relationships);
        vcMessage.setUser(null);
        const vcMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vcMessage);

        const vcDocument = PolicyUtils.createVC(ref, user, wipeVC);
        vcDocument.type = DataTypes.RETIREMENT;
        vcDocument.schema = `#${wipeVC.getSubjectType()}`;
        vcDocument.messageId = vcMessageResult.getId();
        vcDocument.topicId = vcMessageResult.getTopicId();
        vcDocument.relationships = relationships;

        await ref.databaseServer.saveVC(vcDocument);

        relationships.push(vcMessageResult.getId());
        const vpMessage = new VPMessage(MessageAction.CreateVP);
        vpMessage.setDocument(vp);
        vpMessage.setRelationships(relationships);
        vpMessage.setUser(null);

        const vpMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vpMessage);

        const vpDocument = PolicyUtils.createVP(ref, user, vp);
        vpDocument.type = DataTypes.RETIREMENT;
        vpDocument.messageId = vpMessageResult.getId();
        vpDocument.topicId = vpMessageResult.getTopicId();
        vpDocument.relationships = relationships;
        await ref.databaseServer.saveVP(vpDocument);

        await MintService.wipe(ref, token, tokenValue, hederaCred, targetAccountId, vpMessageResult.getId());

        return [vpDocument, tokenValue];
    }

    /**
     * Run action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        const token = await ref.databaseServer.getToken(ref.options.tokenId);
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        const docs = PolicyUtils.getArray<IPolicyDocument>(event.data.data);
        if (!docs.length && docs[0]) {
            throw new BlockActionError('Bad VC', ref.blockType, ref.uuid);
        }

        const docOwner = PolicyUtils.getDocumentOwner(ref, docs[0]);
        if (!docOwner) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        const vcs: VcDocument[] = [];
        const vsMessages: string[] = [];
        const topicIds: string[] = [];
        const field = ref.options.accountId || 'default';
        const accounts: string[] = [];
        for (const doc of docs) {
            if (doc.signature === DocumentSignature.INVALID) {
                throw new BlockActionError('Invalid VC proof', ref.blockType, ref.uuid);
            }
            const json = VcDocument.fromJsonTree(doc.document);

            vcs.push(json);
            if (doc.messageId) {
                vsMessages.push(doc.messageId);
            }
            if (doc.topicId) {
                topicIds.push(doc.topicId);
            }
            if (doc.accounts) {
                const accountId: string = doc.accounts[field];
                accounts.push(accountId);
            }
        }
        const firstAccounts = accounts[0];
        if (accounts.find(a => a !== firstAccounts)) {
            ref.error(`More than one account found! Transfer made on the first (${firstAccounts})`);
        }
        const topicId = topicIds[0];

        let targetAccountId: string;
        if (ref.options.accountId) {
            targetAccountId = firstAccounts;
        } else {
            targetAccountId = await PolicyUtils.getHederaAccountId(ref, docs[0].owner);
        }
        if (!targetAccountId) {
            throw new BlockActionError('Token recipient is not set', ref.blockType, ref.uuid);
        }

        const root = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);

        const [vp, tokenValue] = await this.retirementProcessing(
            token,
            vcs,
            vsMessages,
            topicId,
            root,
            docOwner,
            targetAccountId
        );

        ref.triggerEvents(PolicyOutputEventType.RunEvent, docOwner, event.data);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, docOwner, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, docOwner, event.data);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, docOwner, {
            tokenId: token.tokenId,
            accountId: targetAccountId,
            amount: tokenValue,
            documents: ExternalDocuments(docs),
            result: ExternalDocuments(vp),
        }));
    }
}
