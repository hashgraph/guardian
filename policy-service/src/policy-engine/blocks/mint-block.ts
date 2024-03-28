import { ActionCallback, TokenBlock } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import {
    Token as TokenCollection,
    VcDocumentDefinition as VcDocument,
    VCMessage,
    MessageAction,
    MessageServer,
    VPMessage,
    MessageMemo,
    VcHelper,
    HederaDidDocument,
} from '@guardian/common';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyTokenBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser, UserCredentials } from '@policy-engine/policy-user';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { MintService } from '@policy-engine/mint/mint-service';

/**
 * Mint block
 */
@TokenBlock({
    blockType: 'mintDocumentBlock',
    commonBlock: true,
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
     * @private
     */
    private async getAccount(ref: AnyBlockType, docs: IPolicyDocument[], accounts: string[]): Promise<string> {
        let targetAccountId: string;
        if (ref.options.accountType !== 'custom-value') {
            const firstAccounts = accounts[0];
            if (accounts.find(a => a !== firstAccounts)) {
                ref.error(`More than one account found! Transfer made on the first (${firstAccounts})`);
            }
            if (ref.options.accountId) {
                targetAccountId = firstAccounts;
            } else {
                targetAccountId = await PolicyUtils.getHederaAccountId(ref, docs[0].owner);
            }
            if (!targetAccountId) {
                throw new BlockActionError('Token recipient is not set', ref.blockType, ref.uuid);
            }
        } else {
            targetAccountId = ref.options.accountIdValue;
        }
        return targetAccountId;
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
        ref: AnyBlockType
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
        const uuid = await ref.components.generateUUID();
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
     * @param root
     * @param user
     * @param documents
     * @param messages
     * @param additionalMessages
     * @private
     */
    private async createReportVC(
        ref: IPolicyTokenBlock,
        policyOwnerCred: UserCredentials,
        user: IPolicyUser,
        documents: VcDocument[],
        messages: string[],
        additionalMessages: string[],
    ): Promise<VcDocument[]> {
        const addons = ref.getAddons();
        const result: VcDocument[] = [];
        if (
            (addons && addons.length) ||
            (additionalMessages && additionalMessages.length)
        ) {
            const policyOwnerDid = await policyOwnerCred.loadDidDocument(ref);
            const vcHelper = new VcHelper();
            const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.TOKEN_DATA_SOURCE);
            const vcSubject: any = { ...SchemaHelper.getContext(policySchema) };
            if (messages) {
                vcSubject.dataSource = messages.slice();
            }
            if (additionalMessages) {
                vcSubject.relationships = additionalMessages.slice();
            }
            const uuid = await ref.components.generateUUID();
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
     * @private
     */
    private async mintProcessing(
        token: TokenCollection,
        topicId: string,
        user: IPolicyUser,
        accountId: string,
        documents: VcDocument[],
        messages: string[],
        additionalMessages: string[],
    ): Promise<[IPolicyDocument, number]> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyTokenBlock>(this);

        const uuid: string = await ref.components.generateUUID();
        const amount = PolicyUtils.aggregate(ref.options.rule, documents);
        if (Number.isNaN(amount) || !Number.isFinite(amount)) {
            throw new BlockActionError(`Invalid token value: ${amount}`, ref.blockType, ref.uuid);
        }
        const [tokenValue, tokenAmount] = PolicyUtils.tokenAmount(token, amount);

        const policyOwnerCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
        const policyOwnerDid = await policyOwnerCred.loadDidDocument(ref);

        const mintVC = await this.createMintVC(policyOwnerDid, token, tokenAmount, ref);
        const reportVC = await this.createReportVC(ref, policyOwnerCred, user, documents, messages, additionalMessages);
        let vp: any;
        if (reportVC && reportVC.length) {
            const vcs = [...reportVC, mintVC];
            vp = await this.createVP(policyOwnerDid, uuid, vcs);
        } else {
            const vcs = [...documents, mintVC];
            vp = await this.createVP(policyOwnerDid, uuid, vcs);
        }

        ref.log(`Topic Id: ${topicId}`);

        const policyOwnerHederaCred = await policyOwnerCred.loadHederaCredentials(ref);
        const messageServer = new MessageServer(
            policyOwnerHederaCred.hederaAccountId,
            policyOwnerHederaCred.hederaAccountKey,
            ref.dryRun
        );

        // #region Save Mint VC
        const topic = await PolicyUtils.getPolicyTopic(ref, topicId);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(mintVC);
        vcMessage.setRelationships(messages);
        vcMessage.setUser(null);
        const vcMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vcMessage);
        const mintVcDocument = PolicyUtils.createVC(ref, user, mintVC);
        mintVcDocument.type = DataTypes.MINT;
        mintVcDocument.schema = `#${mintVC.getSubjectType()}`;
        mintVcDocument.messageId = vcMessageResult.getId();
        mintVcDocument.topicId = vcMessageResult.getTopicId();
        mintVcDocument.relationships = messages;
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
        vpMessage.setUser(null);
        const vpMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vpMessage);
        const vpMessageId = vpMessageResult.getId();
        const vpDocument = PolicyUtils.createVP(ref, user, vp, token.tokenId);
        vpDocument.type = DataTypes.MINT;
        vpDocument.messageId = vpMessageId;
        vpDocument.topicId = vpMessageResult.getTopicId();
        vpDocument.documentFields = Array.from(
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId)
        );
        vpDocument.relationships = messages;
        const savedVp = await ref.databaseServer.saveVP(vpDocument);
        // #endregion

        const transactionMemo = `${vpMessageId} ${MessageMemo.parseMemo(true, ref.options.memo, savedVp)}`.trimEnd();
        await MintService.mint(
            ref,
            token,
            tokenValue,
            user,
            policyOwnerHederaCred,
            accountId,
            vpMessageId,
            transactionMemo,
            documents
        );
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

        const docOwner = PolicyUtils.getDocumentOwner(ref, docs[0]);
        if (!docOwner) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        const additionalDocs = PolicyUtils.getArray<IPolicyDocument>(event.data.result);

        await this.run(ref, event, docOwner, docs, additionalDocs);
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
                await MintService.retry(document.messageId, event.user.id, ref.policyOwner, ref);
            }
        } else {
            await MintService.retry(event.data.data.messageId, event.user.id, ref.policyOwner, ref);
        }

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
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

        const docOwner = PolicyUtils.getDocumentOwner(ref, docs[0]);
        if (!docOwner) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        await this.run(ref, event, docOwner, docs);
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
        user: IPolicyUser,
        docs: IPolicyDocument[],
        additionalDocs?: IPolicyDocument[]
    ) {
        const token = await this.getToken(ref, docs);
        const { vcs, messages, topics, accounts } = this.getObjects(ref, docs);
        const additionalMessages = this.getAdditionalMessages(additionalDocs);
        const topicId = topics[0];
        const accountId = await this.getAccount(ref, docs, accounts);
        const [vp, amount] = await this.mintProcessing(token, topicId, user, accountId, vcs, messages, additionalMessages);

        const state: IPolicyEventState = event.data;
        state.result = vp;
        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            tokenId: token.tokenId,
            accountId,
            amount,
            documents: ExternalDocuments(docs),
            result: ExternalDocuments(vp),
        }));
    }
}
