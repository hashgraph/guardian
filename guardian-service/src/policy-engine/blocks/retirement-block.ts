import { BasicBlock } from '@policy-engine/helpers/decorators';
import { HcsVcDocument, HcsVpDocument, HederaHelper, HederaUtils, VcSubject } from 'vc-modules';
import { Guardians } from '@helpers/guardians';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { VcHelper } from '@helpers/vcHelper';
import * as mathjs from 'mathjs';
import { BlockActionError } from '@policy-engine/errors';
import { DocumentSignature, SchemaEntity, SchemaHelper } from 'interfaces';
import {PolicyValidationResultsContainer} from '@policy-engine/policy-validation-results-container';
import {PolicyComponentsUtils} from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';

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
 * Retirement block
 */
@BasicBlock({
    blockType: 'retirementDocumentBlock',
    commonBlock: true
})
export class RetirementBlock {
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
                type: DataTypes.RETIREMENT as any,
                policyId:  ref.policyId,
                tag: ref.tag,
                schema: `#${vc.getCredentialSubject()[0].getType()}`
            })
            return true;
        } catch (error) {
            return false;
        }
    }

    private async saveVP(vp: HcsVpDocument, sensorDid: string, type: DataTypes, ref:any): Promise<boolean> {
        try {
            if (!vp) {
                return false;
            }
            await this.guardians.setVpDocument({
                hash: vp.toCredentialHash(),
                document: vp.toJsonTree(),
                owner: sensorDid,
                type: type as any,
                policyId:  ref.policyId,
                tag: ref.tag
            })
            return true;
        } catch (error) {
            return false;
        }
    }

    private async createWipeVC(root, token, data: number): Promise<HcsVcDocument<VcSubject>> {
        const vcHelper = new VcHelper();

        const policySchema = await this.guardians.getSchemaByEntity(SchemaEntity.WIPE_TOKEN);
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

    private async retirementProcessing(token, document, rule, root, user, ref): Promise<any> {
        const tokenId = token.tokenId;
        const wipeKey = token.wipeKey;
        const adminId = token.adminId;
        const adminKey = token.adminKey;

        const uuid = HederaUtils.randomUUID();
        const amount = this.aggregate(rule, document);
        const tokenValue = this.tokenAmount(token, amount);

        const hederaHelper = HederaHelper.setOperator(
            root.hederaAccountId, root.hederaAccountKey
        );

        let wipeVC: HcsVcDocument<VcSubject>;
        if (token.tokenType == 'non-fungible') {
            throw "unsupported operation";
        } else {
            await hederaHelper.SDK.wipe(tokenId, user.hederaAccountId, wipeKey, tokenValue, uuid);
            wipeVC = await this.createWipeVC(root, token, tokenValue);
        }
        const vcs = [].concat(document, wipeVC);
        const vp = await this.createVP(root, uuid, vcs);

        let status = false;
        status = await this.saveVC(wipeVC, user.did, ref);
        status = await this.saveVP(vp, user.did, DataTypes.RETIREMENT, ref);

        return vp;
    }

    @CatchErrors()
    async runAction(state: any, user:IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
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
            if(element.signature === DocumentSignature.INVALID) {
                throw new BlockActionError('Invalid VC proof', ref.blockType, ref.uuid);
            }
            vcs.push(HcsVcDocument.fromJsonTree(element.document, null, VcSubject));
        }

        const curUser = await this.users.getUserById(docs[0].owner);

        if (!curUser) {
            throw new BlockActionError('Bad User DID', ref.blockType, ref.uuid);
        }

        try {
            const doc = await this.retirementProcessing(token, vcs, rule, root, curUser, ref);
            ref.runNext(null, { data: doc }).then(
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
        } else if (!(await this.guardians.getTokens({ tokenId: ref.options.tokenId }))[0]) {
            resultsContainer.addBlockError(ref.uuid, `Token with id ${ref.options.tokenId} does not exist`);
        }

        if (!ref.options.rule) {
            resultsContainer.addBlockError(ref.uuid, 'Option "rule" does not set');
        } else if (typeof ref.options.rule !== 'string') {
            resultsContainer.addBlockError(ref.uuid, 'Option "rule" must be a string');
        }
    }
}
