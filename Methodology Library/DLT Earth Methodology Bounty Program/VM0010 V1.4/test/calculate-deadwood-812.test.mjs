/**
 * Focused tests for VM0010 v1.4 Section 8.1.2, Equation (5):
 *
 *   dC_DWSLASH,i,p|BSL = d [ C_HB,j,i|BSL - C_EX,j,i|BSL
 *                          + C_RSD,j,i|BSL + C_notHB,INF,j,i|BSL ],  F_D = 1
 *
 * The expression executed here is read back out of the built VM0010.policy.
 *
 * C&C status: NEITHER mandatory 2026 document amends Equation (5). The
 * 4 September 2026 C&C amends Section 4, the Section 8.1 baseline-reassessment
 * narrative, Eq 12/13, Eq 37 and Eqs 40/41. The 11 June 2026 C&C amends only the
 * Section 8.1 baseline-averaging sentence; its Background cites the ten-year
 * dead-wood decay, but that decay is applied in Equations 10 and 11, not here.
 *
 * Equation (6), C_RSD = C_EX * F_RSD, is deliberately NOT implemented, so
 * C_RSD is supplied as an input.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function deadwoodExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.outputSchema === '#deadwood-812') {
            found = node.expression;
        }
    });
    assert.ok(found, 'the Section 8.1.2 Eq (5) customLogicBlock must exist in the artifact');
    return found;
}

function projectDescription(deadWood) {
    return {
        id: 'vm0010-812-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        deadWood: deadWood || [
            {
                species: 1,
                stratum: 1,
                parcel: 1,
                // Section 8.1.1 Eq (3)/(4) results for this row
                cHbJiBsl: 21.5072,
                cExJiBsl: 9.024,
                // Equation (6) result, supplied as an input
                cRsdJiBsl: 0.5,
                cNotHbInfJiBsl: 0.3,
            },
        ],
        strata: [
            { species: 1, stratum: 1, vExJiBsl: 30, vExInfJiBsl: 2, bcefR: 1.43, dJ: 0.6, cfJ: 0.47 },
        ],
    };
}

test('the Section 8.1.2 block is wired to the right schema and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.outputSchema === '#deadwood-812') block = n;
    });
    assert.ok(block, 'policy must contain the Section 8.1.2 Eq (5) customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('Eq (5) matches independent hand-computation', () => {
    const row = { cHb: 21.5072, cEx: 9.024, cRsd: 0.5, cNotHbInf: 0.3 };

    // C_HB - C_EX = 12.4832 ; + 0.5 + 0.3 = 13.2832 tC/ha ; F_D = 1
    const slash = row.cHb - row.cEx;
    const expected = slash + row.cRsd + row.cNotHbInf;

    assert.ok(Math.abs(slash - 12.4832) < 1e-12, `slash ${slash}`);
    assert.ok(Math.abs(expected - 13.2832) < 1e-12, `total ${expected}`);

    const result = runExpression(deadwoodExpression(), { documents: [asDocument(projectDescription())] });
    assert.equal(result.ref, 'vm0010-812-test');
    assert.equal(result.year, 2026);

    const out = result.rows[0];
    assert.equal(out.species, 1);
    assert.equal(out.stratum, 1);
    assert.equal(out.parcel, 1);
    assert.ok(Math.abs(out.slashFromHarvestTCo2eHa - slash) < 1e-12);
    assert.ok(Math.abs(out.totalBeforeDecayTCo2eHa - expected) < 1e-12);
    assert.ok(Math.abs(out.dCDwslashJiPBsl - expected) < 1e-12, `dC ${out.dCDwslashJiPBsl}`);
    assert.ok(Math.abs(result.totalDCDwslashTCo2eHa - expected) < 1e-12);
});

test('F_D is 1 and no decay is applied at Equation (5)', () => {
    const result = runExpression(deadwoodExpression(), { documents: [asDocument(projectDescription())] });
    assert.equal(result.fD, 1, 'F_D is dimensionless and fixed at 1');
    // The ten-year linear decay belongs to Equations 10 and 11, so the Eq (5)
    // result must equal the undiscounted three-term sum exactly.
    const out = result.rows[0];
    assert.equal(out.dCDwslashJiPBsl, out.totalBeforeDecayTCo2eHa);
});

test('the harvested-minus-extracted term is signed', () => {
    // C_RSD and C_notHB,INF are additions; C_EX is subtracted. If the sign of
    // the harvested/extracted pair were flipped the total would differ.
    const base = {
        species: 1, stratum: 1, parcel: 1,
        cHbJiBsl: 10, cExJiBsl: 4, cRsdJiBsl: 1, cNotHbInfJiBsl: 1,
    };
    const correct = runExpression(deadwoodExpression(), { documents: [asDocument(projectDescription([base]))] });
    assert.equal(correct.rows[0].dCDwslashJiPBsl, (10 - 4) + 1 + 1); // 8

    const flipped = runExpression(deadwoodExpression(), {
        documents: [asDocument(projectDescription([{ ...base, cHbJiBsl: 4, cExJiBsl: 10 }]))],
    });
    // negative slash is arithmetically possible; the equation must still follow
    // C_HB - C_EX rather than clamping
    assert.equal(flipped.rows[0].slashFromHarvestTCo2eHa, 4 - 10);
    assert.equal(flipped.rows[0].dCDwslashJiPBsl, (4 - 10) + 1 + 1); // -4
});

test('zero inputs yield zero change in dead wood', () => {
    const result = runExpression(deadwoodExpression(), {
        documents: [asDocument(projectDescription([{
            species: 1, stratum: 1, parcel: 1,
            cHbJiBsl: 0, cExJiBsl: 0, cRsdJiBsl: 0, cNotHbInfJiBsl: 0,
        }]))],
    });
    assert.equal(result.rows[0].slashFromHarvestTCo2eHa, 0);
    assert.equal(result.rows[0].dCDwslashJiPBsl, 0);
    assert.equal(result.totalDCDwslashTCo2eHa, 0);
});

test('all residual stand damage and infrastructure carbon is picked up', () => {
    const result = runExpression(deadwoodExpression(), {
        documents: [asDocument(projectDescription([{
            species: 1, stratum: 1, parcel: 1,
            cHbJiBsl: 20, cExJiBsl: 20, cRsdJiBsl: 2.5, cNotHbInfJiBsl: 1.25,
        }]))],
    });
    // no slash from harvest, but RSD and infrastructure carbon remain
    assert.equal(result.rows[0].slashFromHarvestTCo2eHa, 0);
    assert.equal(result.rows[0].dCDwslashJiPBsl, 3.75);
});

test('multiple species, strata and parcels are summed', () => {
    const rows = [
        { species: 1, stratum: 1, parcel: 1, cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, cNotHbInfJiBsl: 0.3 },
        { species: 2, stratum: 1, parcel: 2, cHbJiBsl: 5, cExJiBsl: 2, cRsdJiBsl: 0, cNotHbInfJiBsl: 1 },
    ];
    const result = runExpression(deadwoodExpression(), {
        documents: [asDocument(projectDescription(rows))],
    });
    const expected = rows.reduce(
        (s, r) => s + (r.cHbJiBsl - r.cExJiBsl) + r.cRsdJiBsl + r.cNotHbInfJiBsl, 0,
    );
    assert.equal(result.rows.length, 2);
    assert.ok(Math.abs(result.totalDCDwslashTCo2eHa - expected) < 1e-12);
});

test('out-of-range indices are rejected', () => {
    const base = { cHbJiBsl: 10, cExJiBsl: 4, cRsdJiBsl: 1, cNotHbInfJiBsl: 1 };

    for (const bad of [0, 4, -1, 2.5]) {
        assert.throws(
            () => runExpression(deadwoodExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: bad, stratum: 1, parcel: 1 }]))],
            }),
            /species j must be 1, 2 or 3/,
            `species ${bad} must be rejected`,
        );
        assert.throws(
            () => runExpression(deadwoodExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: 1, stratum: bad, parcel: 1 }]))],
            }),
            /stratum i must be 1, 2 or 3/,
            `stratum ${bad} must be rejected`,
        );
    }

    // p runs 1..P, so it is only bounded below
    for (const bad of [0, -1, 1.5]) {
        assert.throws(
            () => runExpression(deadwoodExpression(), {
                documents: [asDocument(projectDescription([{ ...base, species: 1, stratum: 1, parcel: bad }]))],
            }),
            /land parcel p must be a positive integer/,
            `parcel ${bad} must be rejected`,
        );
    }
    const large = runExpression(deadwoodExpression(), {
        documents: [asDocument(projectDescription([{ ...base, species: 1, stratum: 1, parcel: 250 }]))],
    });
    assert.equal(large.rows[0].parcel, 250, 'p may exceed 3');
});

test('negative carbon stock inputs are rejected', () => {
    const base = { species: 1, stratum: 1, parcel: 1, cHbJiBsl: 10, cExJiBsl: 4, cRsdJiBsl: 1, cNotHbInfJiBsl: 1 };
    for (const field of ['cHbJiBsl', 'cExJiBsl', 'cRsdJiBsl', 'cNotHbInfJiBsl']) {
        assert.throws(
            () => runExpression(deadwoodExpression(), {
                documents: [asDocument(projectDescription([{ ...base, [field]: -0.1 }]))],
            }),
            /greater than or equal to zero/,
            `${field} = -0.1 must be rejected`,
        );
        assert.throws(
            () => runExpression(deadwoodExpression(), {
                documents: [asDocument(projectDescription([{ ...base, [field]: 'x' }]))],
            }),
            /must be numbers/,
            `${field} = 'x' must be rejected`,
        );
    }
});

test('an empty deadWood list is rejected', () => {
    assert.throws(
        () => runExpression(deadwoodExpression(), { documents: [asDocument(projectDescription([]))] }),
        /at least one species\/stratum\/parcel combination is required/,
    );
});

test('the output satisfies every field required by the output schema', () => {
    const result = runExpression(deadwoodExpression(), { documents: [asDocument(projectDescription())] });
    for (const key of ['ref', 'year', 'fD', 'rows', 'totalDCDwslashTCo2eHa']) {
        assert.ok(key in result, `output missing ${key}`);
    }
    const row = result.rows[0];
    for (const key of ['species', 'stratum', 'parcel', 'cHbJiBsl', 'cExJiBsl', 'cRsdJiBsl',
        'cNotHbInfJiBsl', 'slashFromHarvestTCo2eHa', 'totalBeforeDecayTCo2eHa', 'dCDwslashJiPBsl']) {
        assert.ok(key in row, `row missing ${key}`);
    }
    assert.equal(result.fD, 1);
    assert.ok(row.species >= 1 && row.species <= 3);
    assert.ok(row.stratum >= 1 && row.stratum <= 3);
    assert.ok(row.parcel >= 1);
});
