/**
 * Focused tests for VM0010 v1.4 Section 8.1.2, Equation (7):
 *
 *   C_notHB,INF,j,i|BSL = V_notEX,INF,j,i|BSL * BCEF_R * CF_j
 *
 * The expression executed here is read back out of the built VM0010.policy.
 *
 * Boundary semantics differ per parameter and are deliberate:
 *   V_notEX,INF,j,i|BSL  volume, m3/ha          -> >= 0, may be 0
 *   BCEF_R               biomass conversion and expansion factor, t.d.m/m3 -> > 0, NOT capped at 1
 *   CF_j                 carbon fraction, tC/t.d.m  -> 0 < CF_j <= 1 (mass ratio, cannot exceed unity)
 *
 * C&C status: NEITHER mandatory 2026 document amends Section 8.1.2 Equation (7).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function infraExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.outputSchema === '#infra-812') {
            found = node.expression;
        }
    });
    assert.ok(found, 'the Section 8.1.2 Eq (7) customLogicBlock must exist in the artifact');
    return found;
}

function projectDescription(infrastructureBiomass) {
    return {
        id: 'vm0010-812infra-test',
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
        residualStandDamage: [
            { species: 1, stratum: 1, cExJiBsl: 9.024, fRsdBsl: 1.74 },
        ],
        infrastructureBiomass: infrastructureBiomass || [
            { species: 1, stratum: 1, vNotExInfJiBsl: 5, bcefR: 1.43, cfJ: 0.47 },
        ],
    };
}

test('the Section 8.1.2 Eq (7) block is wired to the right schema and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.outputSchema === '#infra-812') block = n;
    });
    assert.ok(block, 'policy must contain the Eq (7) customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('Eq (7) matches independent hand-computation', () => {
    // 5 m3/ha * 1.43 t.d.m/m3 * 0.47 tC/t.d.m = 7.15 * 0.47 = 3.3605 tC/ha
    const v = 5;
    const a = 1.43;
    const c = 0.47;
    const expected = v * a * c;
    assert.ok(Math.abs(expected - 3.3605) < 1e-12, `expected ${expected}`);

    const result = runExpression(infraExpression(), { documents: [asDocument(projectDescription())] });
    assert.equal(result.ref, 'vm0010-812infra-test');
    assert.equal(result.year, 2026);
    assert.equal(result.rows.length, 1);

    const row = result.rows[0];
    assert.equal(row.species, 1);
    assert.equal(row.stratum, 1);
    assert.equal(row.vNotExInfJiBsl, v);
    assert.equal(row.bcefR, a);
    assert.equal(row.cfJ, c);
    assert.ok(Math.abs(row.cNotHbInfJiBsl - expected) < 1e-12, `C_notHB,INF ${row.cNotHbInfJiBsl}`);
    assert.ok(Math.abs(result.totalCNotHbInfTCo2eHa - expected) < 1e-12);
});

test('the product is order-independent and each factor contributes once', () => {
    // A duplicated or dropped factor would change the result.
    const row = { species: 1, stratum: 1, vNotExInfJiBsl: 4, bcefR: 2, cfJ: 0.5 };
    const result = runExpression(infraExpression(), {
        documents: [asDocument(projectDescription([row]))],
    });
    assert.equal(result.rows[0].cNotHbInfJiBsl, 4);          // 4 * 2 * 0.5
    assert.notEqual(result.rows[0].cNotHbInfJiBsl, 4 * 2);   // not missing CF_j
    assert.notEqual(result.rows[0].cNotHbInfJiBsl, 4 * 0.5); // not missing BCEF_R
});

test('zero volume yields zero carbon stock', () => {
    const result = runExpression(infraExpression(), {
        documents: [asDocument(projectDescription([
            { species: 1, stratum: 1, vNotExInfJiBsl: 0, bcefR: 1.43, cfJ: 0.47 },
        ]))],
    });
    assert.equal(result.rows[0].cNotHbInfJiBsl, 0);
    assert.equal(result.totalCNotHbInfTCo2eHa, 0);
});

test('BCEF_R is a positive multiplier and is NOT capped at 1', () => {
    // Unlike CF_j (a mass ratio, capped at 1), BCEF_R is a biomass conversion
    // and expansion factor in t.d.m/m3 and must be allowed above 1.
    for (const a of [0.5, 1, 1.43, 3.10, 10]) {
        const result = runExpression(infraExpression(), {
            documents: [asDocument(projectDescription([
                { species: 1, stratum: 1, vNotExInfJiBsl: 2, bcefR: a, cfJ: 0.5 },
            ]))],
        });
        assert.equal(result.rows[0].cNotHbInfJiBsl, 2 * a * 0.5, `BCEF_R=${a} must be accepted`);
    }
    assert.throws(
        () => runExpression(infraExpression(), {
            documents: [asDocument(projectDescription([
                { species: 1, stratum: 1, vNotExInfJiBsl: 2, bcefR: 0, cfJ: 0.5 },
            ]))],
        }),
        /BCEF_R must be greater than zero/,
    );
});

test('CF_j is bounded to (0, 1] as a mass ratio', () => {
    const base = { species: 1, stratum: 1, vNotExInfJiBsl: 5, bcefR: 1.43 };

    // boundary 1 is legal
    const one = runExpression(infraExpression(), {
        documents: [asDocument(projectDescription([{ ...base, cfJ: 1 }]))],
    });
    assert.equal(one.rows[0].cNotHbInfJiBsl, 5 * 1.43 * 1);

    for (const bad of [1.5, 0, -0.2]) {
        assert.throws(
            () => runExpression(infraExpression(), {
                documents: [asDocument(projectDescription([{ ...base, cfJ: bad }]))],
            }),
            /CF_j must be greater than zero and not exceed 1/,
            `CF_j=${bad} must be rejected`,
        );
    }
});

test('invalid indices and negative volume are rejected', () => {
    const base = { vNotExInfJiBsl: 5, bcefR: 1.43, cfJ: 0.47 };

    for (const bad of [0, 4, -1, 2.5]) {
        assert.throws(
            () => runExpression(infraExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: bad, stratum: 1 }]))],
            }),
            /species j must be 1, 2 or 3/,
            `species ${bad} must be rejected`,
        );
        assert.throws(
            () => runExpression(infraExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: 1, stratum: bad }]))],
            }),
            /stratum i must be 1, 2 or 3/,
            `stratum ${bad} must be rejected`,
        );
    }

    assert.throws(
        () => runExpression(infraExpression(), {
            documents: [asDocument(projectDescription([{ ...base, species: 1, stratum: 1, vNotExInfJiBsl: -1 }]))],
        }),
        /V_notEX,INF,j,i\|BSL must be greater than or equal to zero/,
    );

    for (const field of ['vNotExInfJiBsl', 'bcefR', 'cfJ']) {
        assert.throws(
            () => runExpression(infraExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: 1, stratum: 1, [field]: 'x' }]))],
            }),
            /must be a number/,
            `${field}='x' must be rejected`,
        );
    }

    assert.throws(
        () => runExpression(infraExpression(), { documents: [asDocument(projectDescription([]))] }),
        /at least one species\/stratum combination is required/,
    );
});

test('multiple species and strata rows are produced and summed', () => {
    const rows = [
        { species: 1, stratum: 1, vNotExInfJiBsl: 5, bcefR: 1.43, cfJ: 0.47 },
        { species: 2, stratum: 2, vNotExInfJiBsl: 1.5, bcefR: 1.6, cfJ: 0.5 },
    ];
    const result = runExpression(infraExpression(), {
        documents: [asDocument(projectDescription(rows))],
    });
    const expected = rows.reduce((s, r) => s + r.vNotExInfJiBsl * r.bcefR * r.cfJ, 0);
    assert.equal(result.rows.length, 2);
    assert.ok(Math.abs(result.totalCNotHbInfTCo2eHa - expected) < 1e-12);
});

test('the output satisfies every field required by the output schema', () => {
    const result = runExpression(infraExpression(), { documents: [asDocument(projectDescription())] });
    for (const key of ['ref', 'year', 'rows', 'totalCNotHbInfTCo2eHa']) {
        assert.ok(key in result, `output missing ${key}`);
    }
    const row = result.rows[0];
    for (const key of ['species', 'stratum', 'vNotExInfJiBsl', 'bcefR', 'cfJ', 'cNotHbInfJiBsl']) {
        assert.ok(key in row, `row missing ${key}`);
    }
    assert.ok(row.bcefR > 0);
    assert.ok(row.cfJ > 0 && row.cfJ <= 1);
    assert.ok(row.vNotExInfJiBsl >= 0);
});
