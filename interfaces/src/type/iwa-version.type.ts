/**
 * IWA dMRV specification version a schema's field properties are authored against.
 *
 * Schemas created before IWA v3 support was added carry no version tag at all.
 * They must be read as V1, never as the current default because their field
 * `property` values are frozen once published and cannot be rewritten.
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
 * Translate a single IWA v1 property path to its v3 equivalent.
 * Returns null when v3 dropped the property, so callers can report it as
 * needing manual attention rather than silently rewriting it to something wrong.
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
 * One field's outcome when remapping a schema from IWA v1 to v3.
 */
export interface IIwaFieldRemap {
    /**
     * Dot-joined location of the field inside the schema document.
     */
    field: string;
    /**
     * The IWA property path the field carried before the remap.
     */
    from: string;
    /**
     * The v3 path it maps to, or null when v3 dropped the property.
     */
    to: string | null;
}

/**
 * Result of remapping a schema document from IWA v1 to v3.
 */
export interface IIwaUpgradeReport {
    /**
     * Fields whose property path is the same in both versions.
     */
    unchanged: IIwaFieldRemap[];
    /**
     * Fields whose property path v3 renamed or moved.
     */
    renamed: IIwaFieldRemap[];
    /**
     * Fields whose property v3 removed with no equivalent. Applying the upgrade
     * clears these, so they are surfaced for the author to reassign by hand.
     */
    unmappable: IIwaFieldRemap[];
}
