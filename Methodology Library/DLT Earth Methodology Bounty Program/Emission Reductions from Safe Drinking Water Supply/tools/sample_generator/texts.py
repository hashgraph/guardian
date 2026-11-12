"""Written content for the VMR0015 v3 sample documents (fictional sample entities; numbers computed from scenario.py)."""
import scenario as sc

# ---- numbers computed from the scenario (never typed) -----------------------------------------------
FUEL = sc.BL * (sc.EF_CO2 * sc.FNRB + sc.EF_NON)
BE_PD = sum(z[4] * sc.M_PD * sc.X_BOIL * sc.SEC * FUEL * 1e-9 * sc.ADJ_LE for z in sc.ZONES)
PE = sc.EC_GRID_MWH * sc.EF_GRID * (1 + sc.TDL)
ER_PD = BE_PD - PE
BE_MR = sum(z[6] * 0.93 * sc.X_BOIL * sc.SEC * FUEL * 1e-9 * sc.ADJ_LE for z in sc.ZONES)
ER_MR = BE_MR - PE
r6 = lambda x: round(x, 6)
PCT = (ER_MR - ER_PD) / ER_PD * 100
TEAM = f'{sc.LEAD} (lead auditor); {sc.EXPERT} (technical expert, water quality and sampling); {sc.REVIEWER} (independent technical reviewer)'
CLIENT = f'{sc.PP_ORG}, {sc.PP_PERSON}, {sc.PP_EMAIL}'
METH = 'VMR0015 v1.0 (Revision to AMS-III.AV v09.0) with CDM TOOL03, VT0010, TOOL33, VT0008 and the CDM Standard and Guideline for Sampling and Surveys'
ZONES_TXT = 'Kibosho, Uru, Old Moshi and Mbokomu wards of Moshi Rural District, Kilimanjaro Region, Tanzania'
DESC = (f'{sc.PROJECT_NAME}: free distribution and maintenance of 3,000 gravity-fed ceramic-membrane household filters with a '
        f'solar-assisted UV stage to 3,000 households (about 12,000 people) in four zones ({ZONES_TXT}). The filters replace boiling '
        'of drinking water on three-stone woody-biomass fires. Emission reductions are quantified with VMR0015 v1.0 / AMS-III.AV v09.0.')

# ---- PD -------------------------------------------------------------------------------------------
PD_OVERRIDES = {
    '/section1/creditingPeriodDetail/creditingPeriodLength': 'Five years (renewable)',
    '/section5/dataAndParameters/availableAtValidation/appendix2CrossReference':
        'Appendix 2, table A2.1: A2.1.1 (BL_fuel,i, EF_CO2,i, EF_nonCO2,i, n_wb, SEC, X_boil, LS), A2.1.3 (EF_PE,A,L), A2.1.5 (Adj_LE). '
        'Monitored parameters: Appendix 2, table A2.2 (A2.2.1 m, P_y, QPW_y, SDW checks, WQ fail share; A2.2.3 EC_Grid,L and TDL; A2.2.4 fNRB) and section 5.2.',
    '/section1/section1_7_v50B': {
        'rightToOperate': {'rightToOperate': (f'{sc.PP_ORG} owns the 3,000 filters until handover and holds the right to the emission reductions through '
                           'signed household user agreements (each household assigns its claim to the reductions to the proponent in '
                           'exchange for the free filter, replacement elements and maintenance) and a memorandum of understanding with '
                           'Moshi District Council (Ref. MDC/WS/2026/14) recognising the programme. No land is acquired or used.')},
        'landOrResourceRights': [{'landRightsAnalysis': ('The project installs portable household devices in existing homes and four small '
                                                         'service points on leased premises; it does not affect land, water-source or other '
                                                         'resource rights. Ward offices confirmed no customary or statutory rights are touched.'),
                                  'conflictingClaimsFound': False}],
    },
}
PD_RULES = []

# ---- MR -------------------------------------------------------------------------------------------
def srow(name, desc, unit, value, eq, freq, table):
    return {'parameterName': name, 'description': desc, 'unit': unit, 'valueApplied': value, 'equationNumber': eq,
            'monitoringFrequency': freq, 'appendix2Table': table}


MR_OVERRIDES = {
    '/dataAndParameters/summaryRows': [
        srow('QPW_y', 'Purified water used for drinking (metered)', 'L', f'{sum(z[6] for z in sc.ZONES):,} (four zones)', 'VMR0015 Eq.(1)', 'Monthly, totalised annually', 'A2.2.1'),
        srow('m', 'Share of sampled appliances meeting all three table 11 criteria', 'fraction', '0.93 in each zone (93 of 100 sampled)', 'VMR0015 Eq.(1); AMS-III.AV table 11', 'Annual', 'A2.2.1'),
        srow('P_y', 'Persons served', 'persons', f'{sum(z[5] for z in sc.ZONES):,}', 'AMS-III.AV para 18 (cap)', 'Annual', 'A2.2.1'),
        srow('SDW network check', 'Persons connected to a public safe-drinking-water network', 'persons', '0 in all zones', 'AMS-III.AV table 13', 'Annual', 'A2.2.1'),
        srow('SDW quality check', 'Outlet water meets the safe-drinking-water standard', 'pass/fail', 'Pass in all zones (checks of 20-November-2027)', 'AMS-III.AV table 14', 'At least biennial (done annually)', 'A2.2.1'),
        srow('WQ fail share', 'Share of E. coli-tested appliances failing', 'fraction', '0.021 (2 of 95 per zone)', 'AMS-III.AV table 11 (10% gate)', 'Annual', 'A2.2.1'),
        srow('EC_Grid,L', 'Grid electricity used by UV stages and pumps', 'MWh', f'{sc.EC_GRID_MWH}', 'VT0010 v1.1 Eq.(5), (7)-(9)', 'Monthly', 'A2.2.3'),
        srow('TDL_PE,A,L', 'Grid technical losses', 'fraction', f'{sc.TDL}', 'VT0010 / TOOL05 v3.0', 'Fixed', 'A2.2.3'),
        srow('fNRB,i,y', 'Fraction of non-renewable woody biomass', 'fraction', f'{sc.FNRB} (sample test value; a real PD uses the TOOL33 Table 3 value)', 'VMR0015 Eq.(1), s9.2', 'Each verification', 'A2.2.4'),
    ],
}
MR_RULES = []

# ---- PP / VVB ---------------------------------------------------------------------------------------
PP = {'/ppFullName': sc.PP_PERSON, '/ppOrganization': sc.PP_ORG, '/ppCountry': 'United Republic of Tanzania', '/ppEmail': sc.PP_EMAIL,
      '/ppPhone': '+255 27 000 0000', '/ppRole': 'Managing Director'}
VVB = {'/vvbId': sc.VVB_ID, '/vvbName': sc.VVB_NAME, '/vvbAccreditation': 'ISO 14065 accreditation body (sample record)',
       '/accreditationNumber': 'SAMPLE-ACC-0001', '/vvbContact': sc.LEAD, '/vvbEmail': 'audits@earthwise-vvb.example',
       '/vvbCountry': 'Kenya', '/vvbScope': 'VCS sectoral scope 3 (Energy demand); validation and verification',
       '/vvbNotes': 'Sample VVB used for the VMR0015 test run.'}

# ---- Validation report --------------------------------------------------------------------------------
VAL_ASSESS = {
    'summaryDescriptionOfProject': ('Compared the PD description with the distribution plan, the filter specification sheet and the zone maps; confirmed on site in all four wards.',
                                    'The PD describes the technology, the four zones and the baseline practice accurately.'),
    'auditHistory': ('Checked the Verra registry and the proponent declaration for earlier validations or verifications.', 'This is the first validation; there is no audit history.'),
    'sectoralScopeAndClassification': ('Checked the project type against the VCS sectoral scopes and VMR0015 applicability.',
                                       'Sectoral scope 3 (Energy demand), single (not grouped) project, small-scale Type III; correctly classified.'),
    'deadlinesForParticipation': ('Compared the project start date (01-January-2027) with the date the project was listed for validation and the VCS v5.0 participation deadlines.',
                                  'The project was listed within the deadline; it is eligible to participate.'),
    'projectStartDate': ('Checked the signed distribution records of the first zone against the PD start date.', 'The start date of 01-January-2027 is supported by the first distribution records.'),
    'projectCreditingPeriod': ('Checked the crediting period against VCS Standard v5.0 for energy and industry projects.',
                               'A five-year renewable crediting period from 01-January-2027 to 31-December-2031 conforms.'),
    'projectScale': ('Compared the ex-ante annual estimate with the VCS project scale thresholds.',
                     f'Estimated annual reductions of {ER_PD:,.2f} tCO2e are below 300,000 tCO2e: project scale.'),
    'projectDesign': ('Reviewed the PD design, the zone plan and the maintenance network.', 'Single-location, multi-zone design; each zone is a project section and the policy sums the sections.'),
    'conditionsPriorToProjectInitiation': ('Reviewed the baseline survey (BLS-2026-01, 384 households) and interviewed 24 households.',
                                           'Before the project, 85% of households boiled drinking water on three-stone woody-biomass fires; consistent with the PD.'),
    'descriptionOfProjectActivity': ('Inspected 40 filters, the warehouse stock and the service points; checked the specification against the PD.',
                                     'The filters and the UV stages match the PD; the maintenance plan is adequate.'),
    'projectLocation': ('Checked the GPS coordinates and ward boundaries of the four zones.', f'The project is located in {ZONES_TXT}, as stated.'),
    'complianceWithLaws': ('Reviewed the Water Supply and Sanitation Act 2019, the TBS drinking-water standard TZS 789 and the district permits.',
                           'The project complies with applicable laws; no permit is required for household filters.'),
    'noDoubleIssuance': ('Searched other GHG programme registries and obtained a signed declaration from the proponent.', 'The project is not registered under any other GHG programme; no double issuance risk.'),
    'noDoubleClaimingWithEmissionsTradingProgramsOrBindingEmissionLimits': ('Checked whether household fuel use in Tanzania falls under an emissions trading programme or binding limit.',
                                                                          'No emissions trading programme or binding emission limit covers the emission sources; no double claiming.'),
    'noDoubleClaimingWithOtherFormsOfEnvironmentalCredit': ('Reviewed funding agreements and the proponent declaration.', 'No other environmental credit has been sought or received.'),
    'supplyChainScope3Emissions': ('Reviewed the offtake agreements and the proponent declaration on scope 3 claims.', 'No buyer claims the reductions as scope 3 reductions; conforms.'),
    'sustainableDevelopmentContributions': ('Reviewed the SDG table against the project activities.', 'Contributions to SDG 6.1, 3.9 and 7.1 are described and plausible.'),
    'leakageManagement': ('Assessed the leakage approach against VMR0015 s8.3 and AMS-I.E.', 'Leakage is addressed through Adj_LE = 0.95 fixed at validation; LE_y = 0 as the methodology requires.'),
    'sensitiveInformation': ('Checked whether any information was withheld as commercially sensitive.', 'No information was withheld; conforms.'),
    'furtherInformation': ('Reviewed the additional information section of the PD.', 'No further information affects the validation.'),
    'methodologyDetails': ('Checked the methodology title, version and tool versions against the Verra and UNFCCC websites.', 'VMR0015 v1.0 and the cited tool versions are current and correctly referenced.'),
    'eligibilityOfMethodology': ('Checked that VMR0015 v1.0 is active on the Verra website for new registrations.', 'The methodology is eligible.'),
    'projectBoundary': ('Compared the boundary and GHG sources with VMR0015 and AMS-III.AV.', 'Boundary includes the filters, the service points and grid electricity; CO2, CH4 and N2O correctly selected.'),
    'baselineScenario': ('Reviewed the baseline survey and the applicability conditions.', 'Boiling on three-stone woody-biomass fires is the correct baseline scenario.'),
    'regulatorySurplus': ('Reviewed national and district regulations on household water treatment.', 'No law requires the project activity; regulatory surplus is demonstrated.'),
    'additionalityMethods': ('Checked the VT0008 steps, the barrier evidence and the common-practice analysis (N_all = 2, N_diff = 1).',
                             'Additionality is demonstrated with VT0008; the policy confirmed the tool choice against the VMR0015 s7 limits.'),
    'methodologyDeviations': ('Checked the PD for methodology deviations.', 'No deviations are applied.'),
    'quantificationBaselineProjectLeakage': ('Recalculated the ex-ante estimate independently from Appendix 2 and the methodology records (Eq.(1), Eq.(5), VT0010).',
                                             f'The recalculation matches the policy result of {ER_PD:,.6f} tCO2e per year; the quantification is correct.'),
    'monitoringPlan': ('Reviewed the monitoring plan, the meter specification and the sampling plan (90/10).', 'The monitoring plan meets VMR0015, AMS-III.AV tables 11-14 and the CDM sampling standard.'),
}
VAL_V50B = {
    's3_2_v50B': {
        'stakeholderIdentification': [{'item': 'Stakeholder identification', 'conclusionAndProcess': 'Reviewed the stakeholder list against ward records and interviews; households, ward offices, MUWSA and local water vendors are identified. Conforms.'}],
        'stakeholderConsultation': [{'item': 'Consultation before implementation', 'conclusionAndProcess': 'Minutes of four ward meetings (November 2026) reviewed and attendees interviewed; concerns were recorded and addressed. Conforms.'}],
        'fpicAndBenefitSharingCustomary': [{'item': 'Customary rights holders and Indigenous Peoples', 'conclusionAndProcess': 'No customary rights holders or Indigenous Peoples are affected by household devices in existing homes; not applicable.'}],
        'benefitSharingOthers': [{'item': 'Benefit sharing with other rights holders', 'conclusionAndProcess': 'Filters, replacement elements and maintenance are free of charge for the life of the project; documented in the user agreements. Conforms.'}],
        'stakeholderInputTracker': [{'item': 'Stakeholder input tracker', 'conclusionAndProcess': 'The tracker records 11 inputs from the consultations with responses; reviewed and complete. Conforms.'}],
        'grievanceRedressMechanism': [{'item': 'Grievance redress mechanism', 'conclusionAndProcess': 'Free phone line and ward-office drop box tested during the site visit; responses within 14 days. Conforms.'}],
        'ecosystemRestoration': [{'item': 'Ecosystem restoration', 'conclusionAndProcess': 'Not applicable: no ecosystem restoration activity is part of the project.'}],
        'managementExpertise': [{'item': 'Management capacity and expertise', 'conclusionAndProcess': 'The operations manager and eight zone technicians are trained; training records reviewed. Conforms.'}],
        'esgRiskAssessment': [{'item': 'ESG risk assessment', 'conclusionAndProcess': 'Risk assessment reviewed (filter misuse, element disposal, worker safety); mitigation measures are proportionate. Conforms.'}],
    },
    's3_1_5_v50B': {
        'demonstration': [{'item': 'Right to operate and right to reductions', 'conclusionAndProcess': 'Household user agreements (sample of 40) and the district MoU MDC/WS/2026/14 reviewed; the proponent holds both rights. Conforms.'}],
        'landOrResourceRights': [{'item': 'Land or resource rights analysis', 'conclusionAndProcess': 'No land or resource rights are affected; confirmed with the ward offices. Conforms.'}],
    },
}
VAL_OVERRIDES = {
    '/reportId': sc.VAL_ID, '/projectRef': sc.PROJECT_ID, '/validationDate': '2026-12-15', '/templateVersion': 'v5.0B', '/projectName': sc.PROJECT_NAME,
    '/creditingPeriodStart': sc.START, '/creditingPeriodEnd': sc.CP_END, '/documentCompletionDate': '2026-12-15', '/documentVersion': 'v1.0',
    '/vcsStandardVersion': 'VCS Standard v5.0', '/methodologyIdVersion': METH, '/clientNameContact': CLIENT,
    '/vvbId': sc.VVB_ID, '/vvbName': f'{sc.VVB_NAME}, audits@earthwise-vvb.example', '/approvedBy': f'{sc.APPROVER} (Technical Director)',
    '/teamLead': f'{sc.LEAD} (lead auditor)', '/teamMembers': TEAM,
    '/summary': ('Validation of the Kilimanjaro Safe Water Project against VCS Standard v5.0 and VMR0015 v1.0 at reasonable assurance and 5% materiality. '
                 'Document review, a three-day site visit to all four zones and interviews. 1 CAR and 2 CLs were raised and closed; no FARs. '
                 f'The project is validated with an estimated {ER_PD:,.2f} tCO2e per year.'),
    '/s1_introduction/scopeAndCriteria': 'VCS Standard v5.0, VCS Program Guide v5.0, VMR0015 v1.0, AMS-III.AV v09.0 and the tools it cites; scope: the PD dated 30-October-2026 and its annexes.',
    '/s1_introduction/reasonablenessOfAssumptions': 'Reasonable assurance, 5% materiality; each assumption (X_boil, BL_fuel, n_wb, fNRB) was checked against survey data or the methodology default.',
    '/s1_introduction/summaryDescriptionOfProject': DESC,
    '/s2_validationProcess/documentReview/reviewSummary/reviewStartDate': '2026-11-16', '/s2_validationProcess/documentReview/reviewSummary/reviewCompletionDate': '2026-12-04',
    '/s2_validationProcess/documentReview/reviewSummary/daysWorked': 14,
    '/s2_validationProcess/documentReview/reviewSummary/descriptionOfReview': 'Review of the PD, the baseline survey data set, the filter specification, the distribution plan, the user agreements and the policy calculation.',
    '/s2_validationProcess/documentReview/reviewSummary/auditTeamMembers': TEAM,
    '/s2_validationProcess/interviews/processProjectProponent': 'Face-to-face interviews with the managing director, the operations manager and two zone technicians during the site visit.',
    '/s2_validationProcess/interviews/processStakeholderGroups': '24 households selected at random from the baseline survey list (6 per zone), plus the four ward executive officers.',
    '/s2_validationProcess/siteVisits/siteVisitStart': '2026-11-23', '/s2_validationProcess/siteVisits/siteVisitEnd': '2026-11-25',
    '/s2_validationProcess/siteVisits/visitIncludedFacilities': True,
    '/s2_validationProcess/siteVisits/methodsAndObjectives': 'Confirm the baseline practice, the filter specification, the meter installation and the maintenance arrangements.',
    '/s2_validationProcess/siteVisits/locationsVisited': f'{ZONES_TXT}; the Moshi warehouse and the four service points.',
    '/s2_validationProcess/siteVisits/teamMembers': f'{sc.LEAD} (lead auditor); {sc.EXPERT} (technical expert)',
    '/s2_validationProcess/carResolution/resolutionProcess': 'Each finding was logged, answered by the proponent with evidence, and closed by the lead auditor after review.',
    '/s2_validationProcess/carResolution/totalCARs': 1, '/s2_validationProcess/carResolution/totalCLs': 2,
    '/s2_validationProcess/carResolution/totalFARs': 0, '/s2_validationProcess/carResolution/totalAll': 3,
    '/s4_validationOpinion/conclusionSummary/dateOfOpinion': '2026-12-15',
    '/s4_validationOpinion/conclusionSummary/ghgStatement': f'The proponent states estimated reductions of {ER_PD:,.6f} tCO2e per year for 01-January-2027 to 31-December-2031; the statement is the responsibility of the proponent.',
    '/s4_validationOpinion/conclusionSummary/objectivesScopeCriteria': 'Objective: assess conformance with VCS v5.0 and VMR0015 v1.0. Scope: the PD and its annexes. Criteria: VCS Standard v5.0, VMR0015 v1.0, AMS-III.AV v09.0 and its tools.',
    '/s4_validationOpinion/conclusionSummary/dataAndInformationSupportingStatement': 'Projected (ex-ante) data based on the baseline survey and methodology defaults.',
    '/s4_validationOpinion/conclusionOnEstimatedReductions/conclusionText': f'The ex-ante estimate of {ER_PD:,.2f} tCO2e per year is reasonable and correctly calculated.',
    '/s4_validationOpinion/conclusionOnEstimatedReductions/estimatedByVintage': [
        {'vintageStart': f'{y}-01-01', 'vintageEnd': f'{y}-12-31', 'country': 'United Republic of Tanzania', 'methodology': 'VMR0015 v1.0', 'estimatedBaselineEmissions': r6(BE_PD), 'estimatedProjectEmissions': r6(PE),
         'estimatedLeakageEmissions': 0, 'estimatedNetReductions': r6(ER_PD), 'estimatedNetRemovals': 0, 'estimatedNetReductionsAndRemovals': r6(ER_PD)}
        for y in range(2027, 2032)],
    '/validationOpinion': 'Validated',
    '/appendix3Competence': [{'name': sc.LEAD, 'role': 'Lead auditor', 'qualifications': 'VCS lead auditor; 9 years of validation and verification in household energy and water projects; ISO 14064-3 trained'}, {'name': sc.EXPERT, 'role': 'Technical expert', 'qualifications': 'MSc water engineering; 7 years of water-quality laboratory and sampling work; technical expert for AMS-III.AV'}, {'name': sc.REVIEWER, 'role': 'Technical reviewer', 'qualifications': 'Independent technical reviewer; 10 years of CDM/VCS review experience in sectoral scope 3; not part of the audit team'}],
    '/appendix2CarsClsFars': [
        {'findingId': 'CAR-01', 'findingType': 'CAR', 'dateRaised': '2026-11-26', 'raisedBy': 'Grace Mushi', 'documentReference': 'PD section 5.1 / Appendix 2 A2.2.4', 'summaryOfFinding': 'The PD cited a superseded fNRB source.', 'assessmentAndConclusion': 'PD updated to fNRB option 3 (TOOL33 Table 3) with the value and the date of access recorded (0.62 in this sample is a test value, not the published figure). Evidence reviewed; closed 2026-12-02.'},
        {'findingId': 'CL-01', 'findingType': 'CL', 'dateRaised': '2026-11-26', 'raisedBy': 'Daniel Okello', 'documentReference': 'PD annex 4 (meters)', 'summaryOfFinding': 'Calibration evidence for the inline meters was not in the annexes.', 'assessmentAndConclusion': 'Batch calibration certificates added and checked; closed 2026-12-01.'},
        {'findingId': 'CL-02', 'findingType': 'CL', 'dateRaised': '2026-11-26', 'raisedBy': 'Grace Mushi', 'documentReference': 'PD section 5.3 (monitoring plan)', 'summaryOfFinding': 'The method for the table 13 public-network check was unclear.', 'assessmentAndConclusion': 'Monitoring plan now states the annual check with MUWSA and the ward office; closed 2026-12-01.'},
    ],
    **{('/' + k): v for k, v in VAL_V50B.items()},
}

# ---- Verification report -------------------------------------------------------------------------------
VER_ASSESS = {
    'methodologyDeviations': ('Checked the MR for methodology deviations.', 'No deviations were applied in this period.'),
    'projectDescriptionDeviations': ('Compared the implemented project with the registered PD.', 'No project description deviations.'),
    'newProjectActivityInstances': ('Checked whether new instances were added.', 'Not a grouped project; no new instances.'),
    'baselineReassessment': ('Checked whether a baseline reassessment was due.', 'Not due in the first crediting period.'),
    'generalImplementationStatus': ('Inspected 60 filters in the four zones and the distribution register.', 'All 3,000 filters were distributed and operating as described in the MR.'),
    'lossEvents': ('Checked for loss events.', 'Not applicable: no carbon stocks; no loss events.'),
    'auditHistory': ('Checked the registry history.', 'Validation by the same VVB on 15-December-2026; this is the first verification.'),
    'sectoralScopeAndClassification': ('Checked the classification against the PD.', 'Sectoral scope 3; unchanged.'),
    'projectLocation': ('Checked the GPS coordinates of the sampled households.', 'All sampled filters are inside the four registered zones.'),
    'noDoubleIssuance': ('Searched other registries and checked the proponent declaration.', 'No double issuance.'),
    'registrationOtherGhgPrograms': ('Searched other GHG programmes.', 'Not registered under another GHG programme.'),
    'noDoubleClaimingEts': ('Checked emissions trading coverage.', 'No emissions trading programme covers the sources.'),
    'noDoubleClaimingOtherCredit': ('Reviewed funding agreements.', 'No other environmental credit was received.'),
    'scope3Emissions': ('Reviewed buyer declarations.', 'No scope 3 claims by buyers.'),
    'sustainableDevelopmentContributions': ('Compared reported SDG contributions with records.', 'Reported contributions are supported by records.'),
    'sensitiveInformation': ('Checked for withheld information.', 'None withheld.'),
    'ccpLabelEligibility': ('Checked the MR statement on CCP labels.', 'No CCP label is requested.'),
    'corsiaLabelEligibility': ('Checked the MR statement on CORSIA labels.', 'No CORSIA label is requested.'),
    'accuracyOfCalculations': ('Recalculated QPW, m, BE, PE and ER for each zone from the meter data and the 400 sampled functionality checks.',
                               f'The recalculation matches the policy result of {ER_MR:,.6f} tCO2e; the calculation is accurate.'),
    'qualityOfEvidence': ('Traced meter readings, laboratory reports and survey records to source documents for a random 10% of records.', 'Evidence is sufficient and appropriate.'),
    'nonPermanenceRiskAnalysis': ('Checked applicability.', 'Not applicable to a non-AFOLU project.'),
    'bufferPoolAllocation': ('Checked applicability.', 'No buffer contribution applies to a non-AFOLU project.'),
    'longTermAverage': ('Checked applicability.', 'Not applicable.'),
    'deMinimisQuantification': ('Checked sources excluded as de minimis.', 'No source was excluded as de minimis.'),
    'monitoringPlan': ('Checked monitoring against the registered plan.', 'Monitoring followed the plan, including the annual table 13 and table 14 checks.'),
}
VER_V50B = {
    's4_3_v50B': {
        'stakeholderIdentification': [{'item': 'Stakeholder identification', 'conclusionAndProcess': 'Stakeholder list updated with two new ward officers; reviewed. Conforms.'}],
        'stakeholderConsultation': [{'item': 'Ongoing consultation', 'conclusionAndProcess': 'Quarterly ward meetings held; minutes reviewed. Conforms.'}],
        'fpicAndBenefitSharingCustomary': [{'item': 'Customary rights holders and Indigenous Peoples', 'conclusionAndProcess': 'Not applicable.'}],
        'benefitSharingOthers': [{'item': 'Benefit sharing', 'conclusionAndProcess': '214 free replacement elements issued; records sampled. Conforms.'}],
        'stakeholderInputTracker': [{'item': 'Stakeholder input tracker', 'conclusionAndProcess': 'Two inputs on replacement speed, both answered within 14 days. Conforms.'}],
        'grievanceRedressMechanism': [{'item': 'Grievance redress', 'conclusionAndProcess': 'Two grievances received and resolved within 14 days. Conforms.'}],
        'managementExpertise': [{'item': 'Management capacity', 'conclusionAndProcess': 'Staffing unchanged; refresher training held. Conforms.'}],
        'esgRiskMonitoring': [{'item': 'ESG risk monitoring', 'conclusionAndProcess': 'No realised ESG risks; mitigation measures implemented. Conforms.'}],
    },
    's4_2_8_v50B': {
        'demonstration': [{'item': 'Right to operate and right to reductions', 'conclusionAndProcess': 'No change in the period; user agreements for new replacement units sampled. Conforms.'}],
        'landOrResourceRights': [{'item': 'Land or resource rights', 'conclusionAndProcess': 'No land or resource rights affected. Conforms.'}],
    },
}
VER_OVERRIDES = {
    '/verificationId': sc.VER_ID, '/monitoringReportRef': sc.MR_ID, '/projectRef': sc.PROJECT_ID, '/templateVersion': 'v5.0B',
    '/projectName': sc.PROJECT_NAME, '/verificationPeriodStart': sc.MP_START, '/verificationPeriodEnd': sc.MP_END,
    '/documentCompletionDate': '2028-01-31', '/documentVersion': 'v1.0', '/vcsStandardVersion': 'VCS Standard v5.0', '/methodologyIdVersion': METH,
    '/clientNameContact': CLIENT, '/vvbId': sc.VVB_ID, '/vvbName': f'{sc.VVB_NAME}, audits@earthwise-vvb.example',
    '/approvedBy': f'{sc.APPROVER} (Technical Director)', '/teamLead': f'{sc.LEAD} (lead auditor)', '/teamMembers': TEAM,
    '/summary': (f'Verification of monitoring period {sc.MP_START} to {sc.MP_END} (MR {sc.MR_ID}) against VCS v5.0 and VMR0015 v1.0, reasonable assurance, '
                 f'5% materiality. Document review, site visit and recalculation. 0 CARs, 1 CL (closed), 0 FARs. Verified reductions: {ER_MR:,.6f} tCO2e.'),
    '/s1_introduction/scopeAndCriteria': f'VCS Standard v5.0, VMR0015 v1.0, AMS-III.AV v09.0 and its tools; scope: MR {sc.MR_ID} and its records.',
    '/s1_introduction/levelOfAssurance': 'Reasonable assurance', '/s1_introduction/materialityThreshold': '5% (project below 300,000 tCO2e per year)',
    '/s1_introduction/summaryDescriptionOfProject': DESC,
    '/s2_process/documentReview/reviewSummary/reviewStartDate': '2028-01-10', '/s2_process/documentReview/reviewSummary/reviewCompletionDate': '2028-01-28',
    '/s2_process/documentReview/reviewSummary/daysWorked': 12,
    '/s2_process/documentReview/reviewSummary/descriptionOfReview': 'Review of the MR, monthly meter records, the 400 functionality-check records, laboratory reports and the policy calculation.',
    '/s2_process/documentReview/reviewSummary/auditTeamMembers': TEAM,
    '/s2_process/interviews/processProjectProponent': 'Interviews with the operations manager and all four zone technicians on site.',
    '/s2_process/interviews/processStakeholderGroups': '40 households selected at random from the functionality-check sample (10 per zone).',
    '/s2_process/siteVisits/siteVisitStart': '2028-01-17', '/s2_process/siteVisits/siteVisitEnd': '2028-01-19', '/s2_process/siteVisits/visitIncludedFacilities': True,
    '/s2_process/siteVisits/methodsAndObjectives': 'Inspect filters and meters, re-read 60 meters, observe E. coli sampling, verify the network and water-quality checks.',
    '/s2_process/siteVisits/locationsVisited': f'{ZONES_TXT}; the four service points and the laboratory.',
    '/s2_process/siteVisits/teamMembers': f'{sc.LEAD} (lead auditor); {sc.EXPERT} (technical expert)',
    '/s2_process/carResolution/resolutionProcess': 'Findings logged, answered with evidence, closed by the lead auditor.',
    '/s2_process/carResolution/totalCARs': 0, '/s2_process/carResolution/totalCLs': 1, '/s2_process/carResolution/totalFARs': 0, '/s2_process/carResolution/totalAll': 1,
    '/s2_process/eligibilityForValidationActivities': 'The VVB is accredited for validation and verification in sectoral scope 3 (sample record).',
    '/s5_verificationOpinion/conclusionSummary/dateOfOpinion': '2028-01-31',
    '/s5_verificationOpinion/conclusionSummary/ghgStatement': f'The proponent states {ER_MR:,.6f} tCO2e of reductions for {sc.MP_START} to {sc.MP_END}; the statement is the responsibility of the proponent.',
    '/s5_verificationOpinion/conclusionSummary/objectivesScopeCriteria': 'Objective: verify the GHG statement. Scope: MR and records for the period. Criteria: VCS Standard v5.0, VMR0015 v1.0, AMS-III.AV v09.0 and its tools.',
    '/s5_verificationOpinion/conclusionSummary/dataAndInformationSupportingStatement': 'Historical (measured) data.',
    '/s5_verificationOpinion/conclusionOnAchievedReductions/verificationPeriodStart': sc.MP_START,
    '/s5_verificationOpinion/conclusionOnAchievedReductions/verificationPeriodEnd': sc.MP_END,
    '/s5_verificationOpinion/conclusionOnAchievedReductions/achievedByVintage': [
        {'country': 'United Republic of Tanzania', 'methodology': 'VMR0015 v1.0', 'vintageStart': sc.MP_START, 'vintageEnd': sc.MP_END, 'netBaselineEmissions': r6(BE_MR), 'netProjectEmissions': r6(PE), 'leakageEmissions': 0,
         'totalNetReductions': r6(ER_MR), 'totalNetRemovals': 0, 'totalNetReductionsAndRemovals': r6(ER_MR)}],
    '/s5_verificationOpinion/conclusionOnAchievedReductions/verifiedByVintage': [
        {'vintageStart': sc.MP_START, 'vintageEnd': sc.MP_END, 'totalNetReductions': r6(ER_MR), 'totalNetRemovals': 0, 'totalNetReductionsAndRemovals': r6(ER_MR)}],
    '/s5_verificationOpinion/exAnteVsExPost/comparison': [
        {'vintageStart': sc.MP_START, 'vintageEnd': sc.MP_END, 'exAnteReductionsRemovals': r6(ER_PD), 'achievedReductionsRemovals': r6(ER_MR), 'percentDifference': round(PCT, 2), 'explanationForDifference': 'Monitored functionality (m = 0.93 against 0.95 planned) and metered volume (12.54 million L against 13.14 million L planned) were lower than the ex-ante assumptions.'}],
    '/verificationConclusion': 'Verified', '/ERcalculated': r6(ER_MR), '/ERverified': r6(ER_MR),
    '/appendix3Competence': [{'name': sc.LEAD, 'role': 'Lead auditor', 'qualifications': 'VCS lead auditor; 9 years of validation and verification in household energy and water projects; ISO 14064-3 trained'}, {'name': sc.EXPERT, 'role': 'Technical expert', 'qualifications': 'MSc water engineering; 7 years of water-quality laboratory and sampling work; technical expert for AMS-III.AV'}, {'name': sc.REVIEWER, 'role': 'Technical reviewer', 'qualifications': 'Independent technical reviewer; 10 years of CDM/VCS review experience in sectoral scope 3; not part of the audit team'}],
    '/appendix2CarsClsFars': [
        {'findingId': 'CL-01', 'findingType': 'CL', 'dateRaised': '2028-01-20', 'raisedBy': 'Daniel Okello', 'documentReference': 'MR annex 3 (laboratory reports)', 'summaryOfFinding': 'Two E. coli results lacked the laboratory batch number.', 'assessmentAndConclusion': 'Batch numbers added from the laboratory register and traced; closed 2028-01-24.'}],
    **{('/' + k): v for k, v in VER_V50B.items()},
}


def assess_rules(table):
    rules = []
    for seg, (proc, concl) in table.items():
        rules.append((rf'/{seg}/assessmentProcess$', proc))
        rules.append((rf'/{seg}/assessmentConclusion$', concl))
    return rules


VCU = {'/requestNote': f'Request issuance for {sc.VER_ID} (MR {sc.MR_ID}, period {sc.MP_START} to {sc.MP_END}).',
       '/verificationId': sc.VER_ID, '/monitoringReportRef': sc.MR_ID, '/projectRef': sc.PROJECT_ID, '/verificationConclusion': 'Verified',
       '/ERcalculated': r6(ER_MR), '/ERverified': r6(ER_MR)}

OVERRIDES = {'PP': PP, 'VVB': VVB, 'VAL': VAL_OVERRIDES, 'VER': VER_OVERRIDES, 'VCU': VCU}
SAMPLES = {}
RULES = {'VAL': assess_rules(VAL_ASSESS), 'VER': assess_rules(VER_ASSESS)}
# fields the form pre-fills read-only from the source document: left out of the draft file (kept in *.full.json for checks)
READONLY = {'VAL': ('projectRef',), 'VER': ('monitoringReportRef', 'projectRef', 'ERcalculated'),
            'VCU': ('verificationId', 'monitoringReportRef', 'projectRef', 'verificationConclusion', 'ERcalculated', 'ERverified')}

# PD 3.2.2 applicability (AMS-III.AV v09.0 paras 2-4, VMR0015 s4)
_AC = '/section3/applicabilityEligibility/applicabilityConditions/'
PD_OVERRIDES.update({
    _AC + 'c2KioskSolarDisinfection': 'Not applicable - no water kiosk uses solar disinfection',
    _AC + 'c2KioskSolarDisinfectionEvidence': 'The project distributes household ceramic filters only; the four service points sell replacement elements and do not treat or sell water.',
    _AC + 'c3SoilFiltrationWells': 'Not applicable - no boreholes or wells',
    _AC + 'c3SoilFiltrationWellsEvidence': 'No borehole, well or soil filtration scheme is part of the project.',
    _AC + 'c4aNoPublicNetwork': 'Met - no public network supplied SDW to the project boundary',
    _AC + 'c4aNoPublicNetworkEvidence': 'Moshi District infrastructure register (Annex 4) and the November 2026 network check recorded below: no public safe-water network reaches the four zones.',
    _AC + 'c4bTechnologyStandard': 'Met',
    _AC + 'c4bTechnologyStandardEvidence': 'Filters meet the Tanzanian national drinking water standard TZS 789 across physical, chemical and microbiological parameters, verified by accredited laboratory challenge-water testing (Annex 5).',
    _AC + 'c4cReplacementAccess': 'Not applicable - rated life is not shorter than the crediting period',
    _AC + 'c4cReplacementAccessEvidence': "Manufacturer's rated life of the filter unit is 7 years, longer than the 5-year crediting period; the ceramic element is replaced every 2 years under the maintenance plan and failed units within 14 days.",
    _AC + 'c4dSafeWaterDelivered': 'Met',
    _AC + 'c4dSafeWaterDeliveredEvidence': 'Pre-registration field test of 40 installed filters: all treated-water samples below 1 cfu E. coli per 100 ml (LDL 1 cfu), Annex 7.',
    _AC + 'vmrReddAssessment': 'Assessed and reported',
    _AC + 'vmrReddAssessmentEvidence': 'National assessment on 15 November 2026: no REDD+ project or jurisdictional REDD+ programme overlaps the expected fuel source area (table below).',
})
PD_OVERRIDES['/section1/projectEligibility/methodologyEligibility'] = 'The applicability conditions of AMS-III.AV v09.0 (paras 2-4) and VMR0015 section 4 are met; each is recorded with its evidence in section 3.2.2. The technology meets the national drinking water standard (para 4(b)), no public safe-water network supplied the project area before the project (para 4(a)), and baseline boiling with firewood is evidenced by the household survey.'
