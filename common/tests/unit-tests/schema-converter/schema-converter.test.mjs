import { assert } from 'chai';
import { SchemaConverterUtils } from '../../../dist/helpers/schema-converter-utils.js';

describe('SchemaConverterUtils.versionCompare', () => {
    it('returns 1 when v2 is null/undefined', () => {
        assert.equal(SchemaConverterUtils.versionCompare('1.0.0', null), 1);
        assert.equal(SchemaConverterUtils.versionCompare('1.0.0', undefined), 1);
        assert.equal(SchemaConverterUtils.versionCompare('1.0.0', ''), 1);
    });

    it('returns 0 for identical versions', () => {
        assert.equal(SchemaConverterUtils.versionCompare('1.2.0', '1.2.0'), 0);
        assert.equal(SchemaConverterUtils.versionCompare('0.0.1', '0.0.1'), 0);
    });

    it('returns 1 when v1 is newer at the major position', () => {
        assert.equal(SchemaConverterUtils.versionCompare('2.0.0', '1.9.9'), 1);
    });

    it('returns -1 when v1 is older at the major position', () => {
        assert.equal(SchemaConverterUtils.versionCompare('1.0.0', '2.0.0'), -1);
    });

    it('returns 1 when v1 has more components than v2 with matching prefix', () => {
        // The loop returns 1 once v2 runs out at index i with v1 still having parts.
        assert.equal(SchemaConverterUtils.versionCompare('1.0.1', '1.0'), 1);
    });

    it('returns -1 when v1 is shorter than v2 with matching prefix', () => {
        // After loop completes equal-component-by-component, length-mismatch → -1.
        assert.equal(SchemaConverterUtils.versionCompare('1.0', '1.0.1'), -1);
    });

    it('compares minor and patch positions', () => {
        assert.equal(SchemaConverterUtils.versionCompare('1.2.3', '1.2.2'), 1);
        assert.equal(SchemaConverterUtils.versionCompare('1.2.3', '1.2.4'), -1);
        assert.equal(SchemaConverterUtils.versionCompare('1.3.0', '1.2.999'), 1);
    });
});

describe('SchemaConverterUtils.SchemaConverter', () => {
    it('returns the schema unchanged when codeVersion already equals VERSION', () => {
        const schema = {
            codeVersion: SchemaConverterUtils.VERSION,
            document: { sentinel: true },
            entity: 'VC',
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result, schema);
        assert.deepEqual(result.document, { sentinel: true });
    });

    it('updates codeVersion to current VERSION after conversion', () => {
        const schema = {
            codeVersion: '0.0.1',
            document: { properties: {} },
            entity: 'NONE',
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result.codeVersion, SchemaConverterUtils.VERSION);
    });

    it('mutates and returns the same document reference', () => {
        const document = { properties: {} };
        const schema = { codeVersion: '0.0.1', document, entity: 'NONE' };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result, schema);
        assert.equal(result.document, document);
    });

    it('leaves a document without properties untouched', () => {
        const schema = { codeVersion: '0.0.1', document: {}, entity: 'VC' };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.deepEqual(result.document, {});
    });
});

const IPFS_LEGACY_PATTERN = '^((https)://)?ipfs.io/ipfs/.+';
const IPFS_PATTERN = '^ipfs://.+';

describe('SchemaConverterUtils.SchemaConverter — v1_1_0 ipfs pattern migration', () => {
    it('rewrites a direct ipfs.io property pattern to ipfs://', () => {
        const schema = {
            codeVersion: '1.0.0',
            entity: 'NONE',
            document: { properties: { file: { pattern: IPFS_LEGACY_PATTERN } } },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result.document.properties.file.pattern, IPFS_PATTERN);
    });

    it('rewrites a nested items.pattern to ipfs://', () => {
        const schema = {
            codeVersion: '1.0.0',
            entity: 'NONE',
            document: { properties: { files: { items: { pattern: IPFS_LEGACY_PATTERN } } } },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result.document.properties.files.items.pattern, IPFS_PATTERN);
    });

    it('leaves a non-ipfs pattern unchanged', () => {
        const schema = {
            codeVersion: '1.0.0',
            entity: 'NONE',
            document: { properties: { name: { pattern: '^[a-z]+$' } } },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result.document.properties.name.pattern, '^[a-z]+$');
    });

    it('does not run on schemas already at 1.1.0', () => {
        const schema = {
            codeVersion: '1.1.0',
            entity: 'NONE',
            document: { properties: { file: { pattern: IPFS_LEGACY_PATTERN } } },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result.document.properties.file.pattern, IPFS_LEGACY_PATTERN);
    });
});

describe('SchemaConverterUtils.SchemaConverter — v1_2_0 guardianVersion migration', () => {
    it('adds a read-only guardianVersion property for VC entities', () => {
        const schema = {
            codeVersion: '1.1.0',
            entity: 'VC',
            document: { properties: {} },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        const guardianVersion = result.document.properties.guardianVersion;
        assert.equal(guardianVersion.title, 'Guardian Version');
        assert.equal(guardianVersion.type, 'string');
        assert.equal(guardianVersion.readOnly, true);
    });

    it('does not add guardianVersion for non-VC entities', () => {
        const schema = {
            codeVersion: '1.1.0',
            entity: 'NONE',
            document: { properties: {} },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.isUndefined(result.document.properties.guardianVersion);
    });

    it('does not add guardianVersion for EVC entities (VC only)', () => {
        const schema = {
            codeVersion: '1.1.0',
            entity: 'EVC',
            document: { properties: {} },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.isUndefined(result.document.properties.guardianVersion);
    });

    it('overwrites an existing guardianVersion with the canonical shape', () => {
        const schema = {
            codeVersion: '1.1.0',
            entity: 'VC',
            document: { properties: { guardianVersion: { stale: true } } },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.isUndefined(result.document.properties.guardianVersion.stale);
        assert.equal(result.document.properties.guardianVersion.readOnly, true);
    });

    it('applies both ipfs and guardianVersion migrations for an old VC schema', () => {
        const schema = {
            codeVersion: '1.0.0',
            entity: 'VC',
            document: { properties: { file: { pattern: IPFS_LEGACY_PATTERN } } },
        };
        const result = SchemaConverterUtils.SchemaConverter(schema);
        assert.equal(result.document.properties.file.pattern, IPFS_PATTERN);
        assert.equal(result.document.properties.guardianVersion.readOnly, true);
        assert.equal(result.codeVersion, SchemaConverterUtils.VERSION);
    });
});
