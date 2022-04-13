import { BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, SchemaEntity, SchemaHelper } from 'interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocument, VpDocument, HederaUtils, HederaSDKHelper, VCMessage, MessageAction, MessageServer, VPMessage } from '@hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { Token as TokenCollection } from '@entity/token';
import { DataTypes, PolicyUtils } from '@policy-engine/helpers/utils';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';

/**
 * Mint block
 */
@BasicBlock({
    blockType: 'mintDocumentBlock',
    commonBlock: true
})
export class MintBlock {
    @Inject()
    private users: Users;

    private async createMintVC(root: any, token: any, data: any): Promise<VcDocument> {
        const vcHelper = new VcHelper();

        let vcSubject: any;
        if (token.tokenType == 'non-fungible') {
            const policySchema = await getMongoRepository(SchemaCollection).findOne({
                entity: SchemaEntity.MINT_NFTOKEN
            });
            const serials = data as number[];
            vcSubject = {
                ...SchemaHelper.getContext(policySchema),
                date: (new Date()).toISOString(),
                tokenId: token.tokenId,
                serials: serials
            }
        } else {
            const policySchema = await getMongoRepository(SchemaCollection).findOne({
                entity: SchemaEntity.MINT_TOKEN
            });
            const amount = data as string;
            vcSubject = {
                ...SchemaHelper.getContext(policySchema),
                date: (new Date()).toISOString(),
                tokenId: token.tokenId,
                amount: amount.toString()
            }
        }
        const mintVC = await vcHelper.createVC(
            root.did,
            root.hederaAccountKey,
            vcSubject
        );
        return mintVC;
    }

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

    private async mintProcessing(
        token: TokenCollection,
        document: VcDocument[],
        rule: string,
        root: any,
        user: IAuthUser,
        ref: AnyBlockType
    ): Promise<any> {
        const uuid = HederaUtils.randomUUID();
        const amount = PolicyUtils.aggregate(rule, document);
        const vcDate = await PolicyUtils.mint(token, amount, root, user, uuid);
        const mintVC = await this.createMintVC(root, token, vcDate);
        const vcs = [].concat(document, mintVC);
        const vp = await this.createVP(root, uuid, vcs);

        await PolicyUtils.updateVCRecord({
            hash: mintVC.toCredentialHash(),
            owner: user.did,
            document: mintVC.toJsonTree(),
            type: DataTypes.MINT,
            policyId: ref.policyId,
            tag: ref.tag,
            schema: `#${mintVC.getSubjectType()}`
        } as any);
        
        const topic = await PolicyUtils.getTopic('root', root, user, ref);
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);

        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(mintVC);
        await messageServer.setTopicObject(topic).sendMessage(vcMessage);

        await PolicyUtils.saveVP(vp, user.did, DataTypes.MINT, ref);
        const vpMessage = new VPMessage(MessageAction.CreateVP);
        vpMessage.setDocument(vp);
        await messageServer.setTopicObject(topic).sendMessage(vpMessage);

        return vp;
    }

    @CatchErrors()
    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const { tokenId, rule } = ref.options;
        const token = await getMongoRepository(TokenCollection).findOne({ tokenId });
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        const docs = PolicyUtils.getArray<any>(state.data);
        if (!docs.length && docs[0]) {
            throw new BlockActionError('Bad VC', ref.blockType, ref.uuid);
        }

        const vcs: VcDocument[] = [];
        for (let i = 0; i < docs.length; i++) {
            const element = docs[i];
            if (element.signature === DocumentSignature.INVALID) {
                throw new BlockActionError('Invalid VC proof', ref.blockType, ref.uuid);
            }
            vcs.push(VcDocument.fromJsonTree(element.document));
        }

        const curUser = await this.users.getUserById(docs[0].owner);
        if (!curUser) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        try {
            const root = await this.users.getHederaAccount(ref.policyOwner);
            const doc = await this.mintProcessing(token, vcs, rule, root, curUser, ref);
            await ref.runNext(curUser, state);
            PolicyComponentsUtils.CallDependencyCallbacks(ref.tag, ref.policyId, curUser);
            PolicyComponentsUtils.CallParentContainerCallback(ref, curUser);
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