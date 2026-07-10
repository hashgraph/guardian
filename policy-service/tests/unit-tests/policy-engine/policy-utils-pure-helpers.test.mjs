import { assert } from 'chai';
import { PolicyUtils, QueryType } from '../../../dist/policy-engine/helpers/utils.js';
import { DocumentType } from '../../../dist/policy-engine/interfaces/document.type.js';

describe('PolicyUtils.variables', () => {
    it('extracts free symbol names from a formula', () => {
        assert.deepEqual(PolicyUtils.variables('a + b * c'), ['a', 'b', 'c']);
    });
    it('returns an empty array for a constant', () => {
        assert.deepEqual(PolicyUtils.variables('2 + 3'), []);
    });
    it('returns an empty array when parsing fails', () => {
        assert.deepEqual(PolicyUtils.variables('2 +'), []);
    });
});

describe('PolicyUtils.evaluateFormula / evaluateCustomFormula', () => {
    it('evaluates a valid expression with scope', () => {
        assert.equal(PolicyUtils.evaluateFormula('x * 2', { x: 4 }), 8);
    });
    it('returns "Incorrect formula" on error', () => {
        assert.equal(PolicyUtils.evaluateFormula('x +', {}), 'Incorrect formula');
    });
    it('custom formula evaluates a valid expression', () => {
        assert.equal(PolicyUtils.evaluateCustomFormula('1 + 1', {}), 2);
    });
    it('custom formula returns "Incorrect formula" on error', () => {
        assert.equal(PolicyUtils.evaluateCustomFormula('@@', {}), 'Incorrect formula');
    });
});

describe('PolicyUtils.aggregateSerialRange', () => {
    it('builds an ascending inclusive range', () => {
        assert.deepEqual(PolicyUtils.aggregateSerialRange(3, 5), [3, 4, 5]);
    });
    it('normalises swapped bounds', () => {
        assert.deepEqual(PolicyUtils.aggregateSerialRange(5, 3), [3, 4, 5]);
    });
    it('returns a single element when bounds are equal', () => {
        assert.deepEqual(PolicyUtils.aggregateSerialRange(7, 7), [7]);
    });
});

describe('PolicyUtils.tokenAmount', () => {
    it('rounds by default', () => {
        assert.deepEqual(PolicyUtils.tokenAmount({ decimals: '2' }, 1.234, 'round'), [123, '1.23']);
    });
    it('ceils when method=ceil', () => {
        assert.deepEqual(PolicyUtils.tokenAmount({ decimals: '2' }, 1.231, 'ceil'), [124, '1.24']);
    });
    it('floors when method=floor', () => {
        assert.deepEqual(PolicyUtils.tokenAmount({ decimals: '2' }, 1.239, 'floor'), [123, '1.23']);
    });
    it('treats a non-numeric decimals as zero', () => {
        assert.deepEqual(PolicyUtils.tokenAmount({ decimals: 'x' }, 5.6, 'round'), [6, '6']);
    });
});

describe('PolicyUtils.splitChunk', () => {
    it('splits into chunks of the given size', () => {
        assert.deepEqual(PolicyUtils.splitChunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    });
    it('returns an empty array for an empty input', () => {
        assert.deepEqual(PolicyUtils.splitChunk([], 3), []);
    });
});

describe('PolicyUtils.getObjectValue', () => {
    it('reads a nested path', () => {
        assert.equal(PolicyUtils.getObjectValue({ a: { b: { c: 7 } } }, 'a.b.c'), 7);
    });
    it('reads the last array element via the "L" key', () => {
        assert.equal(PolicyUtils.getObjectValue({ a: [{ b: 1 }, { b: 2 }] }, 'a.L.b'), 2);
    });
    it('returns null on a broken path', () => {
        assert.isNull(PolicyUtils.getObjectValue({ a: null }, 'a.b'));
    });
    it('returns null when field is empty', () => {
        assert.isNull(PolicyUtils.getObjectValue({ a: 1 }, ''));
    });
});

describe('PolicyUtils.setObjectValue', () => {
    it('sets a nested path', () => {
        const data = { a: { b: {} } };
        PolicyUtils.setObjectValue(data, 'a.b.c', 9);
        assert.equal(data.a.b.c, 9);
    });
    it('sets via the "L" array key', () => {
        const data = { a: [{ b: 0 }, { b: 0 }] };
        PolicyUtils.setObjectValue(data, 'a.L.b', 42);
        assert.equal(data.a[1].b, 42);
    });
    it('does nothing for an empty field', () => {
        const data = { a: 1 };
        PolicyUtils.setObjectValue(data, '', 5);
        assert.deepEqual(data, { a: 1 });
    });
    it('returns early on a broken path', () => {
        const data = { a: null };
        PolicyUtils.setObjectValue(data, 'a.b.c', 5);
        assert.isNull(data.a);
    });
});

describe('PolicyUtils.getArray', () => {
    it('wraps a scalar in an array', () => {
        assert.deepEqual(PolicyUtils.getArray(5), [5]);
    });
    it('passes an array through', () => {
        assert.deepEqual(PolicyUtils.getArray([1, 2]), [1, 2]);
    });
});

describe('PolicyUtils.getSubjectId / getCredentialSubject', () => {
    it('reads id from an array credentialSubject', () => {
        assert.equal(PolicyUtils.getSubjectId({ document: { credentialSubject: [{ id: 'A' }] } }), 'A');
    });
    it('reads id from an object credentialSubject', () => {
        assert.equal(PolicyUtils.getSubjectId({ document: { credentialSubject: { id: 'B' } } }), 'B');
    });
    it('returns null when there is no document', () => {
        assert.isNull(PolicyUtils.getSubjectId({}));
    });
    it('getCredentialSubject reads the first array element', () => {
        assert.deepEqual(PolicyUtils.getCredentialSubject({ document: { credentialSubject: [{ x: 1 }] } }), { x: 1 });
    });
    it('getCredentialSubject returns null without a document', () => {
        assert.isNull(PolicyUtils.getCredentialSubject(null));
    });
    it('getCredentialSubjectByDocument handles object and array', () => {
        assert.deepEqual(PolicyUtils.getCredentialSubjectByDocument({ credentialSubject: { y: 2 } }), { y: 2 });
        assert.deepEqual(PolicyUtils.getCredentialSubjectByDocument({ credentialSubject: [{ z: 3 }] }), { z: 3 });
        assert.isNull(PolicyUtils.getCredentialSubjectByDocument(null));
    });
});

describe('PolicyUtils.getDocumentType', () => {
    it('returns VerifiablePresentation', () => {
        assert.equal(PolicyUtils.getDocumentType({ document: { verifiableCredential: [] } }), DocumentType.VerifiablePresentation);
    });
    it('returns VerifiableCredential', () => {
        assert.equal(PolicyUtils.getDocumentType({ document: { credentialSubject: {} } }), DocumentType.VerifiableCredential);
    });
    it('returns DID', () => {
        assert.equal(PolicyUtils.getDocumentType({ document: { verificationMethod: {} } }), DocumentType.DID);
    });
    it('returns null for an unrecognised document', () => {
        assert.isNull(PolicyUtils.getDocumentType({ document: {} }));
        assert.isNull(PolicyUtils.getDocumentType(null));
    });
});

describe('PolicyUtils.checkDocumentField', () => {
    const doc = { a: 5, list: ['x', 'y'] };
    it('equal', () => {
        assert.isTrue(PolicyUtils.checkDocumentField(doc, { field: 'a', type: 'equal', value: 5 }));
        assert.isFalse(PolicyUtils.checkDocumentField(doc, { field: 'a', type: 'equal', value: 6 }));
    });
    it('not_equal', () => {
        assert.isTrue(PolicyUtils.checkDocumentField(doc, { field: 'a', type: 'not_equal', value: 6 }));
    });
    it('in / not_in', () => {
        assert.isTrue(PolicyUtils.checkDocumentField(doc, { field: 'list', type: 'in', value: 'x' }));
        assert.isFalse(PolicyUtils.checkDocumentField(doc, { field: 'a', type: 'in', value: 'x' }));
        assert.isTrue(PolicyUtils.checkDocumentField(doc, { field: 'list', type: 'not_in', value: 'q' }));
        assert.isFalse(PolicyUtils.checkDocumentField(doc, { field: 'a', type: 'not_in', value: 'q' }));
    });
    it('unknown type returns false', () => {
        assert.isFalse(PolicyUtils.checkDocumentField(doc, { field: 'a', type: 'weird', value: 5 }));
    });
    it('no document returns false', () => {
        assert.isFalse(PolicyUtils.checkDocumentField(null, { field: 'a', type: 'equal', value: 5 }));
    });
});

describe('PolicyUtils.getDocumentRef', () => {
    it('reads ref from a VC credentialSubject', () => {
        assert.equal(PolicyUtils.getDocumentRef({ document: { credentialSubject: { ref: 'R1' } } }), 'R1');
    });
    it('reads ref from an array credentialSubject', () => {
        assert.equal(PolicyUtils.getDocumentRef({ document: { credentialSubject: [{ ref: 'R2' }] } }), 'R2');
    });
    it('reads ref from a VP verifiableCredential', () => {
        assert.equal(PolicyUtils.getDocumentRef({
            document: { verifiableCredential: [{ credentialSubject: [{ ref: 'R3' }] }] }
        }), 'R3');
    });
    it('returns null when no ref exists', () => {
        assert.isNull(PolicyUtils.getDocumentRef({ document: {} }));
        assert.isNull(PolicyUtils.getDocumentRef(null));
    });
});

describe('PolicyUtils.getErrorMessage', () => {
    it('returns the string itself', () => {
        assert.equal(PolicyUtils.getErrorMessage('boom'), 'boom');
    });
    it('returns error.message', () => {
        assert.equal(PolicyUtils.getErrorMessage(new Error('m')), 'm');
    });
    it('returns error.error', () => {
        assert.equal(PolicyUtils.getErrorMessage({ error: 'e' }), 'e');
    });
    it('returns error.name', () => {
        assert.equal(PolicyUtils.getErrorMessage({ name: 'n' }), 'n');
    });
    it('returns a fallback for an unidentified error', () => {
        assert.equal(PolicyUtils.getErrorMessage({}), 'Unidentified error');
    });
});

describe('PolicyUtils.parseFilterValue', () => {
    const cases = [
        ['eq:1', QueryType.eq, '1'],
        ['ne:2', QueryType.ne, '2'],
        ['in:a,b', QueryType.in, 'a,b'],
        ['nin:x', QueryType.nin, 'x'],
        ['gt:3', QueryType.gt, '3'],
        ['gte:4', QueryType.gte, '4'],
        ['lt:5', QueryType.lt, '5'],
        ['lte:6', QueryType.lte, '6'],
        ['regex:abc', QueryType.regex, 'abc'],
    ];
    for (const [input, type, value] of cases) {
        it(`parses "${input}"`, () => {
            assert.deepEqual(PolicyUtils.parseFilterValue(input), [type, value]);
        });
    }
    it('returns [null, value] for an unprefixed string', () => {
        assert.deepEqual(PolicyUtils.parseFilterValue('plain'), [null, 'plain']);
    });
});

describe('PolicyUtils.getQueryValue', () => {
    it('coerces numbers to strings then applies the type', () => {
        assert.equal(PolicyUtils.getQueryValue(QueryType.eq, 5), '5');
    });
    it('returns null for non-string non-number', () => {
        assert.isNull(PolicyUtils.getQueryValue(QueryType.eq, {}));
    });
    it('splits in/nin into arrays', () => {
        assert.deepEqual(PolicyUtils.getQueryValue(QueryType.in, 'a,b'), ['a', 'b']);
        assert.deepEqual(PolicyUtils.getQueryValue(QueryType.nin, 'a,b'), ['a', 'b']);
    });
    it('wraps regex in .* anchors', () => {
        assert.equal(PolicyUtils.getQueryValue(QueryType.regex, 'x'), '.*x.*');
    });
    it('returns null for an unknown query type', () => {
        assert.isNull(PolicyUtils.getQueryValue('weird', 'x'));
    });
});

describe('PolicyUtils.getQueryExpression', () => {
    it('returns null for null/undefined value', () => {
        assert.isNull(PolicyUtils.getQueryExpression(QueryType.eq, null));
        assert.isNull(PolicyUtils.getQueryExpression(QueryType.eq, undefined));
    });
    it('maps each query type to a Mongo operator', () => {
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.eq, 1), { $eq: 1 });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.ne, 1), { $ne: 1 });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.in, [1]), { $in: [1] });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.nin, [1]), { $nin: [1] });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.gt, 1), { $gt: 1 });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.gte, 1), { $gte: 1 });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.lt, 1), { $lt: 1 });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.lte, 1), { $lte: 1 });
        assert.deepEqual(PolicyUtils.getQueryExpression(QueryType.regex, 'x'), { $regex: 'x' });
    });
    it('returns null for an unknown query type', () => {
        assert.isNull(PolicyUtils.getQueryExpression('weird', 1));
    });
});

describe('PolicyUtils.parseQuery', () => {
    it('parses a user_defined filter end to end', () => {
        const out = PolicyUtils.parseQuery('user_defined', 'in:a,b');
        assert.equal(out.type, QueryType.in);
        assert.deepEqual(out.value, ['a', 'b']);
        assert.deepEqual(out.expression, { $in: ['a', 'b'] });
    });
    it('parses an explicit type', () => {
        const out = PolicyUtils.parseQuery(QueryType.eq, 'val');
        assert.equal(out.type, QueryType.eq);
        assert.equal(out.value, 'val');
        assert.deepEqual(out.expression, { $eq: 'val' });
    });
});

describe('PolicyUtils.parseQueryNumberValue', () => {
    it('returns string/number pair for a scalar number', () => {
        assert.deepEqual(PolicyUtils.parseQueryNumberValue('5'), ['5', 5]);
    });
    it('returns null for a non-number scalar', () => {
        assert.isNull(PolicyUtils.parseQueryNumberValue('abc'));
    });
    it('returns paired arrays for an array of numbers', () => {
        assert.deepEqual(PolicyUtils.parseQueryNumberValue([1, 2]), [['1', '2'], [1, 2]]);
    });
    it('returns null for an array with a non-number', () => {
        assert.isNull(PolicyUtils.parseQueryNumberValue([1, 'x']));
    });
    it('returns null for an empty array', () => {
        assert.isNull(PolicyUtils.parseQueryNumberValue([]));
    });
});

describe('PolicyUtils.getQueryFilter number branches', () => {
    it('builds an $or for a numeric $gt operation', () => {
        const out = PolicyUtils.getQueryFilter('document.field', { $gt: 5 });
        assert.property(out, '$or');
    });
    it('builds an $and for a numeric $nin operation', () => {
        const out = PolicyUtils.getQueryFilter('document.field', { $nin: 5 });
        assert.property(out, '$and');
    });
    it('builds an $and for a numeric $ne operation', () => {
        const out = PolicyUtils.getQueryFilter('document.field', { $ne: 5 });
        assert.property(out, '$and');
    });
    it('builds a $not/$in for a non-numeric $nin operation', () => {
        const out = PolicyUtils.getQueryFilter('document.field', { $nin: 'abc' });
        assert.property(out, '$not');
    });
    it('builds a plain operator for a non-numeric value', () => {
        const out = PolicyUtils.getQueryFilter('document.field', { $eq: 'abc' });
        assert.property(out, '$eq');
    });
    it('rewrites credentialSubject key aliases', () => {
        const out = PolicyUtils.getQueryFilter('document.credentialSubject.0.x', 'abc');
        assert.deepEqual(out, { $eq: ['$firstCredentialSubject.x', 'abc'] });
    });
});

describe('PolicyUtils.createVcFromSubject', () => {
    it('builds a VC document carrying the subject', () => {
        const vc = PolicyUtils.createVcFromSubject({ id: 'x', type: 'T', value: 1 });
        assert.isFunction(vc.getCredentialSubject);
        assert.isObject(vc.getCredentialSubject(0));
    });
});
