import { assert } from 'chai';
import { SchemaConverterUtils } from '../../../dist/helpers/schema-converter-utils.js';

const IPFS_LEGACY_PATTERN = '^((https)://)?ipfs.io/ipfs/.+';
const IPFS_PATTERN = '^ipfs://.+';

describe('SchemaConverterUtils.SchemaConverter — missing codeVersion', () => {
    it('runs both migrations when codeVersion is absent', () => {
        const schema = {
            entity: 'VC',
            document: { properties: { file: { pattern: IPFS_LEGACY_PATTERN } } },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result.document.properties.file.pattern, IPFS_PATTERN);
        assert.equal(result.document.properties.guardianVersion.readOnly, true);
        assert.equal(result.codeVersion, SchemaConverterUtils.VERSION);
    });

    it('treats a null codeVersion like an old schema', () => {
        const schema = { codeVersion: null, entity: 'VC', document: { properties: {} } };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.isOk(result.document.properties.guardianVersion);
        assert.equal(result.codeVersion, SchemaConverterUtils.VERSION);
    });

    it('does not append guardianVersion to an existing required array', () => {
        const schema = {
            codeVersion: '1.1.0',
            entity: 'VC',
            document: { properties: {}, required: ['policyId'] },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.deepEqual(result.document.required, ['policyId']);
    });
});

describe('SchemaConverterUtils.versionCompare — quirks', () => {
    it('treats leading zeros as numerically equal', () => {
        assert.equal(SchemaConverterUtils.versionCompare('01.0.0', '1.0.0'), 0);
    });

    it('ranks non-numeric (NaN) segments below real versions', () => {
        assert.equal(SchemaConverterUtils.versionCompare('a.b', '1.0'), -1);
    });

    it('tolerates leading whitespace inside numeric segments', () => {
        assert.equal(SchemaConverterUtils.versionCompare(' 1.0.0', '1.0.0'), 0);
    });
});
