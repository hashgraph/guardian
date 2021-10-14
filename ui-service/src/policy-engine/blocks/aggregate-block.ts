import {BasicBlock} from '@policy-engine/helpers/decorators';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {HcsVcDocument, VcSubject} from 'vc-modules';
import {Guardians} from '@helpers/guardians';
import {Inject} from '@helpers/decorators/inject';
import {Users} from '@helpers/users';
import * as mathjs from 'mathjs';
import {BlockActionError} from '@policy-engine/errors';
import {getMongoRepository} from 'typeorm';
import {AggregateVC} from '@entity/aggregateDocuments';

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
 * Aggregate block
 */
@BasicBlock({
    blockType: 'aggregateDocument',
    commonBlock: true
})
export class AggregateBlock {
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

    async runAction(state, user) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const {
            tokenId,
            rule,
            threshold
        } = ref.options;
        const token = (await this.guardians.getTokens({tokenId}))[0];
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }
        this.rule = rule;
        const doc = state.data;
        const vc = HcsVcDocument.fromJsonTree(doc.document, null, VcSubject);
        const repository = getMongoRepository(AggregateVC)
        const newVC = repository.create({
            owner: doc.owner,
            document: vc.toJsonTree()
        });
        await repository.save(newVC);

        const rawEntities = await repository.find({
            owner: doc.owner
        });
        const forAggregate = rawEntities.map(e => HcsVcDocument.fromJsonTree(e.document, null, VcSubject));
        const amount = this.aggregate(rule, forAggregate);

        if (amount >= threshold) {
            await repository.remove(rawEntities);
            const currentIndex = ref.parent.children.findIndex(el => this === el);
            if (ref.parent.children[currentIndex + 1] && ref.parent.children[currentIndex + 1].runAction) {
                await ref.parent.children[currentIndex + 1].runAction({data: rawEntities}, null);
            }
        }
    }
}