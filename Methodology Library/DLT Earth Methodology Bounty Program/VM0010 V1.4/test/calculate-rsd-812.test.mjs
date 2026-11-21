/**
 * Focused tests for VM0010 v1.4 Section 8.1.2, Equation (6):
 *
 *   C_RSD,j,i|BSL = C_EX,j,i|BSL * F_RSD|BSL
 *
 * The expression executed here is read back out of the built VM0010.policy.
 *
 * F_RSD fixtures use the Section 9.1 (p. 56) "Value applied" table, sourced to
 * peer-reviewed literature per Section 9.1:
 *   F_RSD (tC_damaged / tC_extracted)  Log length (m)  Country  Reference
 *   1.74                               22              Congo     Brown et al. (2005)
 *   2.30                               17              Malaysia  Pinard and Putz (1996)
 *   2.78                               10.8            Belize    Brown et al. (2005)
 *   3.10                               9.8             Bolivia   Pearson et al. (2005)
 *
 * CRITICAL: every tabulated default EXCEEDS 1, while the Section 9.1 row declares
 * the data unit "Dimensionless". The implementation therefore enforces F_RSD >= 0
 * with NO upper bound of 1. These tests lock that in.
 *
 * C&C status: NEITHER mandatory 2026 document amends Section 8.1.2 Equation (6).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

// Section 9.1 p.56 defaults
const FRSD_DEFAULTS = [
    { fRsd: 1.74, log: 22, country: 'Congo' },
    { fRsd: 2.30, log: 17, country: 'Malaysia' },
    { fRsd: 2.78, log: 10.8, country: 'Belize' },
    { fRsd: 3.10, log: 9.8, country: 'Bolivia' },
];

function rsdExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.outputSchema === '#rsd-812') {
            found = node.expression;
        }
    });
    assert.ok(found, 'the Section 8.1.2 Eq (6) customLogicBlock must exist in the artifact');
    return found;
}

function projectDescription(residualStandDamage) {
    return {
        id: 'vm0010-812rsd-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        deadWood: [
            { species: 1, stratum: 1, parcel: 1, cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, cNotHbInfJiBsl: 0.3 },
        ],
        strata: [
            { species: 1, stratum: 1, vExJiBsl: 30, vExInfJiBsl: 2, bcefR: 1.43, dJ: 0.6, cfJ: 0.47 },
        ],
        woodProducts: [
            {
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [{ productClass: 'sawnwood', ofK: 0.39 }, { productClass: 'woodbasePanels', ofK: 0.62 }],
            },
        ],
        residualStandDamage: residualStandDamage || [
            { species: 1, stratum: 1, cExJiBsl: 9.024, fRsdBsl: FRSD_DEFAULTS[0].fRsd },
        ],
    };
}

test('the Section 8.1.2 Eq (6) block is wired to the right schema and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.outputSchema === '#rsd-812') block = n;
    });
    assert.ok(block, 'policy must contain the Eq (6) customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('Eq (6) matches independent hand-computation', () => {
    // C_EX = 9.024 tC/ha ; F_RSD = 1.74 (Congo) => 9.024 * 1.74 = 15.70176
    const cEx = 9.024;
    const fRsd = FRSD_DEFAULTS[0].fRsd;
    const expected = cEx * fRsd;
    assert.ok(Math.abs(expected - 15.70176) < 1e-12, `expected ${expected}`);

    const result = runExpression(rsdExpression(), { documents: [asDocument(projectDescription())] });
    assert.equal(result.ref, 'vm0010-812rsd-test');
    assert.equal(result.year, 2026);
    assert.equal(result.rows.length, 1);

    const row = result.rows[0];
    assert.equal(row.species, 1);
    assert.equal(row.stratum, 1);
    assert.equal(row.cExJiBsl, cEx);
    assert.equal(row.fRsdBsl, fRsd);
    assert.ok(Math.abs(row.cRsdJiBsl - expected) < 1e-12, `C_RSD ${row.cRsdJiBsl}`);
});

test('every Section 9.1 p.56 default is accepted, including values above 1', () => {
    // This is the load-bearing test: capping F_RSD at 1 would fail here and would
    // reject every methodology default.
    const cEx = 4;
    for (const d of FRSD_DEFAULTS) {
        const result = runExpression(rsdExpression(), {
            documents: [asDocument(projectDescription([
                { species: 1, stratum: 1, cExJiBsl: cEx, fRsdBsl: d.fRsd },
            ]))],
        });
        assert.equal(result.rows[0].fRsdBsl, d.fRsd);
        assert.ok(
            Math.abs(result.rows[0].cRsdJiBsl - cEx * d.fRsd) < 1e-12,
            `${d.country} F_RSD=${d.fRsd} must be accepted`,
        );
        assert.ok(d.fRsd > 1, `${d.country} default is above 1, which must remain legal`);
    }
});

test('the Section 9.1 value-applied table is reported for traceability', () => {
    const result = runExpression(rsdExpression(), { documents: [asDocument(projectDescription())] });
    const table = result.section91FRsdValueAppliedTable;
    assert.ok(Array.isArray(table), 'the Section 9.1 table must be reported');
    assert.equal(table.length, 4);
    assert.equal(
        JSON.stringify(table.map((r) => r.fRsd)),
        JSON.stringify([1.74, 2.3, 2.78, 3.1]),
    );
    assert.equal(table[0].country, 'Congo');
    assert.equal(table[1].country, 'Malaysia');
});

test('zero inputs yield zero residual stand damage', () => {
    const result = runExpression(rsdExpression(), {
        documents: [asDocument(projectDescription([
            { species: 1, stratum: 1, cExJiBsl: 0, fRsdBsl: 1.74 },
        ]))],
    });
    assert.equal(result.rows[0].cRsdJiBsl, 0);

    const zeroFactor = runExpression(rsdExpression(), {
        documents: [asDocument(projectDescription([
            { species: 1, stratum: 1, cExJiBsl: 5, fRsdBsl: 0 },
        ]))],
    });
    assert.equal(zeroFactor.rows[0].cRsdJiBsl, 0, 'F_RSD = 0 is a legal boundary');
});

test('invalid indices and negative inputs are rejected', () => {
    const base = { cExJiBsl: 9.024, fRsdBsl: 1.74 };

    for (const bad of [0, 4, -1, 2.5]) {
        assert.throws(
            () => runExpression(rsdExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: bad, stratum: 1 }]))],
            }),
            /species j must be 1, 2 or 3/,
            `species ${bad} must be rejected`,
        );
        assert.throws(
            () => runExpression(rsdExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: 1, stratum: bad }]))],
            }),
            /stratum i must be 1, 2 or 3/,
            `stratum ${bad} must be rejected`,
        );
    }

    assert.throws(
        () => runExpression(rsdExpression(), {
            documents: [asDocument(projectDescription([{ ...base, cExJiBsl: -1, species: 1, stratum: 1 }]))],
        }),
        /C_EX,j,i\|BSL must be greater than or equal to zero/,
    );
    assert.throws(
        () => runExpression(rsdExpression(), {
            documents: [asDocument(projectDescription([{ ...base, fRsdBsl: -0.1, species: 1, stratum: 1 }]))],
        }),
        /F_RSD\|BSL must be greater than or equal to zero/,
    );
    assert.throws(
        () => runExpression(rsdExpression(), {
            documents: [asDocument(projectDescription([{ ...base, fRsdBsl: 'x', species: 1, stratum: 1 }]))],
        }),
        /F_RSD\|BSL must be a number/,
    );
    assert.throws(
        () => runExpression(rsdExpression(), { documents: [asDocument(projectDescription([]))] }),
        /at least one species\/stratum combination is required/,
    );
});

test('multiple species and strata rows are produced independently', () => {
    const rows = [
        { species: 1, stratum: 1, cExJiBsl: 9.024, fRsdBsl: 1.74 },
        { species: 2, stratum: 2, cExJiBsl: 2, fRsdBsl: 3.10 },
    ];
    const result = runExpression(rsdExpression(), {
        documents: [asDocument(projectDescription(rows))],
    });
    assert.equal(result.rows.length, 2);
    assert.ok(Math.abs(result.rows[0].cRsdJiBsl - 9.024 * 1.74) < 1e-12);
    assert.ok(Math.abs(result.rows[1].cRsdJiBsl - 2 * 3.10) < 1e-12);
    assert.notEqual(result.rows[0].cRsdJiBsl, result.rows[1].cRsdJiBsl);
});

test('the output satisfies every field required by the output schema', () => {
    const result = runExpression(rsdExpression(), { documents: [asDocument(projectDescription())] });
    for (const key of ['ref', 'year', 'rows', 'section91FRsdValueAppliedTable']) {
        assert.ok(key in result, `output missing ${key}`);
    }
    const row = result.rows[0];
    for (const key of ['species', 'stratum', 'cExJiBsl', 'fRsdBsl', 'cRsdJiBsl']) {
        assert.ok(key in row, `row missing ${key}`);
    }
    assert.ok(row.species >= 1 && row.species <= 3);
    assert.ok(row.stratum >= 1 && row.stratum <= 3);
    assert.ok(row.fRsdBsl >= 0);
});
