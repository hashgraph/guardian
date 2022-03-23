import { BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import * as mathjs from 'mathjs';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, SchemaEntity, SchemaHelper } from 'interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocument, VpDocument, HederaUtils, HederaSDKHelper } from '@hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
import { getMongoRepository } from 'typeorm';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { VpDocument as VpDocumentCollection } from '@entity/vp-document';
import { Schema as SchemaCollection } from '@entity/schema';
import { Token as TokenCollection } from '@entity/token';
import { RootConfig as RootConfigCollection } from '@entity/root-config';

function evaluate(formula: string, scope: any) {
    return (function (formula: string, scope: any) {
        try {
            return this.evaluate(formula, scope);
        } catch (error) {
            return 'Incorrect formula';
        }
    }).call(mathjs, formula, scope);
}

enum DataTypes {
    MRV = 'mrv',
    REPORT = 'report',
    MINT = 'mint',
    RETIREMENT = 'retirement'
}

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

    private tokenId: any;
    private rule: any;

    private split(array: any[], chunk: number) {
        const res = [];
        let i: number, j: number;
        for (i = 0, j = array.length; i < j; i += chunk) {
            res.push(array.slice(i, i + chunk));
        }
        return res;
    }

    private getScope(item: VcDocument) {
        return item.getCredentialSubject().toJsonTree();
    }

    private aggregate(rule, vcs: VcDocument[]) {
        let amount = 0;
        for (let i = 0; i < vcs.length; i++) {
            const element = vcs[i];
            const scope = this.getScope(element);
            const value = parseFloat(evaluate(rule, scope));
            amount += value;
        }
        return amount;
    }

    private tokenAmount(token, amount: number): any[] {
        const decimals = parseFloat(token.decimals) || 0;
        const _decimals = Math.pow(10, decimals);
        const tokenValue = Math.round(amount * _decimals);
        const tokenAmount = (tokenValue / _decimals).toFixed(decimals);
        return [tokenValue, tokenAmount];
    }

    private async saveVC(vc: VcDocument, owner: string, ref: any): Promise<boolean> {
        try {
            const doc = getMongoRepository(VcDocumentCollection).create({
                hash: vc.toCredentialHash(),
                owner: owner,
                document: vc.toJsonTree(),
                type: DataTypes.MINT as any,
                policyId: ref.policyId,
                tag: ref.tag,
                schema: `#${vc.getCredentialSubject()[0].getType()}`
            });
            await getMongoRepository(VcDocumentCollection).save(doc);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async saveVP(vp: VpDocument, sensorDid: string, type: DataTypes, ref: any): Promise<boolean> {
        try {
            if (!vp) {
                return false;
            }
            const doc = getMongoRepository(VpDocumentCollection).create({
                hash: vp.toCredentialHash(),
                document: vp.toJsonTree(),
                owner: sensorDid,
                type: type as any,
                policyId: ref.policyId,
                tag: ref.tag
            })
            await getMongoRepository(VpDocumentCollection).save(doc);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async createMintVC(root: any, token: any, data: number | number[]): Promise<VcDocument> {
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
            const amount = data as number;
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

    private async mintProcessing(token, document, rule, root, user, ref): Promise<any> {
        const tokenId = token.tokenId;
        const supplyKey = token.supplyKey;
        const adminId = token.adminId;
        const adminKey = token.adminKey;

        const uuid = HederaUtils.randomUUID();
        const amount = this.aggregate(rule, document);
        const [tokenValue, tokenAmount] = this.tokenAmount(token, amount);

        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);

        let vcDate: any;
        console.log('Mint: Start');
        if (token.tokenType == 'non-fungible') {
            const metaData: any = HederaUtils.decode(uuid);

            const data = new Array(Math.floor(tokenValue));
            data.fill(metaData);

            const serials = [];
            const dataChunk = this.split(data, 10);
            for (let i = 0; i < dataChunk.length; i++) {
                const element = dataChunk[i];
                try {
                    const newSerials = await client.mintNFT(tokenId, supplyKey, element, uuid);
                    for (let j = 0; j < newSerials.length; j++) {
                        serials.push(newSerials[j])
                    }
                } catch (error) {
                    console.log(`Mint: Mint Error (${error.message})`);
                }
                if (i % 100 == 0) {
                    console.log(`Mint: Minting (${i}/${dataChunk.length})`);
                }
            }
            console.log(`Mint: Minted (${serials.length})`);
            const serialsChunk = this.split(serials, 10);
            for (let i = 0; i < serialsChunk.length; i++) {
                const element = serialsChunk[i];
                try {
                    await client.transferNFT(tokenId, user.hederaAccountId, adminId, adminKey, element, uuid);
                } catch (error) {
                    console.log(`Mint: Transfer Error (${error.message})`);
                }
                if (i % 100 == 0) {
                    console.log(`Mint: Transfer (${i}/${serialsChunk.length})`);
                }
            }
            vcDate = serials;
        } else {
            await client.mint(tokenId, supplyKey, tokenValue, uuid);
            await client.transfer(tokenId, user.hederaAccountId, adminId, adminKey, tokenValue, uuid);
            vcDate = tokenAmount;
        }
        console.log('Mint: End');

        const mintVC = await this.createMintVC(root, token, vcDate);

        const vcs = [].concat(document, mintVC);
        const vp = await this.createVP(root, uuid, vcs);

        let status = false;
        status = await this.saveVC(mintVC, user.did, ref);
        status = await this.saveVP(vp, user.did, DataTypes.MINT, ref);

        return vp;
    }

    @CatchErrors()
    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const {
            tokenId,
            rule
        } = ref.options;
        const token = await getMongoRepository(TokenCollection).findOne({ tokenId });
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        const root = await getMongoRepository(RootConfigCollection).findOne({
            did: ref.policyOwner
        });

        let docs = [];
        if (Array.isArray(state.data)) {
            docs = state.data as any[];
        } else {
            docs = [state.data];
        }

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
            const doc = await this.mintProcessing(token, vcs, rule, root, curUser, ref);
            ref.runNext(null, state).then(
                function () { },
                function (error: any) { console.error(error); }
            );
        } catch (e) {
            throw e;
        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

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
    }
}