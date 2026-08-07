import { DocumentType } from './types';

/**
 * Classifies a schema into a coarse Guardian document type by NAME (the reliable
 * signal). `schemaId` and `fieldTitles` are weak secondary signals used ONLY to
 * disambiguate pdd vs registration — never to trigger the
 * validation/monitoring/verification categories, where a false positive would
 * wrongly suppress field extraction downstream.
 *
 * Verification is checked BEFORE validation so a combined "Validation &
 * Verification" report resolves to the non-suppressing 'verificationReport'.
 */
export function classifyDocumentType(
    schemaName: string | undefined | null,
    schemaId: string | undefined | null,
    fieldTitles: string[] = [],
): DocumentType {
    const name = (schemaName ?? '').toLowerCase();

    if (name.includes('monitoring')) return 'monitoringReport';
    if (name.includes('verification') || name.includes('verify')) return 'verificationReport';
    if (name.includes('validation') || name.includes('validate')) return 'validationReport';
    if (
        name.includes('pdd') ||
        name.includes('design document') ||
        name.includes('project design') ||
        name.includes('project description')
    ) {
        return 'pdd';
    }
    if (
        name.includes('registration') ||
        name.includes('registry request') ||
        name.includes('information note') ||
        name.includes('project information')
    ) {
        return 'registration';
    }

    // Name was generic — consult weak signals for the benign pdd/registration split only.
    const id = (schemaId ?? '').toLowerCase();
    if (id.includes('pdd')) return 'pdd';
    const titles = fieldTitles.join(' ').toLowerCase();
    if (titles.includes('design document') || titles.includes('project design')) return 'pdd';

    return 'unknown';
}
