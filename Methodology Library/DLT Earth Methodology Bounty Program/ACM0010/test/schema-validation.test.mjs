/**
 * Schema validation regression for the ACM0010 slice.
 *
 * Mirrors the proven pattern from VM0010's test/schema-validation.test.mjs:
 * every layer asserts an invariant that would otherwise let a schema defect
 * slip through unnoticed (as happened when VM0010's project-stocks and
 * unit-conversion schemas declared fewer fields than their logic emits).
 *
 * Four layers:
 *   1. every schema is internally consistent (required subset of properties,
 *      every $ref resolves, $id matches the packaged filename)
 *   2. every slice fixture used by the tests validates against its schema
 *   3. every property the embedded logic reads is declared in the schema
 *   4. every output field the logic emits is declared in its output schema
 *
 * Zero dependencies: uses the same dependency-free validator as VM0010's
 * test/_schema-validator.mjs, re-exported here via _artifact.mjs for parity.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, loadSlicePolicy, walkBlocks, asDocument, runExpression } from './_artifact.mjs';
import { makeValidator } from './_schema-validator.mjs';

const { policy, schemas } = loadSlicePolicy();

const LOGIC_FILES = ['logic/calculate-baseline-ch4.js'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function subjectDefs(schema) {
    const doc = schema.document;
    return Object.values(doc.defs)[0];
}

function vc(subject) {
    return asDocument(subject).document;
}

/** Pull the customLogicBlock expression straight out of the built artifact. */
function calcExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.tag === 'acm0010_calculate_baseline_ch4') {
            found = node.expression;
        }
    });
    assert.ok(found, 'customLogicBlock expression must exist in the artifact');
    return found;
}

// Fixture shaped like a real ACM0010 project description submission. Every
// field required by project-description.schema.json is present.
const projectDescriptionFixture = {
    id: 'acm0010-schema-test',
    projectName: 'Schema Test Farm',
    projectDescription: 'ACM0010 manure management slice',
    projectStartDate: '2026-01-01',
    creditPeriodStart: '2026-01-01',
    creditPeriodEnd: '2036-01-01',
    projectProponents: ['Schema Test Farm Ltd'],
    standardTemplate: 'VCS',
    standardTemplateName: 'Verified Carbon Standard',
    methodologyTemplateTitle: 'ACM0010 GHG emission reductions from manure management systems',
    methodologyTemplate: 'ACM0010',
    vcsProjectValidatorId: 'VCS-VAL-001',
    ccbProjectValidatorId: 'CCB-VAL-001',
    ccbStandardName: 'CCB Gold Level',
    ccbDistinctions: ['None'],
    baselineAwms: {
        name: 'Anaerobic Lagoon',
        methaneConversionFactor: 0.1,
        stages: [
            { name: 'Anaerobic Lagoon', methaneConversionFactor: 0.1,
              volatileSolidsReductionFraction: 0.5 },
        ],
    },
    livestock: [
        { type: 'Dairy Cattle', annualVolatileSolids: 87600, maxMethaneProducingCapacity: 0.24 },
    ],
    monitoringYear: 2026,
    parameters: {
        globalWarmingPotentialCh4: 28,
    },
};

// ---------------------------------------------------------------------------
// Layer 1: schema internal consistency
// ---------------------------------------------------------------------------

test('every packaged schema is internally consistent', () => {
    assert.ok(schemas.size >= 1, `expected the slice schemas, got ${schemas.size}`);
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

// ---------------------------------------------------------------------------
// Layer 2: fixtures validate
// ---------------------------------------------------------------------------

test('project description fixture validates against its schema', () => {
    const schema = schemas.get('#project-description');
    assert.ok(schema, 'packaged #project-description schema must exist');
    assert.deepEqual(makeValidator(schema)(vc(projectDescriptionFixture)), [],
        'project description fixture must validate');
});

test('calculation output from the embedded expression validates against its schema', () => {
    const schema = schemas.get('#baseline-emission-reduction-calculation');
    assert.ok(schema, 'packaged #baseline-emission-reduction-calculation schema must exist');
    const result = runExpression(calcExpression(), {
        documents: [asDocument(projectDescriptionFixture)],
    });
    assert.deepEqual(makeValidator(schema)(vc(result)), [],
        'expression output must validate against the calculation schema');
});

// ---------------------------------------------------------------------------
// Layer 3: logic inputs declared in schema
// ---------------------------------------------------------------------------

test('every property read by the embedded logic is declared in the schema', () => {
    const source = readFileSync(join(SLICE_DIR, 'logic', 'calculate-baseline-ch4.js'), 'utf8');

    // properties read off the submitted project document, e.g. "project.strata"
    const read = new Set();
    for (const m of source.matchAll(/\bproject\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
        read.add(m[1]);
    }
    assert.ok(read.size > 0, 'calculate-baseline-ch4.js: expected to read project properties');

    const def = subjectDefs(schemas.get('#project-description'));
    for (const prop of read) {
        assert.ok(
            Object.prototype.hasOwnProperty.call(def.properties, prop),
            `calculate-baseline-ch4.js reads project.${prop} but it is not declared in project-description.schema.json`,
        );
    }
});

// ---------------------------------------------------------------------------
// Layer 4: output fields declared
// ---------------------------------------------------------------------------

test('every output field the logic emits is declared in its output schema', () => {
    // calculate-baseline-ch4.js emits `done(output)` where `output` is a
    // variable, not an inline object literal, so we cannot parse emitted
    // fields from source. Instead, run the expression against a fixture and
    // assert every returned key is declared in the output schema.
    const result = runExpression(calcExpression(), {
        documents: [asDocument(projectDescriptionFixture)],
    });

    const def = subjectDefs(schemas.get('#baseline-emission-reduction-calculation'));
    for (const field of Object.keys(result)) {
        assert.ok(
            Object.prototype.hasOwnProperty.call(def.properties, field),
            `calculate-baseline-ch4.js emits "${field}" but #baseline-emission-reduction-calculation does not declare it`,
        );
    }
});

// ---------------------------------------------------------------------------
// Regression controls
// ---------------------------------------------------------------------------

test('REGRESSION: a dropped required input is caught', () => {
    const schema = schemas.get('#project-description');
    const subject = { ...projectDescriptionFixture };
    delete subject.baselineAwms;
    const errors = makeValidator(schema)(vc(subject));
    assert.ok(errors.length > 0, 'dropping a required input must produce an error');
    assert.ok(
        errors.some((e) => /missing required property "baselineAwms"/.test(e.message)),
        `expected a missing-baselineAwms error, got ${JSON.stringify(errors)}`,
    );
});

test('REGRESSION: an invalid required input is caught (type, range, enum)', () => {
    const schema = schemas.get('#project-description');
    const base = projectDescriptionFixture;

    const cases = [
        ['monitoringYear out of range', { monitoringYear: 3000 }, /greater than the maximum of 2200/],
        ['monitoringYear wrong type', { monitoringYear: '2026' }, /expected type integer/],
        ['projectName too short', { projectName: '' }, /minLength 1/],
        ['MCF above 1', { baselineAwms: { ...base.baselineAwms, methaneConversionFactor: 1.5 } }, /greater than the maximum of 1/],
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

test('validator is not vacuous: a known-good document produces no errors', () => {
    const schema = schemas.get('#project-description');
    assert.deepEqual(makeValidator(schema)(vc(projectDescriptionFixture)), []);
    assert.ok(makeValidator(schema)({}).length > 0, 'an empty object must fail required checks');
});
