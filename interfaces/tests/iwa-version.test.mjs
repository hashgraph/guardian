import assert from 'node:assert/strict';
import {
    IwaVersion,
    DEFAULT_IWA_VERSION,
    resolveIwaVersion,
    mapIwaPathV1ToV3
} from '../dist/type/iwa-version.type.js';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const comment = (o) => JSON.stringify(o);

/** A field carrying an IWA property in its $comment, as the schema editor writes it. */
const field = (term, property) => ({
    title: term,
    description: term,
    readOnly: false,
    type: 'string',
    $comment: comment({
        term,
        '@id': 'https://www.schema.org/text',
        isPrivate: false,
        orderPosition: 0,
        ...(property ? { property } : {})
    })
});

/**
 * Document exercising every shape the remap has to reach: top level, a oneOf
 * wrapper, a nested object, and the items of an array of objects.
 */
const buildDocument = () => ({
    $id: '#fixture',
    title: 'fixture',
    type: 'object',
    properties: {
        projectTitle: field('projectTitle', 'ActivityImpactModule.name'),
        postalCode: field('postalCode', 'Address.zip'),
        orgCountry: field('orgCountry', 'AccountableImpactOrganization.country'),
        legacyExtension: field('legacyExtension', 'MrvExtension.typedExtension'),
        coBenefits: { oneOf: [field('coBenefits', 'ImpactClaim.coBenefits')], readOnly: false },
        plainField: field('plainField', null),
        nestedGroup: {
            title: 'nestedGroup',
            type: 'object',
            $comment: comment({ term: 'nestedGroup' }),
            properties: {
                nestedRef: field('nestedRef', 'CheckpointResult.linkToVerificationData')
            }
        },
        checkpoints: {
            title: 'checkpoints',
            type: 'array',
            $comment: comment({ term: 'checkpoints' }),
            items: {
                type: 'object',
                properties: {
                    spanPackage: field('spanPackage', 'ImpactClaimCheckpoint.spanDataPackage'),
                    itemExtensions: field('itemExtensions', 'ImpactClaimCheckpoint.mrvExtensions')
                }
            }
        }
    }
});

const propertyOf = (node) => {
    try {
        return JSON.parse(node.$comment || '{}').property;
    } catch {
        return undefined;
    }
};

const byFrom = (entries) => Object.fromEntries(entries.map((e) => [e.from, e.to]));

describe('IwaVersion', () => {
    it('exposes v1 and v3', () => {
        assert.equal(IwaVersion.V1, '1.0.0');
        assert.equal(IwaVersion.V3, '3.0.0');
    });

    it('defaults new schemas to v3', () => {
        assert.equal(DEFAULT_IWA_VERSION, IwaVersion.V3);
    });
});

describe('resolveIwaVersion', () => {
    it('reads an untagged schema as v1, never as the create-default', () => {
        assert.equal(resolveIwaVersion(undefined), IwaVersion.V1);
        assert.equal(resolveIwaVersion(null), IwaVersion.V1);
        assert.equal(resolveIwaVersion({}), IwaVersion.V1);
        assert.equal(resolveIwaVersion({ iwaVersion: undefined }), IwaVersion.V1);
    });

    it('honours an explicit tag', () => {
        assert.equal(resolveIwaVersion({ iwaVersion: '1.0.0' }), IwaVersion.V1);
        assert.equal(resolveIwaVersion({ iwaVersion: '3.0.0' }), IwaVersion.V3);
    });

    it('falls back to v1 for an unrecognised value', () => {
        assert.equal(resolveIwaVersion({ iwaVersion: '9.9.9' }), IwaVersion.V1);
        assert.equal(resolveIwaVersion({ iwaVersion: '' }), IwaVersion.V1);
    });
});

describe('mapIwaPathV1ToV3', () => {
    it('leaves a path unchanged when both versions share it', () => {
        assert.equal(mapIwaPathV1ToV3('ActivityImpactModule.name'), 'ActivityImpactModule.name');
        assert.equal(mapIwaPathV1ToV3('ClaimSource.sourceIdentifier'), 'ClaimSource.sourceIdentifier');
    });

    it('renames a field within its entity', () => {
        assert.equal(mapIwaPathV1ToV3('Address.zip'), 'Address.postalCode');
        assert.equal(mapIwaPathV1ToV3('ProcessedClaim.vpaId'), 'ProcessedClaim.opaId');
        assert.equal(mapIwaPathV1ToV3('REC.recType'), 'REC.type');
    });

    it('moves a field to a different entity', () => {
        assert.equal(mapIwaPathV1ToV3('AccountableImpactOrganization.country'), 'ActivityImpactModule.country');
        assert.equal(mapIwaPathV1ToV3('AccountableImpactOrganization.region'), 'ActivityImpactModule.region');
        assert.equal(mapIwaPathV1ToV3('CoreCarbonPrinciples.vintage'), 'CRU.vintage');
    });

    it('applies entity renames across every field of that entity', () => {
        assert.equal(mapIwaPathV1ToV3('ImpactClaimCheckpoint.claimId'), 'Checkpoint.claimId');
        assert.equal(mapIwaPathV1ToV3('SdpFile.name'), 'DataFile.name');
        assert.equal(mapIwaPathV1ToV3('VerificationProcessAgreement.signatories'), 'OriginationProcessAgreement.signatories');
    });

    it('collapses the MRV extension family onto entityExtensions', () => {
        assert.equal(mapIwaPathV1ToV3('ClaimSource.mrvExtensions'), 'ClaimSource.entityExtensions');
        assert.equal(mapIwaPathV1ToV3('Manifest.mrvExtensions'), 'Manifest.entityExtensions');
    });

    it('lets an explicit path rename win over the entity rule', () => {
        // The entity rule alone would give Checkpoint.spanDataPackage.
        assert.equal(mapIwaPathV1ToV3('ImpactClaimCheckpoint.spanDataPackage'), 'Checkpoint.dataPackages');
        // Both entity and field rules apply here.
        assert.equal(mapIwaPathV1ToV3('ImpactClaimCheckpoint.mrvExtensions'), 'Checkpoint.entityExtensions');
        // This one moves to a different entity than its own rename.
        assert.equal(mapIwaPathV1ToV3('ImpactClaimCheckpoint.verifiedLinkToCheckpointData'), 'DataPackage.verifiedLinkToCheckpointData');
    });

    it('returns null for properties v3 removed', () => {
        assert.equal(mapIwaPathV1ToV3('MrvExtension.typedExtension'), null);
        assert.equal(mapIwaPathV1ToV3('TypedExtension.dataSchema'), null);
        assert.equal(mapIwaPathV1ToV3('UntypedExtension.name'), null);
        assert.equal(mapIwaPathV1ToV3('DataExtension.key'), null);
        assert.equal(mapIwaPathV1ToV3('Any.typeUrl'), null);
        assert.equal(mapIwaPathV1ToV3('Timestamp.seconds'), null);
    });

    it('returns null for dropped back-references', () => {
        assert.equal(mapIwaPathV1ToV3('ImpactClaim.activityImpactModule'), null);
        assert.equal(mapIwaPathV1ToV3('ProcessedClaim.impactClaim'), null);
        assert.equal(mapIwaPathV1ToV3('ActivityImpactModule.accountableImpactOrganization'), null);
    });

    it('returns null for an empty or missing path', () => {
        assert.equal(mapIwaPathV1ToV3(''), null);
        assert.equal(mapIwaPathV1ToV3(undefined), null);
        assert.equal(mapIwaPathV1ToV3(null), null);
    });

    it('leaves a path with no entity separator alone', () => {
        assert.equal(mapIwaPathV1ToV3('bareValue'), 'bareValue');
    });

    it('is idempotent — a v3 path fed back through is unchanged', () => {
        for (const path of [
            'Address.postalCode',
            'ActivityImpactModule.country',
            'Checkpoint.dataPackages',
            'ProcessedClaim.opaId',
            'OriginationProcessAgreement.signatories'
        ]) {
            assert.equal(mapIwaPathV1ToV3(path), path, `${path} should not be rewritten twice`);
        }
    });
});

describe('SchemaHelper.remapIwaPropertiesToV3 — report', () => {
    it('buckets every mapped field as renamed, unchanged or unmappable', () => {
        const report = SchemaHelper.remapIwaPropertiesToV3(buildDocument(), false);

        assert.equal(report.renamed.length, 6);
        assert.equal(report.unchanged.length, 1);
        assert.equal(report.unmappable.length, 1);
    });

    it('reports renames reached through nested objects and array items', () => {
        const renamed = byFrom(SchemaHelper.remapIwaPropertiesToV3(buildDocument(), false).renamed);

        assert.equal(renamed['Address.zip'], 'Address.postalCode');
        assert.equal(renamed['AccountableImpactOrganization.country'], 'ActivityImpactModule.country');
        assert.equal(renamed['ImpactClaim.coBenefits'], 'ImpactClaim.co-benefits');
        // nested object
        assert.equal(renamed['CheckpointResult.linkToVerificationData'], 'CheckpointResult.verifiedLinkToProcessDataResult');
        // array items
        assert.equal(renamed['ImpactClaimCheckpoint.spanDataPackage'], 'Checkpoint.dataPackages');
        assert.equal(renamed['ImpactClaimCheckpoint.mrvExtensions'], 'Checkpoint.entityExtensions');
    });

    it('names the field each entry came from', () => {
        const report = SchemaHelper.remapIwaPropertiesToV3(buildDocument(), false);
        const fields = report.renamed.map((e) => e.field);

        assert.ok(fields.includes('postalCode'));
        assert.ok(fields.includes('nestedGroup.nestedRef'), 'nested field path should be dot-joined');
        assert.ok(fields.includes('checkpoints.spanPackage'), 'array item path should be dot-joined');
    });

    it('reports a removed property with a null target rather than rewriting it', () => {
        const report = SchemaHelper.remapIwaPropertiesToV3(buildDocument(), false);
        const gone = report.unmappable.find((e) => e.from === 'MrvExtension.typedExtension');

        assert.ok(gone, 'MrvExtension.typedExtension should be reported as unmappable');
        assert.equal(gone.to, null);
    });

    it('ignores fields that carry no IWA property', () => {
        const report = SchemaHelper.remapIwaPropertiesToV3(buildDocument(), false);
        const all = [...report.renamed, ...report.unchanged, ...report.unmappable];

        assert.equal(all.filter((e) => e.field === 'plainField').length, 0);
    });
});

describe('SchemaHelper.remapIwaPropertiesToV3 — preview does not mutate', () => {
    it('leaves the document byte-identical when apply is false', () => {
        const document = buildDocument();
        const before = JSON.stringify(document);

        SchemaHelper.remapIwaPropertiesToV3(document, false);

        assert.equal(JSON.stringify(document), before);
    });
});

describe('SchemaHelper.remapIwaPropertiesToV3 — apply', () => {
    it('rewrites top-level, nested, array-item and oneOf properties', () => {
        const document = buildDocument();
        SchemaHelper.remapIwaPropertiesToV3(document, true);
        const p = document.properties;

        assert.equal(propertyOf(p.postalCode), 'Address.postalCode');
        assert.equal(propertyOf(p.orgCountry), 'ActivityImpactModule.country');
        assert.equal(propertyOf(p.coBenefits.oneOf[0]), 'ImpactClaim.co-benefits');
        assert.equal(propertyOf(p.nestedGroup.properties.nestedRef), 'CheckpointResult.verifiedLinkToProcessDataResult');
        assert.equal(propertyOf(p.checkpoints.items.properties.spanPackage), 'Checkpoint.dataPackages');
        assert.equal(propertyOf(p.checkpoints.items.properties.itemExtensions), 'Checkpoint.entityExtensions');
    });

    it('leaves an unchanged property alone', () => {
        const document = buildDocument();
        SchemaHelper.remapIwaPropertiesToV3(document, true);

        assert.equal(propertyOf(document.properties.projectTitle), 'ActivityImpactModule.name');
    });

    it('clears a property v3 removed', () => {
        const document = buildDocument();
        SchemaHelper.remapIwaPropertiesToV3(document, true);

        assert.equal(propertyOf(document.properties.legacyExtension), undefined);
    });

    it('preserves the rest of the $comment when rewriting a property', () => {
        const document = buildDocument();
        SchemaHelper.remapIwaPropertiesToV3(document, true);
        const parsed = JSON.parse(document.properties.postalCode.$comment);

        assert.equal(parsed.property, 'Address.postalCode');
        assert.equal(parsed.term, 'postalCode');
        assert.equal(parsed['@id'], 'https://www.schema.org/text');
        assert.equal(parsed.orderPosition, 0);
        assert.equal(parsed.isPrivate, false);
    });

    it('preserves the rest of the $comment when clearing a removed property', () => {
        const document = buildDocument();
        SchemaHelper.remapIwaPropertiesToV3(document, true);
        const parsed = JSON.parse(document.properties.legacyExtension.$comment);

        assert.ok(!('property' in parsed));
        assert.equal(parsed.term, 'legacyExtension');
    });

    it('leaves a field with no property untouched', () => {
        const document = buildDocument();
        const before = document.properties.plainField.$comment;

        SchemaHelper.remapIwaPropertiesToV3(document, true);

        assert.equal(document.properties.plainField.$comment, before);
    });

    it('is idempotent — a second apply changes nothing', () => {
        const document = buildDocument();
        SchemaHelper.remapIwaPropertiesToV3(document, true);
        const afterFirst = JSON.stringify(document);

        const second = SchemaHelper.remapIwaPropertiesToV3(document, true);

        assert.equal(JSON.stringify(document), afterFirst);
        assert.equal(second.renamed.length, 0);
        assert.equal(second.unmappable.length, 0);
    });
});

describe('SchemaHelper.remapIwaPropertiesToV3 — malformed input', () => {
    it('returns an empty report for a document with no properties', () => {
        for (const document of [null, undefined, {}, { properties: null }, { properties: {} }]) {
            const report = SchemaHelper.remapIwaPropertiesToV3(document, false);

            assert.deepEqual(report, { unchanged: [], renamed: [], unmappable: [] });
        }
    });

    it('skips a field whose $comment is not valid JSON', () => {
        const document = {
            properties: {
                broken: { type: 'string', $comment: '{ not json' },
                good: field('good', 'Address.zip')
            }
        };

        const report = SchemaHelper.remapIwaPropertiesToV3(document, true);

        assert.equal(report.renamed.length, 1);
        assert.equal(report.renamed[0].from, 'Address.zip');
        assert.equal(document.properties.broken.$comment, '{ not json');
    });

    it('skips a field with no $comment at all', () => {
        const document = { properties: { bare: { type: 'string' } } };

        const report = SchemaHelper.remapIwaPropertiesToV3(document, false);

        assert.equal(report.renamed.length + report.unchanged.length + report.unmappable.length, 0);
    });
});
