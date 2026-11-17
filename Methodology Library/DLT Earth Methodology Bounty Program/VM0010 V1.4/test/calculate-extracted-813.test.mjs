/**
 * Focused tests for VM0010 v1.4 Section 8.1.3, Equation (8):
 *
 *   C_EX,i|BSL = SUM over j = 1..J of C_EX,j,i|BSL
 *
 * Equation (8), p. 24. The expression executed here is read back out of the
 * built VM0010.policy.
 *
 * Eq (8) is a sum over tree species j within a stratum i. It contains no
 * WW_k, SLF_k, OF_k and no wood-product class index k, so these tests assert
 * that none of those leak into the result.
 *
 * Boundary semantics:
 *   C_EX,j,i|BSL  carbon stock, tC/ha -> >= 0, may be 0
 *   species j / stratum i  integers in 1..3
 *   duplicate (i, j) rejected: j indexes distinct tree species
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function extractedExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.outputSchema === '#extracted-813') {
            found = node.expression;
        }
    });
    assert.ok(found, 'the Section 8.1.3 Eq (8) customLogicBlock must exist in the artifact');
    return found;
}

/**
 * `strata` carries C_EX,j,i|BSL, which is produced by Equation (4). Only the
 * fields Eq (8) actually reads are supplied here.
 */
function projectDescription(strata) {
    return {
        id: 'vm0010-813extracted-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        deadWood: [
            { species: 1, stratum: 1, parcel: 1, cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, cNotHbInfJiBsl: 0.3 },
        ],
        strata: strata || [
            { species: 1, stratum: 1, vExJiBsl: 30, vExInfJiBsl: 2, bcefR: 1.43, dJ: 0.6, cfJ: 0.47, cExJiBsl: 9.024 },
        ],
        woodProducts: [
            {
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [{ productClass: 'sawnwood', ofK: 0.39 }, { productClass: 'woodbasePanels', ofK: 0.62 }],
            },
        ],
        residualStandDamage: [
            { species: 1, stratum: 1, cExJiBsl: 9.024, fRsdBsl: 1.74 },
        ],
        infrastructureBiomass: [
            { species: 1, stratum: 1, vNotExInfJiBsl: 5, bcefR: 1.43, cfJ: 0.47 },
        ],
    };
}

function run(strata) {
    return runExpression(extractedExpression(), { documents: [asDocument(projectDescription(strata))] });
}

test('the Section 8.1.3 Eq (8) block is wired to the right schema and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.outputSchema === '#extracted-813') block = n;
    });
    assert.ok(block, 'policy must contain the Eq (8) customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('Eq (8) matches an independent hand-computation across three species', () => {
    // Representative case: two species in stratum 1, one in stratum 2.
    const strata = [
        { species: 1, stratum: 1, cExJiBsl: 9.024 },
        { species: 2, stratum: 1, cExJiBsl: 4.5 },
        { species: 3, stratum: 1, cExJiBsl: 1.25 },
        { species: 1, stratum: 2, cExJiBsl: 6.0 },
    ];
    const result = run(strata);

    assert.equal(result.ref, 'vm0010-813extracted-test');
    assert.equal(result.year, 2026);
    assert.equal(result.rows.length, 2, 'one row per stratum');

    const s1 = result.rows[0];
    assert.equal(s1.stratum, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(s1.species)), [1, 2, 3]);
    // 9.024 + 4.5 + 1.25 = 14.774
    assert.ok(Math.abs(s1.cExIBsl - 14.774) < 1e-12, `stratum 1 got ${s1.cExIBsl}`);

    const s2 = result.rows[1];
    assert.equal(s2.stratum, 2);
    assert.deepEqual(JSON.parse(JSON.stringify(s2.species)), [1]);
    assert.ok(Math.abs(s2.cExIBsl - 6.0) < 1e-12);

    assert.ok(Math.abs(result.sumOfStrataTotalsTC - (14.774 + 6.0)) < 1e-12);
});

test('Eq (8) output is invariant to the order of the summands', () => {
    const a = run([
        { species: 1, stratum: 1, cExJiBsl: 3 },
        { species: 2, stratum: 1, cExJiBsl: 5 },
        { species: 3, stratum: 1, cExJiBsl: 7 },
    ]);
    const b = run([
        { species: 3, stratum: 1, cExJiBsl: 7 },
        { species: 1, stratum: 1, cExJiBsl: 3 },
        { species: 2, stratum: 1, cExJiBsl: 5 },
    ]);
    assert.equal(a.rows.length, 1);
    assert.equal(a.rows[0].cExIBsl, 15);
    assert.equal(a.rows[0].cExIBsl, b.rows[0].cExIBsl);
});

test('a single species makes Eq (8) an identity', () => {
    const result = run([{ species: 2, stratum: 3, cExJiBsl: 7.5 }]);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].cExIBsl, 7.5);
});

test('zero summands yield zero for that stratum', () => {
    const result = run([
        { species: 1, stratum: 1, cExJiBsl: 0 },
        { species: 2, stratum: 1, cExJiBsl: 0 },
        { species: 1, stratum: 2, cExJiBsl: 4.25 },
    ]);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].cExIBsl, 0, 'all-zero stratum totals zero');
    assert.equal(result.rows[1].cExIBsl, 4.25);
});

test('Eq (8) emits no WW_k, SLF_k, OF_k or wood-product class', () => {
    // Even when wood-product classes are present in the project description,
    // Equation (8) must range over species j only.
    const result = run([
        { species: 1, stratum: 1, cExJiBsl: 2 },
        { species: 2, stratum: 1, cExJiBsl: 3 },
    ]);
    const serialised = JSON.stringify(result.rows);
    for (const forbidden of ['slf', 'ww', 'ofK', 'productClass', 'other', 'sawnwood', 'panel']) {
        assert.ok(!serialised.toLowerCase().includes(forbidden.toLowerCase()),
            `Eq (8) output must not contain ${forbidden}`);
    }
    // It is a plain sum: no per-class scaling was applied.
    assert.equal(result.rows[0].cExIBsl, 5);
});

test('strata are summed separately, never merged across strata', () => {
    // A merged total would be 10; per-stratum results must stay distinct.
    const result = run([
        { species: 1, stratum: 1, cExJiBsl: 6 },
        { species: 1, stratum: 2, cExJiBsl: 4 },
    ]);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].stratum, 1);
    assert.equal(result.rows[0].cExIBsl, 6);
    assert.equal(result.rows[1].stratum, 2);
    assert.equal(result.rows[1].cExIBsl, 4);
});

test('duplicate species within a stratum is rejected rather than double-counted', () => {
    assert.throws(
        () => run([
            { species: 1, stratum: 1, cExJiBsl: 5 },
            { species: 1, stratum: 1, cExJiBsl: 5 },
        ]),
        /duplicate species j=1 in stratum i=1/,
    );
});

test('the same species may appear in different strata', () => {
    // Rejection above is scoped to (i, j); species 1 in strata 1 and 2 is fine.
    const result = run([
        { species: 1, stratum: 1, cExJiBsl: 2 },
        { species: 1, stratum: 2, cExJiBsl: 3 },
    ]);
    assert.equal(result.rows.length, 2);
});

test('invalid indices, invalid values and an empty set are rejected', () => {
    for (const bad of [0, 4, -1, 2.5]) {
        assert.throws(
            () => run([{ species: bad, stratum: 1, cExJiBsl: 1 }]),
            /species j must be 1, 2 or 3/,
            `species ${bad} must be rejected`,
        );
        assert.throws(
            () => run([{ species: 1, stratum: bad, cExJiBsl: 1 }]),
            /stratum i must be 1, 2 or 3/,
            `stratum ${bad} must be rejected`,
        );
    }

    assert.throws(
        () => run([{ species: 1, stratum: 1, cExJiBsl: -1 }]),
        /C_EX,j,i\|BSL must be greater than or equal to zero/,
    );
    assert.throws(
        () => run([{ species: 1, stratum: 1, cExJiBsl: 'x' }]),
        /C_EX,j,i\|BSL must be a number/,
    );
    assert.throws(() => run([]), /at least one species\/stratum combination is required/);
});

test('the output satisfies every field required by the output schema', () => {
    const result = run([
        { species: 1, stratum: 1, cExJiBsl: 9.024 },
        { species: 2, stratum: 1, cExJiBsl: 4.5 },
    ]);
    for (const key of ['ref', 'year', 'rows', 'sumOfStrataTotalsTC']) {
        assert.ok(key in result, `output missing ${key}`);
    }
    const row = result.rows[0];
    for (const key of ['stratum', 'species', 'cExJiBsl', 'cExIBsl']) {
        assert.ok(key in row, `row missing ${key}`);
    }
    assert.equal(row.species.length, row.cExJiBsl.length, 'species and summand arrays stay aligned');
    assert.ok(row.cExIBsl >= 0);
});

test('Eq (8) is consistent with the Equation (4) values it consumes', () => {
    // Eq (4): C_EX,j,i|BSL = (V_EX,j,i|BSL + V_EX,INF,j,i|BSL) * D_j * CF_j
    // Reproduce Eq (4) by hand and confirm Eq (8) sums exactly those numbers.
    const vEx = 30, vExInf = 2, dJ = 0.6, cfJ = 0.47;
    const eq4 = (vEx + vExInf) * dJ * cfJ;          // 32 * 0.6 * 0.47 = 9.024
    assert.ok(Math.abs(eq4 - 9.024) < 1e-12, `Eq (4) hand value ${eq4}`);

    const strata = [
        { species: 1, stratum: 1, vExJiBsl: vEx, vExInfJiBsl: vExInf, bcefR: 1.43, dJ, cfJ, cExJiBsl: eq4 },
        { species: 2, stratum: 1, cExJiBsl: 2.5 },
    ];
    const result = run(strata);
    assert.ok(Math.abs(result.rows[0].cExIBsl - (eq4 + 2.5)) < 1e-12);
});