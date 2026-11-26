/**
 * Real JSON Schema validation for the VM0010 slice.
 *
 * Closes the gap that allowed a required input (nonCo2Gases) to be silently
 * deleted from project-description.schema.json: the harness previously only
 * checked that schema IRIs resolved to a parseable file, never that documents
 * actually satisfied their schema, and never that the inputs consumed by the
 * embedded logic were declared at all.
 *
 * Four layers:
 *   1. every schema is internally consistent (required subset of properties,
 *      every $ref resolves, $id matches the packaged filename)
 *   2. every schema fixture used by the slice validates against its schema
 *   3. every property the embedded logic reads is declared in the schema
 *   4. regression controls proving a dropped/invalid required input is caught
 *
 * The repository's approved validator is ajv (common/src/hedera-modules/vcjs/
 * vcjs.ts), but it is not installed in this workspace. Each layer below
 * therefore runs the dependency-free validator, and additionally asserts that
 * ajv agrees whenever ajv happens to be resolvable.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, loadSlicePolicy, walkBlocks, asDocument } from './_artifact.mjs';
import { makeValidator, validateWithAjvIfAvailable } from './_schema-validator.mjs';

const { policy, schemas } = loadSlicePolicy();

const LOGIC_FILES = [
    'logic/calculate-c-fuel.js',
    'logic/calculate-carbon-stocks-811.js',
    'logic/calculate-deadwood-812.js',
    'logic/calculate-woodproducts-813.js',
    'logic/calculate-rsd-812.js',
    'logic/calculate-infra-812.js',
    'logic/calculate-extracted-813.js',
    'logic/calculate-plot-volume-811.js',
];

function fixtures() {
    return {
        '#project-description': {
            id: 'vm0010-schema-test',
            projectName: 'Schema Test Forest',
            monitoringYear: 2026,
            baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
            fuelInputs: [
                { fuelType: 'Diesel', source: 'E_HARVEST', ipccEmissionFactor: 74100, heatingValue: 0.043, density: 840, consumptionKl: 120 },
            ],
            strata: [
                { species: 1, stratum: 1, vExJiBsl: 30, vExInfJiBsl: 2, bcefR: 1.43, dJ: 0.6, cfJ: 0.47 },
            ],
            infrastructureBiomass: [
                { species: 1, stratum: 1, vNotExInfJiBsl: 5, bcefR: 1.43, cfJ: 0.47 },
            ],
            residualStandDamage: [
                { species: 1, stratum: 1, cExJiBsl: 9.024, fRsdBsl: 1.74 },
            ],
            woodProducts: [
                {
                    stratum: 1, parcel: 1, cWpJiBsl: 10,
                    classes: [
                        { productClass: 'sawnwood', ofK: 0.39 },
                        { productClass: 'woodbasePanels', ofK: 0.62 },
                    ],
                },
            ],
            deadWood: [
                { species: 1, stratum: 1, parcel: 1, cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, cNotHbInfJiBsl: 0.3 },
            ],
        },
        '#baseline-fossil-fuel-emissions': {
            ref: 'vm0010-schema-test',
            year: 2026,
            emissionSources: { E_HARVEST: 1, E_HAULING: 1, E_TRANSPORT: 1, E_PROCESSING: 1 },
            emissionSourceDetail: { E_HARVEST: [], E_HAULING: [], E_TRANSPORT: [], E_PROCESSING: [] },
            sumEmissionsTco2e: 4,
            cFuelTco2e: 4,
        },
        '#extracted-813': {
            ref: 'vm0010-schema-test',
            year: 2026,
            rows: [{ stratum: 1, species: [1, 2], cExJiBsl: [9.024, 4.5], cExIBsl: 13.524 }],
            sumOfStrataTotalsTC: 13.524,
        },
        '#infra-812': {
            ref: 'vm0010-schema-test',
            year: 2026,
            rows: [{ species: 1, stratum: 1, vNotExInfJiBsl: 5, bcefR: 1.43, cfJ: 0.47, cNotHbInfJiBsl: 3.3605 }],
            totalCNotHbInfTCo2eHa: 3.3605,
        },
        '#rsd-812': {
            ref: 'vm0010-schema-test',
            year: 2026,
            rows: [{ species: 1, stratum: 1, cExJiBsl: 9.024, fRsdBsl: 1.74, cRsdJiBsl: 15.70176 }],
            section91FRsdValueAppliedTable: [
                { fRsd: 1.74, commercialLogLengthM: 22, country: 'Congo', reference: 'Brown et al. (2005)' },
                { fRsd: 2.30, commercialLogLengthM: 17, country: 'Malaysia', reference: 'Pinard and Putz (1996)' },
                { fRsd: 2.78, commercialLogLengthM: 10.8, country: 'Belize', reference: 'Brown et al. (2005)' },
                { fRsd: 3.10, commercialLogLengthM: 9.8, country: 'Bolivia', reference: 'Pearson et al. (2005)' },
            ],
        },
        '#wood-products-813': {
            ref: 'vm0010-schema-test',
            year: 2026,
            rows: [{
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [
                    { productClass: 'sawnwood', ofK: 0.39, termTCo2eHa: 3.9 },
                    { productClass: 'woodbasePanels', ofK: 0.62, termTCo2eHa: 6.2 },
                ],
                dCWp100JiPBsl: 10.1,
            }],
            totalDCWp100TCo2eHa: 10.1,
            section91OfDefaults: {
                sawnwood: { boreal: 0.39, temperate: 0.62, tropical: 0.86 },
                woodbasePanels: { boreal: 0.62, temperate: 0.86, tropical: 0.98 },
                otherIndustrialRoundwood: { boreal: 0.86, temperate: 0.98, tropical: 0.99 },
                paperAndPaperboard: { boreal: 0.39, temperate: 0.62, tropical: 0.99 },
            },
            section91OfRegions: ['boreal', 'temperate', 'tropical'],
        },
        '#deadwood-812': {
            ref: 'vm0010-schema-test',
            year: 2026,
            fD: 1,
            rows: [{
                species: 1, stratum: 1, parcel: 1,
                cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, cNotHbInfJiBsl: 0.3,
                cRsdDerivedFrom: null,
                slashFromHarvestTCo2eHa: 12.4832, totalBeforeDecayTCo2eHa: 13.2832, dCDwslashJiPBsl: 13.2832,
            }],
            totalDCDwslashTCo2eHa: 13.2832,
        },
        '#carbon-stocks-811': {
            ref: 'vm0010-schema-test',
            year: 2026,
            strata: [{
                species: 1, stratum: 1,
                vExJiBsl: 30, vExInfJiBsl: 2, extractedVolume: 32,
                bcefR: 1.43, dJ: 0.6, cfJ: 0.47,
                cHbJiBsl: 21.5072, cExJiBsl: 9.024,
            }],
            totalCHbJiBsl: 21.5072,
            totalCExJiBsl: 9.024,
        },
    };
}

function subjectDefs(schema) {
    const doc = schema.document;
    return Object.values(doc.defs)[0];
}

/** The VC document itself, as the schemas describe it (asDocument wraps it in an envelope). */
function vc(subject) {
    return asDocument(subject).document;
}

// ---------------------------------------------------------------- layer 1

test('every packaged schema is internally consistent', () => {
    assert.ok(schemas.size >= 3, `expected the slice schemas, got ${schemas.size}`);
    for (const [iri, schema] of schemas) {
        assert.equal(schema.iri, iri, `${iri}: iri must match the packaged filename`);
        assert.equal(schema.document.$id, iri, `${iri}: document $id must match iri`);
        assert.ok(schema.document.defs, `${iri}: must declare defs`);

        const def = subjectDefs(schema);
        for (const key of def.required || []) {
            assert.ok(
                Object.prototype.hasOwnProperty.call(def.properties, key),
                `${iri}: required "${key}" is not declared in properties`,
            );
        }
    }
});

test('every $ref in every packaged schema resolves', () => {
    for (const [iri, schema] of schemas) {
        const refs = [];
        (function collect(node) {
            if (!node || typeof node !== 'object') return;
            if (typeof node.$ref === 'string') refs.push(node.$ref);
            for (const v of Object.values(node)) collect(v);
        })(schema.document);
        for (const ref of refs) {
            assert.ok(ref.startsWith('#'), `${iri}: only local refs expected, got ${ref}`);
            assert.ok(
                Object.prototype.hasOwnProperty.call(schema.document.defs, ref.slice(1)),
                `${iri}: unresolvable $ref ${ref}`,
            );
        }
    }
});

// ---------------------------------------------------------------- layer 2

test('every slice fixture validates against its schema', () => {
    const docs = fixtures();
    for (const [iri, subject] of Object.entries(docs)) {
        const schema = schemas.get(iri);
        assert.ok(schema, `no packaged schema for ${iri}`);

        // The schema root describes a whole VC document, so validate the form
        // Guardian actually delivers: { @context, type, credentialSubject }.
        const asVc = vc(subject);
        const errors = makeValidator(schema)(asVc);
        assert.deepEqual(errors, [], `${iri}: fixture must validate, got ${JSON.stringify(errors)}`);

        // The bare credentialSubject must also validate against the subject def.
        const subjectErrors = makeValidator({ document: subjectDefs(schema) })(subject);
        assert.deepEqual(subjectErrors, [], `${iri}: credentialSubject must validate, got ${JSON.stringify(subjectErrors)}`);
    }
});

test('ajv agrees with the dependency-free validator when it is installed', async (t) => {
    const schema = schemas.get('#project-description');
    const subject = fixtures()['#project-description'];
    const subjectDef = subjectDefs(schema);
    const result = await validateWithAjvIfAvailable({ document: subjectDef }, subject);
    if (result === null) {
        t.skip('ajv is declared in common/ and interfaces/ but not installed in this workspace');
        return;
    }
    assert.equal(result.validator, 'ajv');
    assert.deepEqual(result.errors, [], `ajv rejected the fixture: ${JSON.stringify(result.errors)}`);
});

// ---------------------------------------------------------------- layer 3

test('every property read by the embedded logic is declared in the schema', () => {
    // This is the invariant whose absence let nonCo2Gases vanish undetected.
    for (const file of LOGIC_FILES) {
        const source = readFileSync(join(SLICE_DIR, file), 'utf8');

        // properties read off the submitted project document, e.g. "project.strata"
        const read = new Set();
        for (const m of source.matchAll(/\bproject\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
            read.add(m[1]);
        }
        assert.ok(read.size > 0, `${file}: expected to read project properties`);

        const def = subjectDefs(schemas.get('#project-description'));
        for (const prop of read) {
            assert.ok(
                Object.prototype.hasOwnProperty.call(def.properties, prop),
                `${file} reads project.${prop} but it is not declared in project-description.schema.json`,
            );
        }
    }
});

test('no slice logic reads nonCo2Gases, and it is correctly absent from the schema', () => {
    // nonCo2Gases was consumed only by the Appendix 1 Eq 47 calculation, which
    // is not part of the current implementation. It must therefore be absent
    // from both the schema and the logic - not half-present.
    const def = subjectDefs(schemas.get('#project-description'));
    assert.ok(
        !Object.prototype.hasOwnProperty.call(def.properties, 'nonCo2Gases'),
        'nonCo2Gases must not be declared while nothing consumes it',
    );
    assert.ok(
        !(def.required || []).includes('nonCo2Gases'),
        'nonCo2Gases must not be required while nothing consumes it',
    );
    for (const file of LOGIC_FILES) {
        const source = readFileSync(join(SLICE_DIR, file), 'utf8');
        assert.ok(!source.includes('nonCo2Gases'), `${file} must not read nonCo2Gases`);
    }
});

test('every output field the logic emits is declared in its output schema', () => {
    const mapping = [
        ['logic/calculate-biomass-factors.js', '#biomass-factors'],
        ['logic/calculate-c-fuel.js', '#baseline-fossil-fuel-emissions'],
        ['logic/calculate-carbon-stocks-811.js', '#carbon-stocks-811'],
        ['logic/calculate-deadwood-812.js', '#deadwood-812'],
        ['logic/calculate-extracted-813.js', '#extracted-813'],
        ['logic/calculate-fire-disturbance-822.js', '#fire-disturbance-822'],
        ['logic/calculate-fuel-factors.js', '#fuel-factors'],
        ['logic/calculate-hauling-fuel-814.js', '#hauling-fuel-814'],
        ['logic/calculate-infra-812.js', '#infra-812'],
        ['logic/calculate-infrastructure-inputs.js', '#infrastructure-inputs'],
        ['logic/calculate-net-benefits-84.js', '#net-benefits-84'],
        ['logic/calculate-non-co2-emission-factor.js', '#non-co2-emission-factor'],
        ['logic/calculate-plot-volume-811.js', '#plot-volume-811'],
        ['logic/calculate-processing-energy-814.js', '#processing-energy-814'],
        ['logic/calculate-project-stocks-821.js', '#project-stocks-821'],
        ['logic/calculate-rsd-812.js', '#rsd-812'],
        ['logic/calculate-transport-fuel-814.js', '#transport-fuel-814'],
        ['logic/calculate-uncertainty-85.js', '#uncertainty'],
        ['logic/calculate-vcus-86.js', '#vcus-86'],
        ['logic/calculate-woodproducts-813.js', '#wood-products-813'],
        ['logic/vm0010-unit-conversion.js', '#vm0010-unit-conversion'],
    ];
    for (const [file, iri] of mapping) {
        const source = readFileSync(join(SLICE_DIR, file), 'utf8');
        const doneMatch = source.match(/done\(\{([\s\S]*?)\n {4}\}\);/);
        assert.ok(doneMatch, `${file}: could not locate the done({...}) payload`);
        const emitted = new Set();
        for (const line of doneMatch[1].split('\n')) {
            const m = line.match(/^\s{8}([A-Za-z_][A-Za-z0-9_]*)\s*[,:]/);
            if (m) emitted.add(m[1]);
        }
        assert.ok(emitted.size > 0, `${file}: no emitted fields parsed`);

        const def = subjectDefs(schemas.get(iri));
        for (const field of emitted) {
            assert.ok(
                Object.prototype.hasOwnProperty.call(def.properties, field),
                `${file} emits "${field}" but ${iri} does not declare it`,
            );
        }
    }
});

// ---------------------------------------------------------------- layer 4

test('REGRESSION: a dropped required input is caught', () => {
    // Simulates the exact failure that went unnoticed before.
    const schema = schemas.get('#project-description');
    const subject = fixtures()['#project-description'];

    assert.deepEqual(makeValidator(schema)(vc(subject)), [], 'baseline fixture must be valid');

    const dropped = { ...subject };
    delete dropped.strata;
    const errors = makeValidator(schema)(vc(dropped));
    assert.ok(errors.length > 0, 'dropping a required input must produce an error');
    assert.ok(
        errors.some((e) => /missing required property "strata"/.test(e.message)),
        `expected a missing-strata error, got ${JSON.stringify(errors)}`,
    );
});

test('REGRESSION: an undefined required input is caught', () => {
    const schema = schemas.get('#project-description');
    const subject = { ...fixtures()['#project-description'], strata: undefined };
    const errors = makeValidator(schema)(vc(subject));
    assert.ok(errors.length > 0, 'strata: undefined must be rejected');
});

test('REGRESSION: an invalid required input is caught (type, range, enum)', () => {
    const schema = schemas.get('#project-description');
    const base = fixtures()['#project-description'];

    const cases = [
        ['strata not an array', { strata: 'not-an-array' }, /expected type array/],
        ['strata empty', { strata: [] }, /minItems is 1/],
        ['monitoringYear out of range', { monitoringYear: 3000 }, /greater than the maximum of 2200/],
        ['monitoringYear wrong type', { monitoringYear: '2026' }, /expected type integer/],
        ['projectName too short', { projectName: '' }, /minLength 1/],
        ['bad emission source enum', { fuelInputs: [{ fuelType: 'Diesel', source: 'EF_F', ipccEmissionFactor: 1, heatingValue: 1, density: 1, consumptionKl: 1 }] }, /not one of/],
        ['negative consumption', { fuelInputs: [{ fuelType: 'Diesel', source: 'E_HARVEST', ipccEmissionFactor: 1, heatingValue: 1, density: 1, consumptionKl: -1 }] }, /less than the minimum of 0/],
        ['species index out of range', { strata: [{ species: 9, stratum: 1, vExJiBsl: 1, vExInfJiBsl: 1, bcefR: 1, dJ: 1, cfJ: 0.5 }] }, /greater than the maximum of 3/],
        ['cfJ above 1', { strata: [{ species: 1, stratum: 1, vExJiBsl: 1, vExInfJiBsl: 1, bcefR: 1, dJ: 1, cfJ: 2 }] }, /greater than the maximum of 1/],
        ['bcefR zero', { strata: [{ species: 1, stratum: 1, vExJiBsl: 1, vExInfJiBsl: 1, bcefR: 0, dJ: 1, cfJ: 0.5 }] }, /must be greater than 0/],
    ];

    for (const [label, override, pattern] of cases) {
        const errors = makeValidator(schema)(vc({ ...base, ...override }));
        assert.ok(errors.length > 0, `${label}: must be rejected`);
        assert.ok(
            errors.some((e) => pattern.test(e.message)),
            `${label}: expected ${pattern}, got ${JSON.stringify(errors)}`,
        );
    }
});

test('REGRESSION: a schema whose required list loses its property is caught', () => {
    // The half-present failure mode: required still lists a key that has been
    // deleted from properties. JSON Schema itself does not forbid this, so it is
    // the schema-consistency invariant (layer 1) that must catch it - not
    // document validation.
    function consistencyErrors(schema) {
        const def = subjectDefs(schema);
        return (def.required || []).filter(
            (k) => !Object.prototype.hasOwnProperty.call(def.properties, k),
        );
    }

    const pristine = schemas.get('#project-description');
    assert.deepEqual(consistencyErrors(pristine), [], 'shipped schema must be consistent');

    const broken = JSON.parse(JSON.stringify(pristine));
    delete subjectDefs(broken).properties.strata;

    const missing = consistencyErrors(broken);
    assert.deepEqual(missing, ['strata'], 'deleting a declared property must be reported');
});

test('validator is not vacuous: a known-good document produces no errors', () => {
    // Guards against a validator that silently passes everything.
    const schema = schemas.get('#project-description');
    assert.deepEqual(makeValidator(schema)(vc(fixtures()['#project-description'])), []);
    assert.ok(makeValidator(schema)({}).length > 0, 'an empty object must fail required checks');
});
