import { BasicBlock } from '@policy-engine/helpers/decorators';
import * as mathjs from 'mathjs';
import { BlockActionError } from '@policy-engine/errors';
import { getMongoRepository } from 'typeorm';
import { AggregateVC } from '@entity/aggregateDocuments';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { VcDocument } from '@hedera-modules';
import { Token } from '@entity/token';

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
    async runAction(data: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const {
            tokenId,
            rule,
            threshold
        } = ref.options;

        const token = await getMongoRepository(Token).findOne({tokenId});
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        const doc = data.data;
        const vc = VcDocument.fromJsonTree(doc.document);
        const repository = getMongoRepository(AggregateVC)
        const newVC = repository.create({
            owner: doc.owner,
            document: vc.toJsonTree()
        });
        await repository.save(newVC);

        const rawEntities = await repository.find({
            owner: doc.owner
        });
        const forAggregate = rawEntities.map(e => VcDocument.fromJsonTree(e.document));
        const amount = this.aggregate(rule, forAggregate);

        if (amount >= threshold) {
            await repository.remove(rawEntities);
            await ref.runNext(null, {data: rawEntities});
        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
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
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }

    private getScope(item: VcDocument): any {
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
}
