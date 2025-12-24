import { ActionCallback, TokenBlock } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { DocumentSignature, SchemaEntity, SchemaHelper, DocumentCategoryType, LocationType } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { HederaDidDocument, MessageAction, MessageMemo, MessageServer, Token as TokenCollection, VcDocumentDefinition as VcDocument, VcHelper, VCMessage, VPMessage, } from '@guardian/common';

import { PolicyUtils } from '../helpers/utils.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyTokenBlock } from '../policy-engine.interface.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { MintService } from '../mint/mint-service.js';
import { RecordActionStep } from '../record-action-step.js';

/**
 * Mint block
 */
@TokenBlock({
    blockType: 'mintDocumentBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Mint',
        title: `Add 'Mint' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.AdditionalMintEvent,
            PolicyInputEventType.RetryMintEvent,
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.tokenId', alias: 'token', type: 'Token' },
        { path: 'options.template', alias: 'template', type: 'TokenTemplate' }
    ]
})
export class MintBlock {
    /**
     * Get Token
     * @param ref
     * @param docs
     * @private
     */
    private async getToken(ref: AnyBlockType, docs: IPolicyDocument[]): Promise<TokenCollection> {
        let token: TokenCollection;
        if (ref.options.useTemplate) {
            if (docs[0].tokens) {
                const tokenId = docs[0].tokens[ref.options.template];
                token = await ref.databaseServer.getToken(tokenId, ref.dryRun);
            }
        } else {
            token = await ref.databaseServer.getToken(ref.options.tokenId);
        }
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }
        return token;
    }

    /**
     * Get Objects
     * @param ref
     * @param docs
     * @private
     */
    private getObjects(ref: AnyBlockType, docs: IPolicyDocument[]): any {
        const vcs: VcDocument[] = [];
        const messages: string[] = [];
        const topics: string[] = [];
        const field = ref.options.accountId || 'default';
        const accounts: string[] = [];
        for (const doc of docs) {
            if (doc.signature === DocumentSignature.INVALID) {
                throw new BlockActionError('Invalid VC proof', ref.blockType, ref.uuid);
            }
            const json = VcDocument.fromJsonTree(doc.document);
            vcs.push(json);
            if (doc.messageId) {
                messages.push(doc.messageId);
            }
            if (doc.topicId) {
                topics.push(doc.topicId);
            }
            if (doc.accounts) {
                const accountId: string = doc.accounts[field];
                accounts.push(accountId);
            }
        }
        return { vcs, messages, topics, accounts }
    }

    /**
     * Get Additional Messages
     * @param additionalDocs
     * @private
     */
    private getAdditionalMessages(additionalDocs: IPolicyDocument[]): string[] {
        const additionalMessages: string[] = [];
        if (additionalDocs) {
            for (const doc of additionalDocs) {
                if (doc.messageId) {
                    additionalMessages.push(doc.messageId);
                }
            }
        }
        return additionalMessages;
    }

    /**
     * Get Account
     * @param ref
     * @param docs
     * @param accounts
     * @param userId
     * @private
     */
    private getAccount(
        ref: AnyBlockType,
        docs: IPolicyDocument[],
        accounts: string[],
        relayerAccount: string,
        userId: string | null
    ): string {
        let targetAccount: string;
        if (ref.options.accountType !== 'custom-value') {
            const firstAccounts = accounts[0];
            if (accounts.find(a => a !== firstAccounts)) {
                ref.error(`More than one account found! Transfer made on the first (${firstAccounts})`);
            }
            if (ref.options.accountId) {
                targetAccount = firstAccounts;
            } else {
                targetAccount = relayerAccount;
            }
            if (!targetAccount) {
                throw new BlockActionError('Token recipient is not set', ref.blockType, ref.uuid);
            }
        } else {
            targetAccount = ref.options.accountIdValue;
        }
        return targetAccount;
    }

    /**
     * Create mint VC
     * @param root
     * @param token
     * @param data
     * @param ref
     * @private
     */
    private async createMintVC(
        didDocument: HederaDidDocument,
        token: any,
        data: string,
        ref: AnyBlockType,
        actionStatusId: string
    ): Promise<VcDocument> {
        const vcHelper = new VcHelper();
        const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.MINT_TOKEN);
        const amount = data as string;
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            tokenId: token.tokenId,
            amount: amount.toString()
        }
        const uuid = await ref.components.generateUUID(actionStatusId);
        const mintVC = await vcHelper.createVerifiableCredential(
            vcSubject,
            didDocument,
            null,
            { uuid }
        );
        return mintVC;
    }

    /**
     * Create report VC
     * @param ref
     * @param policyOwnerCred
     * @param user
     * @param documents
     * @param messages
     * @param additionalMessages
     * @param userId
     * @private
     */
    private async createReportVC(
        ref: IPolicyTokenBlock,
        policyOwnerCred: UserCredentials,
        user: PolicyUser,
        documents: VcDocument[],
        messages: string[],
        additionalMessages: string[],
        userId: string | null,
        actionStatusId: string
    ): Promise<VcDocument[]> {
        const addons = ref.getAddons();
        const result: VcDocument[] = [];
        if (
            (addons && addons.length) ||
            (additionalMessages && additionalMessages.length)
        ) {
            const policyOwnerDid = await policyOwnerCred.loadDidDocument(ref, userId);
            const vcHelper = new VcHelper();
            const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.TOKEN_DATA_SOURCE);
            const vcSubject: any = { ...SchemaHelper.getContext(policySchema) };
            if (messages) {
                vcSubject.dataSource = messages.slice();
            }
            if (additionalMessages) {
                vcSubject.relationships = additionalMessages.slice();
            }
            const uuid = await ref.components.generateUUID(actionStatusId);
            const vc = await vcHelper.createVerifiableCredential(
                vcSubject,
                policyOwnerDid,
                null,
                { uuid }
            );
            result.push(vc);
        }
        if (addons && addons.length) {
            for (const addon of addons) {
                const impact = await addon.run(documents, policyOwnerCred, user);
                result.push(impact);
            }
        }
        return result;
    }

    /**
     * Create VP
     * @param root
     * @param uuid
     * @param vcs
     * @private
     */
    private async createVP(
        didDocument: HederaDidDocument,
        uuid: string,
        vcs: VcDocument[]
    ) {
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
     * Mint processing
     * @param token
     * @param topicId
     * @param user
     * @param accountId
     * @param documents
     * @param messages
     * @param additionalMessages
     * @param userId
     * @private
     */
    private async mintProcessing(
        token: TokenCollection,
        topicId: string,
        user: PolicyUser,
        relayerAccount: string,
        targetAccount: string,
        documents: VcDocument[],
        messages: string[],
        additionalMessages: string[],
        userId: string | null,
        actionStatus: RecordActionStep
    ): Promise<[IPolicyDocument, number]> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyTokenBlock>(this);

        const tags = await PolicyUtils.getBlockTags(ref);

        const uuid: string = await ref.components.generateUUID();
        const amount = PolicyUtils.aggregate(ref.options.rule, documents);
        if (Number.isNaN(amount) || !Number.isFinite(amount) || amount < 0) {
            throw new BlockActionError(`Invalid token value: ${amount}`, ref.blockType, ref.uuid);
        }
        const [tokenValue, tokenAmount] = PolicyUtils.tokenAmount(token, amount);

        const policyOwnerCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
        const policyOwnerDid = await policyOwnerCred.loadDidDocument(ref, userId);

        const mintVC = await this.createMintVC(policyOwnerDid, token, tokenAmount, ref, actionStatus?.id);
        const reportVC = await this.createReportVC(ref, policyOwnerCred, user, documents, messages, additionalMessages, userId, actionStatus?.id);

        let vp: any;
        if (reportVC && reportVC.length) {
            const vcs = [...reportVC, mintVC];
            vp = await this.createVP(policyOwnerDid, uuid, vcs);
        } else {
            const vcs = [...documents, mintVC];
            vp = await this.createVP(policyOwnerDid, uuid, vcs);
        }
        vp.addTags(tags);

        ref.log(`Topic Id: ${topicId}`);

        const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(ref, userId);
        const policyOwnerSignOptions = await policyOwnerCred.loadSignOptions(ref, userId);
        const messageServer = new MessageServer({
            operatorId: policyOwnerHederaCred.hederaAccountId,
            operatorKey: policyOwnerHederaCred.hederaAccountKey,
            encryptKey: policyOwnerHederaCred.hederaAccountKey,
            signOptions: policyOwnerSignOptions,
            dryRun: ref.dryRun
        });

        // #region Save Mint VC
        const topic = await PolicyUtils.getPolicyTopic(ref, topicId, userId);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(mintVC);
        vcMessage.setRelationships(messages);
        vcMessage.setTag(mintVC);
        vcMessage.setEntityType(mintVC);
        vcMessage.setOption(null, ref);
        vcMessage.setUser(null);
        const vcMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vcMessage, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });
        const mintVcDocument = PolicyUtils.createVC(ref, user, mintVC, actionStatus?.id);

        PolicyUtils.setDocumentTags(mintVcDocument, tags);

        mintVcDocument.type = DocumentCategoryType.MINT;
        mintVcDocument.schema = `#${mintVC.getSubjectType()}`;
        mintVcDocument.messageId = vcMessageResult.getId();
        mintVcDocument.topicId = vcMessageResult.getTopicId();
        mintVcDocument.relationships = messages;
        mintVcDocument.relayerAccount = relayerAccount;
        mintVcDocument.documentFields = Array.from(
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId)
        );
        await ref.databaseServer.saveVC(mintVcDocument);
        // #endregion

        messages.push(vcMessageResult.getId());

        // #region Save Mint VP
        const vpMessage = new VPMessage(MessageAction.CreateVP);
        vpMessage.setDocument(vp);
        vpMessage.setRelationships(messages);
        vpMessage.setTag(vp);
        vpMessage.setEntityType(vp);
        vpMessage.setOption(null, vp);
        vpMessage.setUser(null);

        const vpMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vpMessage, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });
        const vpMessageId = vpMessageResult.getId();
        const vpDocument = PolicyUtils.createVP(ref, user, vp, actionStatus?.id);
        PolicyUtils.setDocumentTags(vpDocument, tags);
        vpDocument.type = DocumentCategoryType.MINT;
        vpDocument.messageId = vpMessageId;
        vpDocument.topicId = vpMessageResult.getTopicId();
        vpDocument.documentFields = Array.from(PolicyComponentsUtils.getDocumentCacheFields(ref.policyId));
        vpDocument.relationships = messages;
        vpDocument.relayerAccount = relayerAccount;
        const savedVp = await ref.databaseServer.saveVP(vpDocument);
        // #endregion

        const transactionMemo = `${vpMessageId} ${MessageMemo.parseMemo(true, ref.options.memo, savedVp)}`.trimEnd();
        await MintService.mint({
            ref,
            token,
            tokenValue,
            documentOwner: user,
            policyOwnerHederaCred,
            targetAccount,
            vpMessageId,
            transactionMemo,
            documents,
            policyOwnerSignOptions,
            relayerAccount,
            userId
        });

        return [savedVp, tokenValue];
    }

    /**
     * Run action
     * @event PolicyEventType.AdditionalMintEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.AdditionalMintEvent
    })
    async additionalMintEvent(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyTokenBlock>(this);

        const docs = PolicyUtils.getArray<IPolicyDocument>(event.data.data);
        if (!docs.length && docs[0]) {
            throw new BlockActionError('Bad VC', ref.blockType, ref.uuid);
        }

        const docOwner = await PolicyUtils.getDocumentOwner(ref, docs[0], event?.user?.userId);
        if (!docOwner) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        const additionalDocs = PolicyUtils.getArray<IPolicyDocument>(event.data.result);

        await this.run(ref, event, docOwner, docs, additionalDocs, event?.user?.userId);
    }

    /**
     * Retry action
     * @event PolicyEventType.RetryMintEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.RetryMintEvent
    })
    @CatchErrors()
    async retryMint(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyTokenBlock>(this);

        if (!event.data?.data) {
            throw new Error('Invalid data');
        }
        if (Array.isArray(event.data.data)) {
            for (const document of event.data.data) {
                await MintService.retry(document.messageId, event.user.did, ref.policyOwner, ref, event?.user?.userId);
            }
        } else {
            await MintService.retry(event.data.data.messageId, event.user.did, ref.policyOwner, ref, event?.user?.userId);
        }

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);
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
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyTokenBlock>(this);

        const docs = PolicyUtils.getArray<IPolicyDocument>(event.data.data);
        if (!docs.length && docs[0]) {
            throw new BlockActionError('Bad VC', ref.blockType, ref.uuid);
        }

        const docOwner = await PolicyUtils.getDocumentOwner(ref, docs[0], event?.user?.userId);
        if (!docOwner) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        await this.run(ref, event, docOwner, docs, null, event?.user?.userId);
    }

    /**
     * Run action
     * @param {IPolicyTokenBlock} ref
     * @param {IPolicyEvent} event
     * @param {IPolicyDocument[]} docs
     * @param {IPolicyDocument[]} additionalDocs
     */
    private async run(
        ref: IPolicyTokenBlock,
        event: IPolicyEvent<IPolicyEventState>,
        user: PolicyUser,
        docs: IPolicyDocument[],
        additionalDocs: IPolicyDocument[],
        userId: string | null
    ) {
        const token = await this.getToken(ref, docs);
        const { vcs, messages, topics, accounts } = this.getObjects(ref, docs);
        const additionalMessages = this.getAdditionalMessages(additionalDocs);
        const topicId = topics[0];

        const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, docs[0], userId);
        const targetAccount = this.getAccount(ref, docs, accounts, relayerAccount, userId);

        const [vp, amount] = await this.mintProcessing(
            token,
            topicId,
            user,
            relayerAccount,
            targetAccount,
            vcs,
            messages,
            additionalMessages,
            userId,
            event.actionStatus
        );

        const state: IPolicyEventState = event.data;
        state.result = vp;
        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state, event.actionStatus);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            tokenId: token.tokenId,
            accountId: relayerAccount,
            amount,
            documents: ExternalDocuments(docs),
            result: ExternalDocuments(vp),
        }));
        ref.backup();
    }
}
