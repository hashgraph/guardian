"""Gap closure, 20 Oct: per-section survey values (VMR0015 s9.3(2)), interactive effects (s9.3(1)), TOOL03 / VT0010 per-source rows
(TOOL03 Eq.(1) sum over fuels i and sources j; VT0010 Eq.(5)/(7) sum over loads L, Eq.(11) over plants n, Eq.(13) over fuels f),
no typed EC_PE,B without EG_PBWA (VT0010 Eq.(9)), QPW option 1 sample scale-up (AMS-III.AV table 10(a)), table 13 exclusion from the date
of supply, consistent vintage rows, and checks for inputs that were collected but not used (LS, unfcccStatus, fNRB validity, EF source,
eta_d defaults, T_i measured, TOOL19 route, VT0008 WACC)."""
import sys

S = sys.argv[1]


def rep(s, old, new, cnt=1):
    n = s.count(old)
    assert n == cnt, (n, old[:120])
    return s.replace(old, new)


HEADER = [
# ---------- survey values per section ----------
("""function surveyParams(sections) {
  let nb = 0, ne = 0, pAll = 0, pBoil = 0, rows = 0, bad = 0;
  const qpp = {};
  for (const s of (sections || [])) {
    let sp = 0, sl = 0;
    for (const h of (s.baselineSurvey || [])) {
      rows++;
      const per = N(h.persons, 0);
      pAll += per; if (h.boilsDrinkingWater === true) pBoil += per;
      for (const u of (h.deviceUse || [])) {
        const wk = N(u.weeklyBoils, 0), e = N(u.eta_d, NaN);
        if (wk > 0 && e > 0 && e <= 1) { nb += wk; ne += wk * e; } else if (wk > 0) bad++;
      }
      const l = N(h.litresPerPersonDay, NaN);
      if (per > 0 && isFinite(l) && l >= 0) { sp += per; sl += per * l; }
    }
    if (sp > 0) qpp[s.sectionId] = sl / sp;
  }
  return { rows: rows, bad: bad, eta: nb > 0 ? FX('fnEtaWb', ne / nb, [ne, nb]) : null, xboil: pAll > 0 ? FX('fnXboil', pBoil / pAll, [pBoil, pAll]) : null, qpp: qpp };
}""",
"""// AMS-III.AV table 4 default efficiencies by device type (the deviceType text carries the default); used to check survey rows marked "table 4 default"
const ETA_DEFAULT = (t) => { const m = String(t || '').match(/default (0\\.[0-9]+)/); return m ? Number(m[1]) : null; };
function surveyParams(sections) {
  let nb = 0, ne = 0, pAll = 0, pBoil = 0, rows = 0, bad = 0, tiN = 0, tiS = 0;
  const qpp = {}, bySec = {}, etaDef = [];
  for (const s of (sections || [])) {
    let sp = 0, sl = 0, snb = 0, sne = 0, spa = 0, spb = 0, sr = 0;
    for (const h of (s.baselineSurvey || [])) {
      rows++; sr++;
      const per = N(h.persons, 0);
      pAll += per; spa += per; if (h.boilsDrinkingWater === true) { pBoil += per; spb += per; }
      for (const u of (h.deviceUse || [])) {
        const wk = N(u.weeklyBoils, 0), e = N(u.eta_d, NaN);
        if (wk > 0 && e > 0 && e <= 1) { nb += wk; ne += wk * e; snb += wk; sne += wk * e; } else if (wk > 0) bad++;
        const dv = ETA_DEFAULT(u.deviceType);
        if (String(u.eta_dSource || '').indexOf('AMS-III.AV table 4 default') === 0 && dv !== null && isFinite(e) && Math.abs(e - dv) > 1e-6) etaDef.push(s.sectionId + '/' + (h.householdId || '') + ' (' + e + ' vs ' + dv + ')');
      }
      const l = N(h.litresPerPersonDay, NaN);
      if (per > 0 && isFinite(l) && l >= 0) { sp += per; sl += per * l; }
      const ti = N(h.T_iMeasured, NaN); if (isFinite(ti)) { tiN++; tiS += ti; }
    }
    if (sp > 0) qpp[s.sectionId] = sl / sp;
    if (sr > 0) bySec[s.sectionId] = { eta: snb > 0 ? FX('fnEtaWb', sne / snb, [sne, snb]) : null, xboil: spa > 0 ? FX('fnXboil', spb / spa, [spb, spa]) : null };
  }
  return { rows: rows, bad: bad, eta: nb > 0 ? FX('fnEtaWb', ne / nb, [ne, nb]) : null, xboil: pAll > 0 ? FX('fnXboil', pBoil / pAll, [pBoil, pAll]) : null, qpp: qpp, bySec: bySec, etaDef: etaDef, tiMean: tiN > 0 ? tiS / tiN : null };
}
// VMR0015 s9.3(2): emission reductions are calculated section by section. A section with its own baseline-survey rows uses its own eta_wb and X_boil;
// a section without survey rows uses the values of the whole survey, and without any survey rows the values typed in Appendix 2 (A2.1.1).
function secSurvey(sp, out, sid) {
  const b = (sp && sp.bySec && sp.bySec[sid]) || {};
  return { eta: (b.eta !== undefined && b.eta !== null) ? b.eta : out.eta, xb: (b.xboil !== undefined && b.xboil !== null) ? b.xboil : out.xb };
}"""),
("""  for (const s of (sections || [])) {
    const q = sv.qpp[s.sectionId];""",
"""  if (sv.etaDef && sv.etaDef.length) flags.push(who + ': baseline-survey device rows marked "AMS-III.AV table 4 default" state an efficiency different from the table 4 default for their device type: ' + sv.etaDef.join(', ') + '; use the default or mark the value as sampled/literature (table 4(a))');
  if (sv.tiMean !== null && String(a21.secEquation || '').indexOf('Eq.(4)') === 0 && Math.abs(sv.tiMean - PV(a21.T_i, 20)) > 0.5) flags.push(who + ': T_i in Appendix 2 (' + PV(a21.T_i, 20) + ' C) differs from the mean T_i measured in the baseline survey (' + r6(sv.tiMean) + ' C); AMS-III.AV para 19 uses the annual average ambient temperature - check T_i');
  for (const s of (sections || [])) {
    const q = sv.qpp[s.sectionId];"""),
# ---------- interactive effects ----------
("""// EQ-BE inner sum:""",
"""// VMR0015 s9.3(1): "The survey results related to this aspect [interactive effects between the safe drinking water device and improved thermal
// energy technologies] must be applied proportionally across the population of households to determine the emission reductions."
// Applied as BE x (1 - share), where share = households reporting an interactive effect / households surveyed; when several surveys are given the
// largest share is used (conservative). A missing survey result or a questionnaire without the question is flagged.
function ieFactor(groups, who) {
  let share = 0;
  for (const g of groups) {
    const rows = (g.list || []).filter(r => String(r.surveyType || '').indexOf(g.kind) === 0);
    if (!rows.length) { flags.push(who + ': no ' + g.kind.toLowerCase() + ' result on interactive effects is recorded (VMR0015 s9.3(1) requires the question in the baseline and the project survey); no adjustment applied - VVB to confirm'); continue; }
    for (const r of rows) {
      const id = (r.surveyType || 'survey') + (r.surveyRef ? ' ' + r.surveyRef : '');
      if (r.questionIncluded !== true) flags.push(who + ': the ' + id + ' questionnaire does not contain the interactive-effects question required by VMR0015 s9.3(1)');
      const hs = N(r.householdsSurveyed, 0), hi = Math.min(N(r.householdsWithInteractiveEffect, 0), hs);
      if (!(hs > 0)) { flags.push(who + ': the ' + id + ' result has no households surveyed, so no interactive-effects share can be applied'); continue; }
      const sh = FX('fnIEShare', hi / hs, [hi, hs]);
      const typed = N(r.proportionApplied, NaN);
      if (isFinite(typed) && Math.abs(typed - sh * 100) > 0.5) flags.push(who + ': ' + id + ' states ' + typed + ' % applied, but ' + hi + ' of ' + hs + ' households is ' + r6(sh * 100) + ' %; the computed share is used');
      share = Math.max(share, sh);
    }
  }
  if (share > 0) flags.push(who + ': ' + r6(share * 100) + ' % of surveyed households report an interactive effect with improved thermal energy technologies; baseline emissions are reduced by that share (VMR0015 s9.3(1))');
  return 1 - share;
}
// EQ-BE inner sum:"""),
# ---------- fNRB draft value ----------
("""function noteTool30(list, flags) {""",
"""// VMR0015 s9.2: "Project proponents applying draft UNFCCC national default values must apply the updated approved default values in any
// verification request submitted after UNFCCC approval"; and the determination must be valid for the period it is used in.
function fnrbStatusCheck(list, who, pS, pE) {
  for (const f of (list || [])) {
    const id = 'fNRB ' + (f.fuelType || f.determinationId || '');
    if (String(f.option || '').indexOf('Option 1') === 0 && String(f.unfcccStatus || '').indexOf('Draft') === 0) flags.push(who + ' ' + id + ': the UNFCCC national default is a draft value; once UNFCCC approves the default it must replace the draft in every later verification (VMR0015 s9.2)');
    const vf = isoDate(f.validFrom), vt = isoDate(f.validTo);
    if (pS && vf && pS < vf) flags.push(who + ' ' + id + ': determination ' + (f.determinationId || '') + ' is valid from ' + vf + ', after the period start ' + pS);
    if (pE && vt && pE > vt) flags.push(who + ' ' + id + ': determination ' + (f.determinationId || '') + ' is valid to ' + vt + ', before the period end ' + pE + ' (fNRB is determined each crediting period, VMR0015 s9.2)');
  }
}
// VMR0015 s9.1: where the emission factor source is 3 (IPCC default), the values printed in VMR0015 s9.1 apply
const EF_PRINTED = { 'Woody biomass': [112, 9.46], 'Charcoal (combustion only)': [112, 5.865], 'Charcoal (combustion + production)': [165.22, 44.83] };
function efSourceCheck(sections, who) {
  for (const s of (sections || [])) for (const f of (s.baselineFuels || [])) {
    const p = EF_PRINTED[f.fuelType];
    if (!p || String(f.EF_source || '').indexOf('3') !== 0) continue;
    if (Math.abs(N(f.EF_CO2, NaN) - p[0]) > 1e-6 || Math.abs(N(f.EF_nonCO2, NaN) - p[1]) > 1e-6) flags.push(who + ' section ' + s.sectionId + ' fuel ' + (f.fuelId || f.fuelType) + ': source 3 (IPCC default) is selected, but EF_CO2 ' + f.EF_CO2 + ' / EF_nonCO2 ' + f.EF_nonCO2 + ' differ from the VMR0015 s9.1 values ' + p[0] + ' / ' + p[1] + ' t/TJ for ' + f.fuelType);
  }
}
function noteTool30(list, flags) {"""),
# ---------- VT0010: per-load rows, plants with several fuels, no typed EC_PE,B ----------
("""function PE_EC(a21_3, a22_3, decl) {
  a21_3 = a21_3 || {}; a22_3 = a22_3 || {};
  const EFA = PV(a21_3.EF_PE_A_L, 0), TDLA = PV(a22_3.TDL_PE_A_L, 0), ECG = PV(a22_3.EC_Grid_L, 0);
  const EGP = PV(a22_3.EG_PBWA, 0), TDLB = PV(a22_3.TDL_PE_B, 0), EFB = PV(a22_3.EF_PE_B, 0);
  const ECB = EGP > 0 ? Math.min(ECG, EGP / (1 + TDLB)) : Math.min(PV(a22_3.EC_PE_B, 0), ECG);
  const ECA = ECG > 0 ? ECG * (1 - ECB / ECG) : 0;""",
"""// One load L (Scenarios A and B): PE_A,L = EC_PE,A,L x EF_A,L x (1 + TDL_A,L) [Eq.(5)], EC_PE,A,L = EC_Grid,L - EC_PE,B,L [Eq.(7)],
// EC_PE,B,L = MIN(EC_Grid,L ; EG_PBWA,L / (1 + TDL_PE,B)) [Eq.(9)], PE_B,L = EC_PE,B,L x EF_PE,B x (1 + TDL_PE,B) [Eq.(8)].
function peLoad(ECG, EFA, TDLA, EGP, TDLB, EFB) {
  const ECB = EGP > 0 ? Math.min(ECG, EGP / (1 + TDLB)) : 0;
  const ECA = ECG > 0 ? ECG - ECB : 0;
  return ECA * EFA * (1 + TDLA) + ECB * EFB * (1 + TDLB);
}
// One shared plant n (Scenario C): EF_PE,SPP,n = SUM_f(Q_n,f x NCV_f x EF_CO2,f) / EG_n x (1 - H_n) [Eq.(13)], H_n = HG_n / (SUM_f(Q_n,f x NCV_f) x eta_cogen,n) [Eq.(14)]
function efPlant(fuels, EGn, HGn, eta, typedEF, id) {
  let fuelE = 0, co2 = 0;
  for (const f of fuels) { const q = N(f.Q_n_f, 0), ncv = N(f.NCV_f, 0), ef = N(f.EF_CO2_f, 0); fuelE += q * ncv; co2 += q * ncv * ef; }
  if (!(fuelE > 0 && co2 > 0 && EGn > 0)) return typedEF;
  let H = (HGn > 0 && eta > 0) ? HGn / (fuelE * eta) : 0;
  if (H < 0 || H > 1) { flags.push('VT0010 shared plant ' + id + ': heat fraction H_n = ' + r6(H) + ' is outside 0-1; check HG_n, eta_cogen,n and the fuel data'); H = Math.min(Math.max(H, 0), 1); }
  const EFc = co2 / EGn * (1 - H);
  if (typedEF > 0 && Math.abs(typedEF - EFc) > 0.01 * EFc) flags.push('VT0010 shared plant ' + id + ': typed EF_PE,SPP,n ' + typedEF + ' differs from Eq.(13) ' + r6(EFc) + ' t CO2/MWh; Eq.(13) used');
  return EFc;
}
// Per-source tables (A2.2.3): one row per grid load L and one row per fuel f of each shared plant n. When rows are given they replace the single values.
function PE_EC_rows(a21_3, a22_3) {
  const loads = (a22_3.gridLoadRows || []), plants = (a22_3.sharedPlantFuelRows || []);
  if (!loads.length && !plants.length) return null;
  if (PV(a22_3.EC_Grid_L, 0) > 0 || PV(a22_3.EC_PE_SPP_n, 0) > 0) flags.push('VT0010: both the per-load / per-plant tables and the single values in A2.2.3 are filled; the tables are used');
  let pe = 0;
  for (const r of loads) {
    const ef = (r.EF_PE_A_L !== undefined && r.EF_PE_A_L !== null && r.EF_PE_A_L !== '') ? N(r.EF_PE_A_L, 0) : PV(a21_3.EF_PE_A_L, 0);
    if (!(N(r.EG_PBWA, 0) > 0) && N(r.EC_PE_B, 0) > 0) flags.push('VT0010 load ' + (r.loadId || '') + ': EC_PE,B is entered without EG_PBWA; Eq.(9) needs EG_PBWA, so the whole load is taken as grid electricity (Scenario A)');
    pe += FX('fnPELoad', peLoad(N(r.EC_Grid_L, 0), ef, N(r.TDL_PE_A_L, 0), N(r.EG_PBWA, 0), N(r.TDL_PE_B, 0), N(r.EF_PE_B, 0)), [N(r.EC_Grid_L, 0), ef, N(r.TDL_PE_A_L, 0), N(r.EG_PBWA, 0), N(r.TDL_PE_B, 0), N(r.EF_PE_B, 0)]);
  }
  const byPlant = {};
  for (const r of plants) { const k = String(r.plantId || ''); (byPlant[k] = byPlant[k] || []).push(r); }
  for (const k in byPlant) {
    const rs = byPlant[k], p0 = rs[0];
    const ef = efPlant(rs, N(p0.EG_n, 0), N(p0.HG_n, 0), N(p0.eta_cogen_n, 0), N(p0.EF_PE_SPP_n, 0), k);
    pe += N(p0.EC_PE_SPP_n, 0) * ef;                                                        // VT0010 Eq.(11)
  }
  return pe;
}
function PE_EC(a21_3, a22_3, decl) {
  a21_3 = a21_3 || {}; a22_3 = a22_3 || {};
  const rowsPE = PE_EC_rows(a21_3, a22_3);
  if (rowsPE !== null) return rowsPE;
  const EFA = PV(a21_3.EF_PE_A_L, 0), TDLA = PV(a22_3.TDL_PE_A_L, 0), ECG = PV(a22_3.EC_Grid_L, 0);
  const EGP = PV(a22_3.EG_PBWA, 0), TDLB = PV(a22_3.TDL_PE_B, 0), EFB = PV(a22_3.EF_PE_B, 0);
  if (!(EGP > 0) && PV(a22_3.EC_PE_B, 0) > 0) flags.push('VT0010: EC_PE,B is entered without EG_PBWA; Eq.(9) needs EG_PBWA, so the whole load is taken as grid electricity (Scenario A)');
  const ECB = EGP > 0 ? Math.min(ECG, EGP / (1 + TDLB)) : 0;
  const ECA = ECG > 0 ? ECG * (1 - ECB / ECG) : 0;"""),
# ---------- TOOL03: per fuel / source rows ----------
("""function PE_FF(a22_2, decl) {
  a22_2 = a22_2 || {};""",
"""// TOOL03 Eq.(1) per row: PE_FF = SUM_i,j FC_i,j,y x COEF_i,y (one row per fuel i and combustion source j). A dedicated generator (VT0010 Scenario D,
// off-grid D1 or back-up D2) is entered here as a source: VT0010 s5.4.1.1 calculates its emissions with CDM TOOL03.
function coefRow(r) {
  const opt = String(r.tool03Option || ''), wC = N(r.w_C_i_y, 0), rho = N(r.rho_i_y, 0), ncv = N(r.NCV_i_y, 0), ef = N(r.EF_CO2_i_y, 0);
  const useA = opt.indexOf('Option A') === 0 || (opt.indexOf('Option B') !== 0 && wC > 0), vol = String(r.fcMeasuredIn || '').indexOf('Volume') === 0;
  return useA ? wC * (vol ? rho : 1) * 44 / 12 : ncv * ef;
}
function PE_FF(a22_2, decl) {
  a22_2 = a22_2 || {};
  const fr = a22_2.fuelCombustionRows || [];
  if (fr.length) {
    if (PV(a22_2.FC_i_j_y, 0) > 0) flags.push('TOOL03: both the per-fuel table and the single values in A2.2.2 are filled; the table is used');
    return fr.reduce((a, r) => { const fc = N(r.FC_i_j_y, 0), cf = coefRow(r); return a + FX('fnPEFFRow', fc * cf, [fc, cf]); }, 0);
  }"""),
# ---------- range checks for the new rows ----------
("""    for (const n of (s.networkChecks || [])) chk(id + ' persons connected', n.personsConnected, 0, Infinity);
  }""",
"""    for (const n of (s.networkChecks || [])) chk(id + ' persons connected', n.personsConnected, 0, Infinity);
    for (const w of (s.waterQuantityOpt1 || [])) chk(id + ' appliances covered', w.appliancesCovered, 0, Infinity);
    chk(id + ' appliances in service', s.appliancesInService, 0, Infinity); chk(id + ' appliance-days in service', s.applianceDaysInService, 0, Infinity);
  }
  const a2 = app2.a22_2 || {};
  for (const r of (a2.fuelCombustionRows || [])) { const id = 'TOOL03 row ' + (r.sourceId || '') + '/' + (r.fuelType || ''); chk(id + ' FC', r.FC_i_j_y, 0, Infinity); chk(id + ' w_C', r.w_C_i_y, 0, 1); chk(id + ' rho', r.rho_i_y, 0, Infinity); chk(id + ' NCV', r.NCV_i_y, 0, Infinity); chk(id + ' EF_CO2', r.EF_CO2_i_y, 0, Infinity); }
  for (const r of (a3.gridLoadRows || [])) { const id = 'VT0010 load ' + (r.loadId || ''); chk(id + ' EC_Grid', r.EC_Grid_L, 0, Infinity); chk(id + ' TDL_A', r.TDL_PE_A_L, 0, 1); chk(id + ' TDL_B', r.TDL_PE_B, 0, 1); chk(id + ' EG_PBWA', r.EG_PBWA, 0, Infinity); chk(id + ' EF_A', r.EF_PE_A_L, 0, Infinity); chk(id + ' EF_B', r.EF_PE_B, 0, Infinity); }
  for (const r of (a3.sharedPlantFuelRows || [])) { const id = 'VT0010 plant ' + (r.plantId || ''); chk(id + ' EC_PE_SPP', r.EC_PE_SPP_n, 0, Infinity); chk(id + ' Q', r.Q_n_f, 0, Infinity); chk(id + ' NCV', r.NCV_f, 0, Infinity); chk(id + ' EF_CO2', r.EF_CO2_f, 0, Infinity); chk(id + ' EG', r.EG_n, 0, Infinity); chk(id + ' HG', r.HG_n, 0, Infinity); chk(id + ' eta_cogen', r.eta_cogen_n, 0, 1); }"""),
]

PD = [
("""const svPD = applySurvey(surveyParams(rec.sections), a21, rec.sections, 'PD');
const SEC = SECf(a21, svPD.eta), Xb = svPD.xb !== null ? svPD.xb : PV(a21.X_boil, 0), ALE = adjLE(rec, app2), foPD = fnrbOverrides(rec.fnrbDeterminations, false); noteTool30(rec.fnrbDeterminations, flags); fnrbRowCheck(rec.sections, foPD, 'PD');""",
"""const spPD = surveyParams(rec.sections), svPD = applySurvey(spPD, a21, rec.sections, 'PD');
const SEC = SECf(a21, svPD.eta), Xb = svPD.xb !== null ? svPD.xb : PV(a21.X_boil, 0), ALE = adjLE(rec, app2), foPD = fnrbOverrides(rec.fnrbDeterminations, false); noteTool30(rec.fnrbDeterminations, flags); fnrbRowCheck(rec.sections, foPD, 'PD');
fnrbStatusCheck(rec.fnrbDeterminations, 'PD', '', ''); efSourceCheck(rec.sections, 'PD');
const IEF = ieFactor([{ kind: 'Baseline survey', list: rec.interactiveEffectsSurvey }], 'PD');
{ // AMS-III.AV table 3: where the life span LS is shorter than the crediting period, the units must be replaced to keep claiming (para 4(c))
  const ls = PV((a21 || {}).LS, NaN), cy = N(rec.crediting_years, NaN);
  if (isFinite(ls) && isFinite(cy) && ls > 0 && ls < cy) flags.push('PD: the life span LS of ' + ls + ' years is shorter than the ' + cy + '-year crediting period; units must be replaced to keep claiming, with replacement access documented (AMS-III.AV table 3 and para 4(c))');
}"""),
("""  const ft = fuelTerm(s.baselineFuels, foPD), be = FX('fnBE', Qe * m * Xb * SEC * ft * 1e-9 * ALE, [Qe, m, Xb, SEC, ft, ALE]);   // EQ-BE (VMR0015 Eq.(1))
  BE += be; qSum += Q; secOut.push({ sectionId: s.sectionId, be: be });""",
"""  const ss = secSurvey(spPD, svPD, s.sectionId), SECs = SECf(a21, ss.eta), Xbs = ss.xb !== null ? ss.xb : PV(a21.X_boil, 0);   // VMR0015 s9.3(2): section by section
  const ft = fuelTerm(s.baselineFuels, foPD), be = FX('fnBE', Qe * m * Xbs * SECs * ft * 1e-9 * ALE, [Qe, m, Xbs, SECs, ft, ALE]) * IEF;   // EQ-BE (VMR0015 Eq.(1)) x interactive-effects factor (s9.3(1))
  BE += be; qSum += Q; secOut.push({ sectionId: s.sectionId, be: be });"""),
("""  const coef = useA ? wC * (vol ? rho : 1) * 44 / 12 : ncv * efc;
  if (coef > 0) appCheck('A2.1.2 COEF (TOOL03)', (app2.a21_2 || {}).COEF_i_y, [coef]);""",
"""  const coef = useA ? wC * (vol ? rho : 1) * 44 / 12 : ncv * efc;
  if (coef > 0 && !(a2.fuelCombustionRows || []).length) appCheck('A2.1.2 COEF (TOOL03)', (app2.a21_2 || {}).COEF_i_y, [coef]);"""),
("""if (addTool && addAllowed.indexOf(addTool) < 0)""",
"""if (addTool === 'TOOL19' && !String((rec.additionality || {}).tool19LocationRoute || '')) flags.push('additionality: TOOL19 is selected but its location route (LDC, SIDS or SUZ, TOOL19 para 13(a)) is not stated');
{ // VT0008 A2.3 eq.(1): WACC = r_e x W_e + r_d x (1 - T_c) x W_d, with W_d = 1 - W_e. The benchmark must match the WACC (project IRR) or the cost of equity (equity IRR).
  const ad = rec.additionality || {}, re = N(ad.costOfEquityPct, NaN), rd = N(ad.costOfDebtPct, NaN), we = N(ad.equitySharePct, NaN), tc = N(ad.taxRatePct, NaN), bm = N(ad.benchmarkIRRPct, NaN);
  if ([re, rd, we, tc].every(isFinite)) {
    const wacc = FX('fnWACC', re * we / 100 + rd * (1 - tc / 100) * (100 - we) / 100, [re, we / 100, rd, tc / 100, (100 - we) / 100]);
    result.vt0008WACCPct = r6(wacc);
    if (isFinite(bm) && Math.abs(bm - wacc) > 0.05 && Math.abs(bm - re) > 0.05) flags.push('additionality: the benchmark ' + bm + ' % matches neither the WACC from VT0008 A2.3 eq.(1) (' + r6(wacc) + ' %) nor the cost of equity (' + re + ' %)');
  }
}
if (addTool && addAllowed.indexOf(addTool) < 0)"""),
]

MR = [
("""const svMR = applySurvey(surveyParams(prec.sections), a21, prec.sections, 'registered PD');
const SEC = SECf(a21, svMR.eta), eta = svMR.eta !== null ? svMR.eta : PV(a21.eta_wb, 0), Xb = svMR.xb !== null ? svMR.xb : PV(a21.X_boil, 0), ALE = adjLE(prec, papp);""",
"""const spMR = surveyParams(prec.sections), svMR = applySurvey(spMR, a21, prec.sections, 'registered PD');
const SEC = SECf(a21, svMR.eta), eta = svMR.eta !== null ? svMR.eta : PV(a21.eta_wb, 0), Xb = svMR.xb !== null ? svMR.xb : PV(a21.X_boil, 0), ALE = adjLE(prec, papp);
const IEF = ieFactor([{ kind: 'Project survey', list: rec.interactiveEffectsSurvey }, { kind: 'Baseline survey', list: [].concat(rec.interactiveEffectsSurvey || [], prec.interactiveEffectsSurvey || []) }], 'MR');"""),
("""fnrbRowCheck(prec.sections, fo, 'registered PD');""",
"""fnrbRowCheck(prec.sections, fo, 'registered PD');
fnrbStatusCheck((rec.fnrbDeterminations || []).length ? rec.fnrbDeterminations : prec.fnrbDeterminations, 'MR', isoDate(d.monitoringPeriodStart), isoDate(d.monitoringPeriodEnd));"""),
("""  if (opt.indexOf('Option 1') === 0) Q = (s.waterQuantityOpt1 || []).reduce((a, w) => a + N(w.measuredVolume, 0), 0);""",
"""  if (opt.indexOf('Option 1') === 0) {
    // AMS-III.AV table 10: (a) distributed appliances - flow meters on a statistically valid sample, continuously or over a representative period;
    // (b) kiosks - continuous flow meter or standard vessel. Sample records are scaled to the appliances in service (continuous) or to the
    // appliance-days in service (representative period); records that cover all appliances, and kiosk records, are added as measured.
    let tot = 0, cV = 0, cN = 0, rV = 0, rAD = 0;
    for (const w of (s.waterQuantityOpt1 || [])) {
      const b = String(w.samplingBasis || ''), v = N(w.measuredVolume, 0);
      if (b.indexOf('Statistically valid sample, metered continuously') === 0) { cV += v; cN += N(w.appliancesCovered, 0); }
      else if (b.indexOf('Statistically valid sample, metered over a representative period') === 0) { rV += v; rAD += N(w.appliancesCovered, 0) * N(w.daysMeasured, 0); }
      else tot += v;
    }
    if (cV > 0 || rV > 0) {
      const Nin = N(s.appliancesInService, 0), ADin = N(s.applianceDaysInService, Nin * days);
      if ((cV > 0 && rV > 0) || tot > 0) flags.push('section ' + s.sectionId + ': option 1 records mix sampling bases (all appliances, continuous sample, representative-period sample); only one basis per section is allowed, so the section is not credited until the records are corrected'), tot = 0, cV = 0, rV = 0;
      if (cV > 0) { if (cN > 0 && Nin > 0) { tot += FX('fnQPWSample', cV * Nin / cN, [cV, Nin, cN]); if (cN > Nin) flags.push('section ' + s.sectionId + ': ' + cN + ' metered appliances exceed the ' + Nin + ' appliances in service'); } else flags.push('section ' + s.sectionId + ': a continuous metering sample needs the appliances covered by each record and the appliances in service in the section (AMS-III.AV table 10(a)); QPW = 0 until they are entered'); }
      if (rV > 0) { if (rAD > 0 && ADin > 0) tot += FX('fnQPWRepr', rV / rAD * ADin, [rV, rAD, ADin]); else flags.push('section ' + s.sectionId + ': a representative-period metering sample needs the appliances covered and days measured in each record and the appliances in service (AMS-III.AV table 10(a)); QPW = 0 until they are entered'); }
      if (!(s.samplingResults || []).some(r => r.parameter === 'QPW_y')) flags.push('section ' + s.sectionId + ': QPW_y comes from a metering sample, but no sampling record for QPW_y is given (AMS-III.AV table 10: sample size per the CDM sampling standard)');
    }
    Q = tot;
  }"""),
("""  const Px = Math.min(P, (s.networkChecks || []).filter(n => n.networkExists === true).reduce((a, n) => a + N(n.personsConnected, 0), 0));
  const Hx = (s.networkChecks || []).filter(n => n.networkExists === true).reduce((a, n) => a + N(n.householdsConnected, 0), 0);
  const Qn = P > 0 ? Q * (P - Px) / P : 0;
  const cap = FX('fnCap', (P - Px) * 5.5 * days, [P - Px, days]);   // EQ-CAP (para 18, pro-rated to the period)""",
"""  // Table 13: reductions of households supplied by the public network "cannot be claimed from that point onwards": persons connected are excluded
  // for the days from the date of supply to the period end (the whole period when the date is missing or before the period start)
  const pS0 = isoDate(d.monitoringPeriodStart), pE0 = isoDate(d.monitoringPeriodEnd);
  let xPD = 0;   // excluded person-days
  for (const nc of (s.networkChecks || []).filter(n => n.networkExists === true)) {
    const ds = isoDate(nc.dateOfSupply);
    let dx = days;
    if (ds && pS0 && pE0 && ds > pS0) dx = ds > pE0 ? 0 : Math.round((Date.parse(pE0) - Date.parse(ds)) / 86400000) + 1;
    xPD += N(nc.personsConnected, 0) * Math.min(dx, days);
  }
  xPD = Math.min(xPD, P * days);
  const Px = days > 0 ? xPD / days : 0;   // person-equivalents excluded over the period
  const Hx = (s.networkChecks || []).filter(n => n.networkExists === true).reduce((a, n) => a + N(n.householdsConnected, 0), 0);
  const Qn = P > 0 ? Q * (P - Px) / P : 0;
  const cap = FX('fnCap', (P - Px) * 5.5 * days, [P - Px, days]);   // EQ-CAP (para 18, pro-rated to the period)"""),
("""  const ft = fuelTerm(ps.baselineFuels, fo), be = FX('fnBE', Qe * m * Xb * SEC * ft * 1e-9 * ALE, [Qe, m, Xb, SEC, ft, ALE]);   // EQ-BE (VMR0015 Eq.(1))
  BEt += be;
  tmp.push({ s, Q, P, Px, Hx, cap, Qe, m, wqs, wqGate, sdwGate, disc, sampGate, be, sChecks, nS: sampled.length, nF: failC });""",
"""  const ss = secSurvey(spMR, svMR, s.sectionId), SECs = SECf(a21, ss.eta), Xbs = ss.xb !== null ? ss.xb : PV(a21.X_boil, 0), etas = ss.eta !== null ? ss.eta : PV(a21.eta_wb, 0);   // VMR0015 s9.3(2)
  const ft = fuelTerm(ps.baselineFuels, fo), be = FX('fnBE', Qe * m * Xbs * SECs * ft * 1e-9 * ALE, [Qe, m, Xbs, SECs, ft, ALE]) * IEF;   // EQ-BE (VMR0015 Eq.(1)) x interactive-effects factor (s9.3(1))
  BEt += be;
  tmp.push({ s, Q, P, Px, Hx, cap, Qe, m, wqs, wqGate, sdwGate, disc, sampGate, be, sChecks, nS: sampled.length, nF: failC, SECs, etas });"""),
("""  const coef = useA ? wC * (vol ? rho : 1) * 44 / 12 : ncv * efc;
  if (coef > 0) appCheck('A2.1.2 COEF (TOOL03)', (app2.a21_2 || papp.a21_2 || {}).COEF_i_y, [coef]);""",
"""  const coef = useA ? wC * (vol ? rho : 1) * 44 / 12 : ncv * efc;
  if (coef > 0 && !(a2.fuelCombustionRows || []).length) appCheck('A2.1.2 COEF (TOOL03)', (app2.a21_2 || papp.a21_2 || {}).COEF_i_y, [coef]);"""),
("""    m: r6(t.m), WQ_fail_share: r6(t.wqs), wqGate: t.wqGate, sdwGate: t.sdwGate, SEC: r6(SEC), eta_wb: eta,""",
"""    m: r6(t.m), WQ_fail_share: r6(t.wqs), wqGate: t.wqGate, sdwGate: t.sdwGate, SEC: r6(t.SECs), eta_wb: t.etas,"""),
("""  const fl0 = flags.length, sv_ = applySurvey(surveyParams(rr.sections), a1, rr.sections, 'registered PD'); flags.length = fl0;   // same survey values as the PD block; its flags are already listed above
  const sec_ = SECf(a1, sv_.eta), xb_ = sv_.xb !== null ? sv_.xb : PV(a1.X_boil, 0), ale_ = adjLE(rr, aa), foPD = fnrbOverrides(rr.fnrbDeterminations, false);""",
"""  const fl0 = flags.length, sp_ = surveyParams(rr.sections), sv_ = applySurvey(sp_, a1, rr.sections, 'registered PD');
  const ief_ = ieFactor([{ kind: 'Baseline survey', list: rr.interactiveEffectsSurvey }], 'registered PD');
  const ale_ = adjLE(rr, aa), foPD = fnrbOverrides(rr.fnrbDeterminations, false);
  const pec_ = PE_EC(aa.a21_3, aa.a22_3), pff_ = PE_FF(aa.a22_2); flags.length = fl0;   // same values as the PD block; its flags are not repeated"""),
("""    const Qe_ = Math.min(Q, P * 5.5 * 365);
    be_ += Qe_ * N(s.m_estimate, 0) * xb_ * sec_ * fuelTerm(s.baselineFuels, foPD) * 1e-9 * ale_;
  }
  exA = be_ - (PE_EC(aa.a21_3, aa.a22_3) + PE_FF(aa.a22_2));""",
"""    const Qe_ = Math.min(Q, P * 5.5 * 365);
    const ss_ = secSurvey(sp_, sv_, s.sectionId), sec_ = SECf(a1, ss_.eta), xb_ = ss_.xb !== null ? ss_.xb : PV(a1.X_boil, 0);
    be_ += Qe_ * N(s.m_estimate, 0) * xb_ * sec_ * fuelTerm(s.baselineFuels, foPD) * 1e-9 * ale_ * ief_;
  }
  exA = Math.max(0, be_ - (pec_ + pff_));"""),
# F16: the vintage rows report the baseline emissions that were credited, so BE - PE - LE = ER in every row
("""const vintRows = vsegs.length > 1 && vdays > 0 ? vsegs.map(g => { const f = g.days / vdays; return { sectionId: 'ALL', vintageStart: g.s, vintageEnd: g.e, BE: r6(BEt * f), PE_FF: r6(pff * f), PE_EC: r6(pec * f), PE: r6(PEt * f), LE: 0, reductions: r6(ERt * f), removals: 0, total: r6(ERt * f) }; })
  : [{ sectionId: 'ALL', vintageStart: ps0, vintageEnd: pe0, BE: r6(BEt), PE_FF: r6(pff), PE_EC: r6(pec), PE: r6(PEt), LE: 0, reductions: r6(ERt), removals: 0, total: r6(ERt) }];""",
"""// MR 5.5 table: net baseline emissions credited = ER + PE + LE, so that BE - PE - LE = ER in every vintage row (sections that are not credited and the
// sampling discount are left out of the row's BE; the full BE of each section is in ex_post.sections)
const BEc = ERt + PEt + LEt;
const vintRows = vsegs.length > 1 && vdays > 0 ? vsegs.map(g => { const f = g.days / vdays; return { sectionId: 'ALL', vintageStart: g.s, vintageEnd: g.e, BE: r6(BEc * f), PE_FF: r6(pff * f), PE_EC: r6(pec * f), PE: r6(PEt * f), LE: 0, reductions: r6(ERt * f), removals: 0, total: r6(ERt * f) }; })
  : [{ sectionId: 'ALL', vintageStart: ps0, vintageEnd: pe0, BE: r6(BEc), PE_FF: r6(pff), PE_EC: r6(pec), PE: r6(PEt), LE: 0, reductions: r6(ERt), removals: 0, total: r6(ERt) }];"""),
]

for fn, extra in (('pd.js', PD), ('mr.js', MR)):
    s = open(f'{S}/{fn}').read()
    for o, n in HEADER + extra:
        s = rep(s, o, n)
    open(f'{S}/{fn}', 'w').write(s)
    print('patched', fn, len(s))
