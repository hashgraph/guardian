import { BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyBlockHelpers } from '@policy-engine/helpers/policy-block-helpers';
import { HcsVcDocument, HcsVpDocument, HederaHelper, HederaUtils, VcSubject } from 'vc-modules';
import { Guardians } from '@helpers/guardians';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { VcHelper } from '@helpers/vcHelper';
import * as mathjs from 'mathjs';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature } from 'interfaces';

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
    INSTALLER = 'installer',
    SENSOR = 'sensor',
    MRV = 'mrv',
    REPORT = 'report',
    MINT = 'mint',
    RETIREMENT = 'retirement'
}

/**
 * Mint block
 */
@BasicBlock({
    blockType: 'mintDocument',
    commonBlock: true
})
export class MintBlock {
    @Inject()
    private guardians: Guardians;

    @Inject()
    private users: Users;

    private tokenId: any;
    private rule: any;

    private getScope(item: HcsVcDocument<VcSubject>) {
        return item.getCredentialSubject()[0].toJsonTree();
    }

    private aggregate(rule, vcs: HcsVcDocument<VcSubject>[]) {
        let amount = 0;
        for (let i = 0; i < vcs.length; i++) {
            const element = vcs[i];
            const scope = this.getScope(element);
            const value = parseFloat(evaluate(rule, scope));
            amount += value;
        }
        return amount;
    }

    private tokenAmount(token, amount: number) {
        const decimals = parseFloat(token.decimals) || 0;
        const _decimals = Math.pow(10, decimals);
        return Math.round(amount * _decimals);
    }

    private async saveVC(vc: HcsVcDocument<VcSubject>, owner: string, ref: any): Promise<boolean> {
        try {
            await this.guardians.setVcDocument({
                hash: vc.toCredentialHash(),
                owner: owner,
                document: vc.toJsonTree(),
                type: DataTypes.MINT as any,
                policyId: ref.policyId,
                tag: ref.tag
            })
            return true;
        } catch (error) {
            return false;
        }
    }

    private async saveVP(vp: HcsVpDocument, sensorDid: string, type: DataTypes, ref: any): Promise<boolean> {
        try {
            if (!vp) {
                return false;
            }
            await this.guardians.setVpDocument({
                hash: vp.toCredentialHash(),
                document: vp.toJsonTree(),
                owner: sensorDid,
                type: type as any,
                policyId: ref.policyId,
                tag: ref.tag
            })
            return true;
        } catch (error) {
            return false;
        }
    }

    private async createMintVC(root, token, data: number | number[]): Promise<HcsVcDocument<VcSubject>> {
        const vcHelper = new VcHelper();

        let vcSubject: any, schema: string;
        if (token.tokenType == 'non-fungible') {
            const serials = data as number[];
            vcSubject = {
                date: (new Date()).toISOString(),
                tokenId: token.tokenId,
                serials: serials
            }
            schema = 'MintNFToken';
        } else {
            const amount = data as number;
            vcSubject = {
                date: (new Date()).toISOString(),
                tokenId: token.tokenId,
                amount: amount.toString()
            }
            schema = 'MintToken';
        }
        const mintVC = await vcHelper.createVC(
            root.did,
            root.hederaAccountKey,
            schema,
            vcSubject
        );
        return mintVC;
    }

    private async createVP(root, uuid: string, vcs: HcsVcDocument<VcSubject>[]) {
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
        const tokenValue = this.tokenAmount(token, amount);

        const hederaHelper = HederaHelper.setOperator(
            root.hederaAccountId, root.hederaAccountKey
        );

        let mintVC: HcsVcDocument<VcSubject>;
        if (token.tokenType == 'non-fungible') {
            const data: any = HederaUtils.decode(tokenValue.toString());
            const serials = await hederaHelper.SDK.mintNFT(tokenId, supplyKey, [data], uuid);
            await hederaHelper.SDK.transferNFT(tokenId, user.hederaAccountId, adminId, adminKey, serials, uuid);
            mintVC = await this.createMintVC(root, token, serials);
        } else {
            await hederaHelper.SDK.mint(tokenId, supplyKey, tokenValue, uuid);
            await hederaHelper.SDK.transfer(tokenId, user.hederaAccountId, adminId, adminKey, tokenValue, uuid);
            mintVC = await this.createMintVC(root, token, tokenValue);
        }

        const vcs = [].concat(document, mintVC);
        const vp = await this.createVP(root, uuid, vcs);

        let status = false;
        status = await this.saveVC(mintVC, user.did, ref);
        status = await this.saveVP(vp, user.did, DataTypes.MINT, ref);
    }

    async runAction(state, user) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const {
            tokenId,
            rule
        } = ref.options;

        const token = (await this.guardians.getTokens({ tokenId }))[0];
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }
        const root = await this.guardians.getRootConfig(ref.policyOwner);

        let docs = [];
        if (Array.isArray(state.data)) {
            docs = state.data as any[];
        } else {
            docs = [state.data];
        }

        if (!docs.length && docs[0]) {
            throw new BlockActionError('Bad VC', ref.blockType, ref.uuid);
        }

        const vcs: HcsVcDocument<VcSubject>[] = [];
        for (let i = 0; i < docs.length; i++) {
            const element = docs[i];
            if (element.signature === DocumentSignature.INVALID) {
                throw new BlockActionError('Invalid VC proof', ref.blockType, ref.uuid);
            }
            vcs.push(HcsVcDocument.fromJsonTree(element.document, null, VcSubject));
        }

        const curUser = await this.users.getUserById(docs[0].owner);

        if (!curUser) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        try {
            await this.mintProcessing(token, vcs, rule, root, curUser, ref);
        } catch (e) {
            throw e;
        }
    }
}
