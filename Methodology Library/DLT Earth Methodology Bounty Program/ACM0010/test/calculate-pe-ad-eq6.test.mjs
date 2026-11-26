/**
 * TOOL14 v03.0 Eq(6) liquid storage Option 1 (monitored COD/MCF/B0) in ACM0010 integration.
 * Source: TOOL14 v03.0 (EB 123 Annex 2, valid 7 Nov 2024)
 *   Eq (6): LEstorage,y = Qstored,y * PCOD,y * B0 * MCF * GWPCH4
 * Defaults/values (TOOL14 tables): B0 default 0.25 tCH4/tCOD (Table 7); MCF 0.8/0.2/0 by depth (Table 10).
 * Solid Option 1 requires TOOL04 model (monitored/externally derived LEstorage accepted separately).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExpression, asDocument } from './_artifact.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const logic = readFileSync(join(HERE, '..', 'logic', 'calculate-pe-ad.js'), 'utf8');

function base(ad) {
  return {
    id: 'ad-eq6', projectName: 'AD6', monitoringYear: 2026,
    baselineAwms: { name: 'Lagoon', methaneConversionFactor: 0.5 },
    livestock: [{ type: 'Dairy', annualVolatileSolids: 1, maxMethaneProducingCapacity: 0.2 }],
    parameters: { globalWarmingPotentialCh4: 25 },
    anaerobicDigesterActivity: ad,
  };
}

test('TOOL14 Eq(6): liquid storage monitored path with B0 default and explicit MCF', () => {
  const r = runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 10,
    digesterPhysicalLeakType: 'unknown',
    noElectricityConsumption: true,
    liquidDigestateStorage: { anaerobicStorage: true, qStoredM3PerYear: 100, pCodTonnesPerM3: 0.02, mcf: 0.8 }
  }))] });
  assert.ok(Math.abs(r.leStorageTCo2e - 10) < 1e-12);
  assert.equal(r.leStorageSource, 'liquid_option1_eq6_monitored');
  assert.ok(Math.abs(r.leAdTCo2e - 10) < 1e-12);
});

test('TOOL14 Eq(6): explicit B0 and shallow MCF', () => {
  const r = runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 5,
    digesterPhysicalLeakType: 'unknown',
    noElectricityConsumption: true,
    liquidDigestateStorage: { anaerobicStorage: true, qStoredM3PerYear: 200, pCodTonnesPerM3: 0.01, b0TCh4PerTCod: 0.3, mcf: 0.2 }
  }))] });
  assert.ok(Math.abs(r.leStorageTCo2e - 200 * 0.01 * 0.3 * 0.2 * 25) < 1e-12);
});

test('Eq(6) requires MCF and rejects invalid inputs', () => {
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 5, digesterPhysicalLeakType: 'unknown', noElectricityConsumption: true,
    liquidDigestateStorage: { anaerobicStorage: true, qStoredM3PerYear: 100, pCodTonnesPerM3: 0.02 }
  }))] }), /mcf/);
  assert.throws(() => runExpression(logic, { documents: [asDocument(base({
    monitoredQCh4TonnesPerYear: 5, digesterPhysicalLeakType: 'unknown', noElectricityConsumption: true,
    liquidDigestateStorage: { anaerobicStorage: true, qStoredM3PerYear: 100, pCodTonnesPerM3: 0.02, mcf: 1.5 }
  }))] }), /mcf/);
});
