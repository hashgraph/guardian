import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, GenerateUUIDv4, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocument, VCMessage, MessageAction, MessageServer, VPMessage, VpDocument, MessageMemo } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { Token as TokenCollection } from '@entity/token';
import { DataTypes, IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * Mint block
 */
@BasicBlock({
    blockType: 'mintDocumentBlock',
    commonBlock: true,
    publishExternalEvent: true,
    about: {
        label: 'Mint',
        title: `Add 'Mint' Block`,
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
    }
})
export class MintBlock {
    /**
     * Create mint VC
     * @param root
     * @param token
     * @param data
     * @param ref
     * @private
     */
    private async createMintVC(
        root: IHederaAccount, token: any, data: string, ref: AnyBlockType
    ): Promise<VcDocument> {
        const vcHelper = new VcHelper();
        const policySchema = await ref.databaseServer.getSchemaByType(ref.topicId, SchemaEntity.MINT_TOKEN);
        const amount = data as string;
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            tokenId: token.tokenId,
            amount: amount.toString()
        }
        const mintVC = await vcHelper.createVC(root.did, root.hederaAccountKey, vcSubject);
        return mintVC;
    }

    /**
     * Create VP
     * @param root
     * @param uuid
     * @param vcs
     * @private
     */
    private async createVP(root: IHederaAccount, uuid: string, vcs: VcDocument[]) {
        const vcHelper = new VcHelper();
        const vp = await vcHelper.createVP(
            root.did,
            root.hederaAccountKey,
            vcs,
            uuid
        );
        return vp;
    }

    /**
     * Mint processing
     * @param token
     * @param documents
     * @param relationships
     * @param topicId
     * @param root
     * @param user
     * @private
     */
    private async mintProcessing(
        token: TokenCollection,
        documents: VcDocument[],
        relationships: string[],
        topicId: string,
        root: IHederaAccount,
        user: IPolicyUser,
        targetAccountId: string
    ): Promise<VpDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        const uuid = GenerateUUIDv4();
        const amount = PolicyUtils.aggregate(ref.options.rule, documents);

        if (Number.isNaN(amount) || !Number.isFinite(amount)) {
            throw new BlockActionError(`Invalid token value: ${amount}`, ref.blockType, ref.uuid);
        }

        const [tokenValue, tokenAmount] = PolicyUtils.tokenAmount(token, amount);
        const mintVC = await this.createMintVC(root, token, tokenAmount, ref);
        const vcs = [].concat(documents, mintVC);
        const vp = await this.createVP(root, uuid, vcs);

        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
        ref.log(`Topic Id: ${topicId}`);
        const topic = await PolicyUtils.getTopicById(ref, topicId);
        ref.log(`Topic Id: ${topic?.id}`);

        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(mintVC);
        vcMessage.setRelationships(relationships);
        const vcMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vcMessage);

        const vcDocument = PolicyUtils.createVC(ref, user, mintVC);
        vcDocument.type = DataTypes.MINT;
        vcDocument.schema = `#${mintVC.getSubjectType()}`;
        vcDocument.messageId = vcMessageResult.getId();
        vcDocument.topicId = vcMessageResult.getTopicId();
        vcDocument.relationships = relationships;

        await ref.databaseServer.saveVC(vcDocument);

        relationships.push(vcMessageResult.getId());
        const vpMessage = new VPMessage(MessageAction.CreateVP);
        vpMessage.setDocument(vp);
        vpMessage.setRelationships(relationships);

        const vpMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vpMessage);
        const vpMessageId = vpMessageResult.getId();
        const vpDocument = PolicyUtils.createVP(ref, user, vp);
        vpDocument.type = DataTypes.MINT;
        vpDocument.messageId = vpMessageId;
        vpDocument.topicId = vpMessageResult.getTopicId();

        const savedVp = await ref.databaseServer.saveVP(vpDocument);

        await PolicyUtils.mint(
            ref,
            token,
            tokenValue,
            root,
            targetAccountId,
            vpMessageId,
            vpMessageId
                .concat(' ', MessageMemo.parseMemo(true, ref.options.memo, savedVp))
                .trimEnd()
        );

        return vp;
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

        const docOwner = PolicyUtils.getDocumentOwner(ref, docs[0]);
        if (!docOwner) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        let token;
        if (ref.options.useTemplate) {
            if (docs[0].tokens) {
                const tokenId = docs[0].tokens[ref.options.template];
                token = await ref.databaseServer.getTokenById(tokenId, ref.dryRun);
            }
        } else {
            token = await ref.databaseServer.getTokenById(ref.options.tokenId);
        }

        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
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

        const topicId = topicIds[0];
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
                throw new BlockActionError('Token recipient not set', ref.blockType, ref.uuid);
            }
        } else {
            targetAccountId = ref.options.accountIdValue;
        }

        const root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);

        await this.mintProcessing(
          token,
          vcs,
          vsMessages,
          topicId,
          root,
          docOwner,
          targetAccountId
        );
        ref.triggerEvents(PolicyOutputEventType.RunEvent, docOwner, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, docOwner, event.data);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, null));
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.useTemplate) {
                if (!ref.options.template) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "template" does not set');
                }
                const policyTokens = ref.policyInstance.policyTokens || [];
                const tokenConfig = policyTokens.find(e => e.templateTokenTag === ref.options.template);
                if (!tokenConfig) {
                    resultsContainer.addBlockError(ref.uuid, `Token "${ref.options.template}" does not exist`);
                }
            } else {
                if (!ref.options.tokenId) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" does not set');
                } else if (typeof ref.options.tokenId !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" must be a string');
                } else if (!(await ref.databaseServer.getTokenById(ref.options.tokenId))) {
                    resultsContainer.addBlockError(ref.uuid, `Token with id ${ref.options.tokenId} does not exist`);
                }
            }

            if (!ref.options.rule) {
                resultsContainer.addBlockError(ref.uuid, 'Option "rule" does not set');
            } else if (typeof ref.options.rule !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "rule" must be a string');
            }

            const accountType = ['default', 'custom', 'custom-value'];
            if (accountType.indexOf(ref.options.accountType) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountType" must be one of ' + accountType.join(','));
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountId" does not set');
            }
            if (ref.options.accountType === 'custom-value' && !/^\d+\.\d+\.\d+$/.test(ref.options.accountIdValue)) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountIdValue" has invalid hedera account value');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
