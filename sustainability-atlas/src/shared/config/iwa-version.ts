/**
 * IWA dMRV spec version a schema's field `property` paths are authored against,
 * plus the pure v1 -> v3 path mapping. Consumed by the decode-time field binder
 * and the project export.
 *
 * A schema with no version tag is read as V1 (its published `property` values
 * are frozen and can't be rewritten), never as the create-time default.
 */
export enum IwaVersion {
    V1 = '1.0.0',
    V3 = '3.0.0'
}

/**
 * Version stamped on newly created schemas.
 */
export const DEFAULT_IWA_VERSION = IwaVersion.V3;

/**
 * Resolve the IWA version of a schema-like object.
 */
export function resolveIwaVersion(schema?: { iwaVersion?: string } | null): IwaVersion {
    return schema?.iwaVersion === IwaVersion.V3 ? IwaVersion.V3 : IwaVersion.V1;
}

/**
 * Entity renames between IWA v1 and v3. Applied to every field of the entity
 * unless a more specific IWA_PATH_RENAMES entry overrides it.
 */
const IWA_ENTITY_RENAMES: Readonly<Record<string, string>> = {
    ImpactClaimCheckpoint: 'Checkpoint',
    SdpFile: 'DataFile',
    SpanDataPackage: 'DataPackage',
    VerificationProcessAgreement: 'OriginationProcessAgreement',
    CoBenefit: 'Co-Benefit'
};

/**
 * The MRV extension family collapsed into EntityExtension across every entity.
 */
const IWA_FIELD_RENAMES: Readonly<Record<string, string>> = {
    mrvExtensions: 'entityExtensions'
};

/**
 * Explicit v1 -> v3 path renames. These win over the entity/field rules above.
 */
const IWA_PATH_RENAMES: Readonly<Record<string, string>> = {
    'AccountableImpactOrganization.country': 'ActivityImpactModule.country',
    'AccountableImpactOrganization.region': 'ActivityImpactModule.region',
    'Address.zip': 'Address.postalCode',
    'Attestation.proofType': 'Attestation.proof_type',
    'Audits.auditDate': 'Audits.lastAuditDate',
    'CRU.referencedCredit': 'CRU.referencedCru',
    'CRU.appliedToId': 'CRU.appliedToReportingPeriodId',
    'CheckpointResult.linkToVerificationData': 'CheckpointResult.verifiedLinkToProcessDataResult',
    'CoreCarbonPrinciples.assetId': 'CRU.assetId',
    'CoreCarbonPrinciples.issuanceDate': 'CRU.issuanceDate',
    'CoreCarbonPrinciples.vintage': 'CRU.vintage',
    'CoreCarbonPrinciples.parisAgreementCompliance': 'CoreCarbonPrinciples.paCompliance',
    'CoreCarbonPrinciples.quantifiedSdgImpacts': 'CoreCarbonPrinciples.quantifiedSDGImpacts',
    'CoreCarbonPrinciples.adaptationCoBenefits': 'CoreCarbonPrinciples.adaptionCoBenefits',
    'DatePoint.timeStamp': 'DatePoint.timestamp',
    'DateRange.startDate': 'DateRange.start',
    'DateRange.endDate': 'DateRange.end',
    'Degradable.degradationType': 'Degradable.degredationType',
    'DigitalSignature.vc': 'DigitalSignature.credential',
    'ImpactClaim.coBenefits': 'ImpactClaim.co-benefits',
    'ImpactClaimCheckpoint.verifiedLinkToCheckpointData': 'DataPackage.verifiedLinkToCheckpointData',
    'ImpactClaimCheckpoint.spanDataPackage': 'Checkpoint.dataPackages',
    'MRVRequirements.measurementSpecification': 'MRVRequirements.MeasurementSpecification',
    'Manifest.sdpFiles': 'Manifest.files',
    'MitigationActivity.category': 'MitigationActivity.carbonCategory',
    'PACompliance.ca': 'PACompliance.correspondingAdjustment',
    'ProcessedClaim.vpaId': 'ProcessedClaim.opaId',
    'ProcessedClaim.coBenefits': 'ProcessedClaim.co-benefits',
    'QualityStandard.methodologyAndTools': 'QualityStandard.methdologyAndTools',
    'QualityStandard.coBenefits': 'QualityStandard.co-benefits',
    'REC.recType': 'REC.type',
    'REC.appliedToId': 'REC.appliedToReportingPeriodId',
    'ReferencedCredit.id': 'ReferencedCredit.referencedCreditId',
    'ReferencedRec.id': 'ReferencedCredit.referencedCreditId',
    'ValidationStep.validationStepDocumentLink': 'ValidationStep.stepDocumentLink',
    'VerificationProcessAgreement.auditSchedule': 'OriginationProcessAgreement.AuditSchedule',
    'VerificationProcessAgreement.audits': 'OriginationProcessAgreement.Audits',
    'VerificationProcessAgreement.activityImpactModule': 'OriginationProcessAgreement.projectModules',
    'CoBenefit.unSdg': 'Co-Benefit.un-sdg'
};

/**
 * v1 paths with no v3 equivalent: back-references the spec dropped, the retired
 * MRV extension types, and Guardian-local additions the spec never carried.
 */
const IWA_REMOVED_IN_V3: ReadonlySet<string> = new Set([
    'ActivityImpactModule.accountableImpactOrganization',
    'ActivityImpactModule.projectStartDate',
    'ActivityImpactModule.projectCreditingPeriod',
    'ActivityImpactModule.projectMonitoringPeriod',
    'ImpactClaim.activityImpactModule',
    'ProcessedClaim.verificationProcessAgreement',
    'ProcessedClaim.impactClaim',
    'ProcessedClaim.asset',
    'CRU.processedClaim',
    'REC.processedClaim',
    'Tag.data',
    'VerificationProcessAgreement.aimId',
    'VerificationProcessAgreement.processedClaims',
    'DigitalSignature.signatureCase',
    'Any.typeUrl', 'Any.value',
    'Timestamp.seconds', 'Timestamp.nanos',
    'DataExtension.key', 'DataExtension.value', 'DataExtension.data',
    'MrvExtension.mrvExtensionContext', 'MrvExtension.typedExtension',
    'MrvExtension.untypedExtension', 'MrvExtension.extensionCase',
    'TypedExtension.dataSchema', 'TypedExtension.documentation', 'TypedExtension.data',
    'UntypedExtension.name', 'UntypedExtension.version', 'UntypedExtension.description',
    'UntypedExtension.documentation', 'UntypedExtension.dataExtensions'
]);

/**
 * Translate an IWA v1 property path to its v3 equivalent. Returns null when v3
 * dropped the property. Idempotent on v3 paths.
 */
export function mapIwaPathV1ToV3(path: string): string | null {
    if (!path) {
        return null;
    }
    if (IWA_REMOVED_IN_V3.has(path)) {
        return null;
    }
    if (IWA_PATH_RENAMES[path]) {
        return IWA_PATH_RENAMES[path];
    }
    const separator = path.indexOf('.');
    if (separator < 0) {
        return path;
    }
    const entity = path.slice(0, separator);
    const field = path.slice(separator + 1);
    return `${IWA_ENTITY_RENAMES[entity] || entity}.${IWA_FIELD_RENAMES[field] || field}`;
}

/**
 * Canonicalise a path to v3 for the version it was authored under. V1 is mapped
 * up; v3/absent is returned as-is; null/empty and removed-in-v3 give null.
 */
export function iwaPathForVersion(
    path: string | null | undefined,
    version: IwaVersion,
): string | null {
    if (!path) {
        return null;
    }
    return version === IwaVersion.V3 ? path : mapIwaPathV1ToV3(path);
}

/**
 * Split an `iwaField` spec into its paths. A spec may be a comma-compound such
 * as `"ImpactClaim.startDate,ImpactClaim.endDate"`.
 */
export function iwaFieldPaths(spec: string | null | undefined): string[] {
    return (spec ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
