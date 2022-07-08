import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, GenerateUUIDv4, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocument, VCMessage, MessageAction, MessageServer, VPMessage } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { getMongoRepository } from 'typeorm';
import { Token as TokenCollection } from '@entity/token';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IAuthUser } from '@guardian/common';

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
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class MintBlock {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Create mint VC
     * @param root
     * @param token
     * @param data
     * @param ref
     * @private
     */
    private async createMintVC(root: any, token: any, data: any, ref: AnyBlockType): Promise<VcDocument> {
        const vcHelper = new VcHelper();
        const policySchema = await PolicyUtils.getSchema(ref.topicId, SchemaEntity.MINT_TOKEN);
        const amount = data as string;
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            tokenId: token.tokenId,
            amount: amount.toString()
        }
        const mintVC = await vcHelper.createVC(
            root.did,
            root.hederaAccountKey,
            vcSubject
        );
        return mintVC;
    }

    /**
     * Create VP
     * @param root
     * @param uuid
     * @param vcs
     * @private
     */
    private async createVP(root, uuid: string, vcs: VcDocument[]) {
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
     * @param document
     * @param vsMessages
     * @param topicId
     * @param rule
     * @param root
     * @param user
     * @param ref
     * @private
     */
    private async mintProcessing(
        token: TokenCollection,
        document: VcDocument[],
        vsMessages: string[],
        topicId: string,
        rule: string,
        root: any,
        user: IAuthUser,
        ref: AnyBlockType
    ): Promise<any> {
        const uuid = GenerateUUIDv4();
        const amount = PolicyUtils.aggregate(rule, document);
        const [tokenValue, tokenAmount] = PolicyUtils.tokenAmount(token, amount);
        const mintVC = await this.createMintVC(root, token, tokenAmount, ref);
        const vcs = [].concat(document, mintVC);
        const vp = await this.createVP(root, uuid, vcs);

        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
        ref.log(`Topic Id: ${topicId}`);
        let topic: any;
        if (topicId) {
            topic = await PolicyUtils.getTopicById(topicId, ref);
        } else {
            topic = await PolicyUtils.getTopic('root', root, user, ref);
        }
        ref.log(`Topic Id: ${topic?.id}`);

        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(mintVC);
        vcMessage.setRelationships(vsMessages);
        const vcMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vcMessage);
        await PolicyUtils.updateVCRecord({
            hash: mintVC.toCredentialHash(),
            owner: user.did,
            document: mintVC.toJsonTree(),
            type: DataTypes.MINT,
            policyId: ref.policyId,
            tag: ref.tag,
            schema: `#${mintVC.getSubjectType()}`,
            messageId: vcMessageResult.getId(),
            topicId: vcMessageResult.getTopicId(),
            relationships: vsMessages
        } as any);
        vsMessages.push(vcMessageResult.getId());
        const vpMessage = new VPMessage(MessageAction.CreateVP);
        vpMessage.setDocument(vp);
        vpMessage.setRelationships(vsMessages);
        const vpMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vpMessage);
        await PolicyUtils.saveVP({
            hash: vp.toCredentialHash(),
            document: vp.toJsonTree(),
            owner: user.did,
            type: DataTypes.MINT,
            policyId: ref.policyId,
            tag: ref.tag,
            messageId: vpMessageResult.getId(),
            topicId: vpMessageResult.getTopicId(),
        } as any);

        await PolicyUtils.mint(token, tokenValue, root, user, vpMessageResult.getId());

        return vp;
    }

    /**
     * Run action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const { tokenId, rule } = ref.options;
        const token = await getMongoRepository(TokenCollection).findOne({ tokenId });
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        const docs = PolicyUtils.getArray<any>(event.data.data);
        if (!docs.length && docs[0]) {
            throw new BlockActionError('Bad VC', ref.blockType, ref.uuid);
        }

        const vcs: VcDocument[] = [];
        const vsMessages: string[] = [];
        let topicId: string;
        for (const element of docs) {
            if (element.signature === DocumentSignature.INVALID) {
                throw new BlockActionError('Invalid VC proof', ref.blockType, ref.uuid);
            }
            vcs.push(VcDocument.fromJsonTree(element.document));
            if (element.messageId) {
                vsMessages.push(element.messageId);
            }
            if (element.topicId) {
                topicId = element.topicId;
            }
        }

        const curUser = await this.users.getUserById(docs[0].owner);
        if (!curUser) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        const root = await this.users.getHederaAccount(ref.policyOwner);
        await this.mintProcessing(token, vcs, vsMessages, topicId, rule, root, curUser, ref);
        ref.triggerEvents(PolicyOutputEventType.RunEvent, curUser, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, curUser, event.data);
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!ref.options.tokenId) {
                resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" does not set');
            } else if (typeof ref.options.tokenId !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" must be a string');
            } else if (!(await getMongoRepository(TokenCollection).findOne({ tokenId: ref.options.tokenId }))) {
                resultsContainer.addBlockError(ref.uuid, `Token with id ${ref.options.tokenId} does not exist`);
            }

            if (!ref.options.rule) {
                resultsContainer.addBlockError(ref.uuid, 'Option "rule" does not set');
            } else if (typeof ref.options.rule !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "rule" must be a string');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
