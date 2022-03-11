import { BasicBlock } from '@policy-engine/helpers/decorators';
import { HcsVcDocument, VcSubject } from 'vc-modules';
import { Guardians } from '@helpers/guardians';
import { Inject } from '@helpers/decorators/inject';
import * as mathjs from 'mathjs';
import { BlockActionError } from '@policy-engine/errors';
import { getMongoRepository } from 'typeorm';
import { AggregateVC } from '@entity/aggregateDocuments';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';

function evaluate(formula: string, scope: any) {
    return (function (formula: string, scope: any) {
        try {
            return this.evaluate(formula, scope);
        } catch (error) {
            return 'Incorrect formula';
        }
    }).call(mathjs, formula, scope);
}

/**
 * Aggregate block
 */
@BasicBlock({
    blockType: 'aggregateDocumentBlock',
    commonBlock: true
})
export class AggregateBlock {
    @Inject()
    private guardians: Guardians;

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

    async runAction(data: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const {
            tokenId,
            rule,
            threshold
        } = ref.options;

        const token = (await this.guardians.getTokens({ tokenId }))[0];
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }
        this.rule = rule;
        const doc = data.data;
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
            await ref.runNext(null, { data: rawEntities });
        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        // Test rule options
        if (!ref.options.rule) {
            resultsContainer.addBlockError(ref.uuid, 'Option "rule" does not set');
        } else if (typeof ref.options.rule !== 'string') {
            resultsContainer.addBlockError(ref.uuid, 'Option "rule" must be a string');
        }

        // Test threshold options
        if (!ref.options.threshold) {
            resultsContainer.addBlockError(ref.uuid, 'Option "threshold" does not set');
        } else if (typeof ref.options.threshold !== 'string') {
            resultsContainer.addBlockError(ref.uuid, 'Option "threshold" must be a string');
        }
    }
}
