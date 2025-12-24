import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { DocumentCategoryType, DocumentSignature, LocationType, SchemaEntity, SchemaHelper, TokenType } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { Token as TokenCollection, VcHelper, VcDocumentDefinition as VcDocument, MessageServer, VCMessage, MessageAction, VPMessage, HederaDidDocument } from '@guardian/common';
import { PolicyUtils } from '../helpers/utils.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { MintService } from '../mint/mint-service.js';
import { RecordActionStep } from '../record-action-step.js';

/**
 * Retirement block
 */
@BasicBlock({
    blockType: 'retirementDocumentBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
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
        { path: 'options.tokenId', alias: 'token', type: 'Token' },
        { path: 'options.serialNumbersExpression', alias: 'serialNumbersExpression', type: 'String' },
        { path: 'options.template', alias: 'template', type: 'TokenTemplate' }
    ]
})
export class RetirementBlock {
    /**
     * Create wipe VC
     * @param didDocument
     * @param token
     * @param data
     * @param ref
     * @param serialNumbers
     * @private
     */
    private async createWipeVC(
        didDocument: HederaDidDocument,
        token: any,
        data: any,
        ref: AnyBlockType,
        serialNumbers?: number[],
        actionStatusId?: string,
    ): Promise<VcDocument> {
        const vcHelper = new VcHelper();
        const policySchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.WIPE_TOKEN);
        const amount = data as string;
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            tokenId: token.tokenId,
            amount: amount.toString(),
            ...(serialNumbers && { serialNumbers: serialNumbers.join(',') })
        }
        const uuid = await ref.components.generateUUID(actionStatusId);
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
        policyOwner: UserCredentials,
        user: PolicyUser,
        targetAccount: string,
        relayerAccount: string,
        userId: string | null,
        actionStatus: RecordActionStep
    ): Promise<[IPolicyDocument, number]> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        const tags = await PolicyUtils.getBlockTags(ref);

        const policyOwnerDidDocument = await policyOwner.loadDidDocument(ref, userId);
        const policyOwnerHederaCred = await policyOwner.loadHederaCredentials(ref, userId);
        const policyOwnerSignOptions = await policyOwner.loadSignOptions(ref, userId);

        const uuid: string = await ref.components.generateUUID(actionStatus?.id);

        let serialNumbers: number[] = []
        let tokenValue: number = 0;
        let tokenAmount: string = '0';
        if (token.tokenType === TokenType.NON_FUNGIBLE) {
            const exprOpt = ref.options.serialNumbersExpression;
            if (!exprOpt || !String(exprOpt).trim()) {
                throw new Error('For NON_FUNGIBLE tokens, Serial numbers is required');
            }
            const wipeTokens = String(exprOpt).split(',').map(t => t.trim()).filter(Boolean);
            const out = new Set<number>();

            for (const tok of wipeTokens) {
                const dash = tok.indexOf('-');
                if (dash > 0) {
                    const leftRaw = tok.slice(0, dash).trim();
                    const rightRaw = tok.slice(dash + 1).trim();

                    const startRule = PolicyUtils.aggregate(String(leftRaw), documents);
                    const endRule = PolicyUtils.aggregate(String(rightRaw), documents);

                    if (!Number.isInteger(startRule) || !Number.isInteger(endRule)) {
                        throw new Error(`Serial numbers must be integers.`);
                    }
                    if (startRule < 1 || endRule < 1) {
                        throw new Error('Serial numbers must be greater than or equal to 1');
                    }
                    if (startRule > endRule) {
                        throw new Error(`End serial number must be greater than or equal to start serial number.`);
                    }
                    for (const n of PolicyUtils.aggregateSerialRange(startRule, endRule)) {
                        out.add(n)
                    };
                } else {
                    const valRule = PolicyUtils.aggregate(
                        String(tok),
                        documents
                    );
                    if (!Number.isInteger(valRule)) {
                        throw new Error(
                            `Serial numbers must be integers.`
                        );
                    }
                    if (valRule < 1) {
                        throw new Error(
                            'Serial numbers must be greater than or equal to 1.'
                        );
                    }
                    out.add(valRule);
                }
            }
            serialNumbers = Array.from(out).sort((a, b) => a - b);
            if (serialNumbers.length === 0) {
                throw new Error('No valid Serial Numbers found');
            }
        }
        else if (token.tokenType === TokenType.FUNGIBLE) {
            const ruleOpt = ref.options.rule
            const hasRule =
                ruleOpt !== null && ruleOpt !== undefined &&
                (typeof ruleOpt !== 'string' || ruleOpt.trim() !== '');
            if (!hasRule) {
                throw new Error('For FUNGIBLE tokens, Rule is required');
            }
            const amount = PolicyUtils.aggregate(ref.options.rule, documents);
            [tokenValue, tokenAmount] = PolicyUtils.tokenAmount(token, amount);
        }

        const wipeVC = await this.createWipeVC(policyOwnerDidDocument, token, tokenAmount, ref, serialNumbers, actionStatus?.id);
        const vcs = [].concat(documents, wipeVC);
        const vp = await this.createVP(policyOwnerDidDocument, uuid, vcs);

        wipeVC.addTags(tags);
        vp.addTags(tags);

        const messageServer = new MessageServer({
            operatorId: policyOwnerHederaCred.hederaAccountId,
            operatorKey: policyOwnerHederaCred.hederaAccountKey,
            encryptKey: policyOwnerHederaCred.hederaAccountKey,
            signOptions: policyOwnerSignOptions,
            dryRun: ref.dryRun
        });
        ref.log(`Topic Id: ${topicId}`);
        const topic = await PolicyUtils.getPolicyTopic(ref, topicId, userId);
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(wipeVC);
        vcMessage.setRelationships(relationships);
        vcMessage.setTag(ref);
        vcMessage.setEntityType(ref);
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

        const vcDocument = PolicyUtils.createVC(ref, user, wipeVC, actionStatus?.id);
        vcDocument.type = DocumentCategoryType.RETIREMENT;
        vcDocument.schema = `#${wipeVC.getSubjectType()}`;
        vcDocument.messageId = vcMessageResult.getId();
        vcDocument.topicId = vcMessageResult.getTopicId();
        vcDocument.relationships = relationships;
        vcDocument.relayerAccount = relayerAccount;
        PolicyUtils.setDocumentTags(vcDocument, tags);

        await ref.databaseServer.saveVC(vcDocument);

        relationships.push(vcMessageResult.getId());
        const vpMessage = new VPMessage(MessageAction.CreateVP);
        vpMessage.setDocument(vp);
        vpMessage.setRelationships(relationships);
        vpMessage.setTag(ref);
        vpMessage.setEntityType(ref);
        vpMessage.setOption(null, ref);
        vpMessage.setUser(null);

        const vpMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vpMessage, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });

        const vpDocument = PolicyUtils.createVP(ref, user, vp, actionStatus?.id);
        PolicyUtils.setDocumentTags(vpDocument, tags);
        vpDocument.type = DocumentCategoryType.RETIREMENT;
        vpDocument.messageId = vpMessageResult.getId();
        vpDocument.topicId = vpMessageResult.getTopicId();
        vpDocument.relationships = relationships;
        vpDocument.relayerAccount = relayerAccount;
        PolicyUtils.setDocumentTags(vpDocument, tags);

        await ref.databaseServer.saveVP(vpDocument);

        await MintService.wipe({
            ref,
            token,
            tokenValue,
            root: policyOwnerHederaCred,
            targetAccount,
            relayerAccount,
            uuid: vpMessageResult.getId(),
            userId,
            serialNumbers
        });

        return [vpDocument, tokenValue];
    }

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

        const docs = PolicyUtils.getArray<IPolicyDocument>(event.data.data);
        if (!docs.length && docs[0]) {
            throw new BlockActionError('Bad VC', ref.blockType, ref.uuid);
        }

        const token = await this.getToken(ref, docs);
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        const docOwner = await PolicyUtils.getDocumentOwner(ref, docs[0], event?.user?.userId);
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

        const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, docs[0], event?.user?.userId);
        let targetAccount: string;
        if (ref.options.accountId) {
            targetAccount = firstAccounts;
        } else {
            targetAccount = relayerAccount;
        }

        if (!targetAccount) {
            throw new BlockActionError('Token recipient is not set', ref.blockType, ref.uuid);
        }

        const policyOwner = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, event?.user?.userId);

        const [vp, tokenValue] = await this.retirementProcessing(
            token,
            vcs,
            vsMessages,
            topicId,
            policyOwner,
            docOwner,
            targetAccount,
            relayerAccount,
            event?.user?.userId,
            event.actionStatus
        );

        ref.triggerEvents(PolicyOutputEventType.RunEvent, docOwner, event.data, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, docOwner, null, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, docOwner, event.data, event.actionStatus);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, docOwner, {
            tokenId: token.tokenId,
            accountId: relayerAccount,
            amount: tokenValue,
            documents: ExternalDocuments(docs),
            result: ExternalDocuments(vp),
        }));

        ref.backup();
    }
}
