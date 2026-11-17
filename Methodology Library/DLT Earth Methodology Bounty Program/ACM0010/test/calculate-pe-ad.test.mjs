/**
 * TOOL14 v03.0 (EB 123 Annex 2) project/leakage emissions from anaerobic digesters
 * as applied by ACM0010 v09 draft 5.4.1/5.5.4.
 * Source: https://cdm.unfccc.int/methodologies/PAmethodologies/tools/am-tool-14-v3.pdf
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExpression, asDocument } from './_artifact.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const logic = readFileSync(join(HERE, '..', 'logic', 'calculate-pe-ad.js'), 'utf8');
const RHO = 0.00067; // tCH4/m3, Table 2
const FCH4 = 0.6;    // Table 1

function base(ad, overrides = {}) {
  return {
    id: 'ad1', projectName: 'AD', monitoringYear: 2026,
    baselineAwms: { name: 'Lagoon', methaneConversionFactor: 0.5 },
    livestock: [{ type: 'Dairy', annualVolatileSolids: 1, maxMethaneProducingCapacity: 0.2 }],
    parameters: { globalWarmingPotentialCh4: 25 },
    anaerobicDigesterActivity: ad,
    ...overrides,
  };
}

test('TOOL14 Eq(1)-(4): PEAD with monitored QCH4, default EFCH4, monitored PEEC/PEFC, no flare', () => {
  const r = runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 100,
    digesterPhysicalLeakType: 'steel_lined_concrete_fiberglass_gas_holder_monolithic', // 0.028
    monitoredPeEcTCo2: 2,
    monitoredPeFcTCo2: 3,
  }))]});
  assert.equal(r.qCh4Tonnes, 100);
  assert.equal(r.qCh4Source, 'monitored_tool08_or_direct');
  assert.ok(Math.abs(r.peCh4TCo2e - 100 * 0.028 * 25) < 1e-12); // Eq4
  assert.ok(Math.abs(r.peEcTCo2 - 2) < 1e-12);
  assert.ok(Math.abs(r.peFcTCo2 - 3) < 1e-12);
  assert.ok(Math.abs(r.peAdTCo2e - (2 + 3 + 100 * 0.028 * 25)) < 1e-12); // Eq1
  assert.equal(r.leAdTCo2e, 0);
});

test('TOOL14 Eq(2),(3): QCH4 from biogas Option 2 and PEEC Option 2 default FEC/EFEl', () => {
  const qBiogas = 100000; // m3
  const qCh4 = qBiogas * FCH4 * RHO; // Eq2
  const r = runExpression(logic, { documents: [asDocument(base({
    biogasVolumeM3PerYearAtReference: qBiogas,
    digesterPhysicalLeakType: 'uasb_floating_gas_holder_no_external_water_seal', // EFCH4 0.05
    digesterElectricityType: 'conventional_cstr_wastewater', // FEC 1.02, EFEl default 1.3
  }))]});
  assert.ok(Math.abs(r.qCh4Tonnes - qCh4) < 1e-12);
  assert.ok(Math.abs(r.peEcTCo2 - qCh4 * 1.02 * 1.3) < 1e-9); // Eq3
  assert.ok(Math.abs(r.peCh4TCo2e - qCh4 * 0.05 * 25) < 1e-9);
});

test('TOOL14 Eq(5),(7): liquid digestate storage leakage Option 2', () => {
  const r = runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 50,
    digesterPhysicalLeakType: 'unknown', // 0.10
    noElectricityConsumption: true,
    liquidDigestateStorage: { anaerobicStorage: true, fwwCh4DefaultType: 'covered_anaerobic_lagoon' }, // 0.10
  }))]});
  assert.ok(Math.abs(r.leStorageTCo2e - 0.10 * 50 * 25) < 1e-12);
  assert.equal(r.leCompTCo2e, 0);
  assert.ok(Math.abs(r.leAdTCo2e - 0.10 * 50 * 25) < 1e-12);
});

test('TOOL14 Eq(5),(8): solid digestate SWDS leakage Option 2 and composting direct input', () => {
  const r = runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 20,
    digesterPhysicalLeakType: 'unknown',
    noElectricityConsumption: true,
    solidDigestateStorage: { disposedInSwdsOrAnaerobic: true, fsdCh4DefaultType: 'all_other_technologies' }, // 0.35
    digestateComposted: true,
    monitoredLeCompTCo2e: 7,
  }))]});
  assert.ok(Math.abs(r.leStorageTCo2e - 0.35 * 20 * 25) < 1e-12);
  assert.equal(r.leCompTCo2e, 7);
  assert.ok(Math.abs(r.leAdTCo2e - (0.35 * 20 * 25 + 7)) < 1e-12);
});

test('PEflare included in PEAD Eq(1) when provided (double-counting to be handled in ER integration)', () => {
  const r = runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 10,
    digesterPhysicalLeakType: 'unknown',
    noElectricityConsumption: true,
    flareOfBiogas: true,
    monitoredPeFlareTCo2e: 4,
  }))]});
  assert.equal(r.peFlareTCo2e, 4);
  assert.ok(Math.abs(r.peAdTCo2e - (10 * 0.10 * 25 + 4)) < 1e-12);
});

test('on-site renewable electricity -> PEEC 0 (TOOL14 Step 2)', () => {
  const r = runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 10,
    digesterPhysicalLeakType: 'unknown',
    electricityGeneratedOnSiteRenewableBiomassWindHydroGeothermal: true,
  }))]});
  assert.equal(r.peEcTCo2, 0);
  assert.equal(r.peEcSource, 'onsite_renewable_zero');
});

test('missing/unsupported required inputs rejected (no invention)', () => {
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({ noElectricityConsumption: true, digesterPhysicalLeakType: 'unknown' }))] }), /QCH4/);
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({ monitoredQCh4TonnesPerYear: 1, noElectricityConsumption: true }))] }), /efCh4LeakFraction|digesterPhysicalLeakType/);
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({ monitoredQCh4TonnesPerYear: 1, digesterPhysicalLeakType: 'unknown', noElectricityConsumption: true, usesFossilFuels: true }))] }), /monitoredPeFcTCo2/);
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({ monitoredQCh4TonnesPerYear: 1, digesterPhysicalLeakType: 'unknown', noElectricityConsumption: true, flareOfBiogas: true }))] }), /monitoredPeFlareTCo2e/);
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({ monitoredQCh4TonnesPerYear: 1, digesterPhysicalLeakType: 'unknown', noElectricityConsumption: true, digestateComposted: true }))] }), /monitoredLeCompTCo2e/);
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({ monitoredQCh4TonnesPerYear: 1, digesterPhysicalLeakType: 'unknown', noElectricityConsumption: true, liquidDigestateStorage: { anaerobicStorage: true } }))] }), /fwwCh4DefaultType|monitoredLeStorageTCo2e/);
});

test('no anaerobicDigesterActivity -> null (gated)', () => {
  const pd = base({});
  delete pd.anaerobicDigesterActivity;
  const r = runExpression(logic, { documents: [asDocument(pd)] });
  assert.equal(r, null);
});
