import { assert } from 'chai';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';

const block = () => Object.create(DocumentValidatorBlock.prototype);
const ref = { policyId: 'policy-1' };

describe('documentValidatorBlock source filter coercion', () => {
    describe('type coercion against string-stored values', () => {
        const filterFor = (type, value) => block().buildSourceFilter(
            { filters: [{ field: 'document.credentialSubject.0.date', type, value, typeValue: 'value' }] },
            ref, {}, {}
        );

        it('offers both representations for equality', () => {
            const filter = filterFor('equal', '100');

            // '100' coerces to the number 100; VC JSON stores the string, and Mongo
            // comparisons are type-bracketed, so one representation alone misses
            assert.deepEqual(filter['document.credentialSubject.0.date'], { $in: [100, '100'] });
        });

        it('excludes both representations for not_equal', () => {
            const filter = filterFor('not_equal', '100');

            assert.deepEqual(filter['document.credentialSubject.0.date'], { $nin: [100, '100'] });
        });

        it('compares a date range as either type', () => {
            const filter = filterFor('gte', '2024-01-01');

            // a single $gte would compare epoch-ms against strings and match nothing
            assert.isArray(filter.$and);
            const or = filter.$and[0].$or;
            assert.lengthOf(or, 2);
            assert.equal(or[1]['document.credentialSubject.0.date'].$gte, '2024-01-01');
        });

        it('keeps a single predicate when coercion changes nothing', () => {
            const filter = filterFor('gte', 'abc');

            assert.isUndefined(filter.$and);
            assert.deepEqual(filter['document.credentialSubject.0.date'], { $gte: 'abc' });
        });

        it('widens every element of an in list', () => {
            const filter = block().buildSourceFilter(
                { filters: [{ field: 'f', type: 'in', value: '1, 2', typeValue: 'value' }] },
                ref, {}, {}
            );

            assert.deepEqual(filter.f, { $in: [1, '1', 2, '2'] });
        });
    });
});
