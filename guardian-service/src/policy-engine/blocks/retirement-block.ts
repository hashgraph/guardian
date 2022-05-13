import { BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, SchemaEntity, SchemaHelper } from 'interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocument, VpDocument, HederaUtils, HederaSDKHelper, MessageServer, VCMessage, MessageAction, VPMessage } from '@hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { Token as TokenCollection } from '@entity/token';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyEventType } from '@policy-engine/interfaces';

/**
 * Retirement block
 */
@BasicBlock({
    blockType: 'retirementDocumentBlock',
    commonBlock: true
})
export class RetirementBlock {
    @Inject()
    private users: Users;

    private async createWipeVC(root: any, token: any, data: any): Promise<VcDocument> {
        const vcHelper = new VcHelper();
        const policySchema = await getMongoRepository(SchemaCollection).findOne({
            entity: SchemaEntity.WIPE_TOKEN
        });
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            tokenId: token.tokenId,
            amount: data.toString()
        }
        const wipeVC = await vcHelper.createVC(
            root.did,
            root.hederaAccountKey,
            vcSubject
        );
        return wipeVC;
    }

    private async createVP(root: any, uuid: string, vcs: VcDocument[]) {
        const vcHelper = new VcHelper();
        const vp = await vcHelper.createVP(
            root.did,
            root.hederaAccountKey,
            vcs,
            uuid
        );
        return vp;
    }

    private async retirementProcessing(
        token: TokenCollection,
        document: VcDocument[],
        vsMessages: string[],
        topicId: string,
        rule: string,
        root: any,
        user: IAuthUser,
        ref: AnyBlockType
    ): Promise<any> {
        const uuid = HederaUtils.randomUUID();
        const amount = PolicyUtils.aggregate(rule, document);
        const [tokenValue, tokenAmount] = PolicyUtils.tokenAmount(token, amount);
        const wipeVC = await this.createWipeVC(root, token, tokenAmount);
        const vcs = [].concat(document, wipeVC);
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
        vcMessage.setDocument(wipeVC);
        const vcMessageResult = await messageServer
            .setTopicObject(topic)
            .sendMessage(vcMessage);
        await PolicyUtils.updateVCRecord({
            hash: wipeVC.toCredentialHash(),
            owner: user.did,
            document: wipeVC.toJsonTree(),
            type: DataTypes.RETIREMENT,
            policyId: ref.policyId,
            tag: ref.tag,
            schema: `#${wipeVC.getSubjectType()}`,
            messageId: vcMessageResult.getId(),
            topicId: vcMessageResult.getTopicId(),
        } as any);

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
            type: DataTypes.RETIREMENT,
            policyId: ref.policyId,
            tag: ref.tag,
            messageId: vpMessageResult.getId(),
            topicId: vpMessageResult.getTopicId(),
        } as any);

        await PolicyUtils.wipe(token, tokenValue, root, user, vpMessageResult.getId());

        return vp;
    }

    /**
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
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
        for (let i = 0; i < docs.length; i++) {
            const element = docs[i];
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

        try {
            const root = await this.users.getHederaAccount(ref.policyOwner);
            const doc = await this.retirementProcessing(token, vcs, vsMessages, topicId, rule, root, curUser, ref);

            ref.triggerEvents(PolicyEventType.Run, curUser, event.data);
            ref.triggerEvents(PolicyEventType.Refresh, curUser, null);
        } catch (e) {
            throw e;
        }
    }

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
