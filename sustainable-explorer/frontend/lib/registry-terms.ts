export interface RegistryTermMapping {
    canonical: string;
    description: string;
    terms: Record<string, string>;
}

export const REGISTRY_TERM_MAPPINGS: RegistryTermMapping[] = [
    {
        canonical: 'Credit Issuance',
        description: 'The creation of new carbon credits from a verified project',
        terms: { 'Verra': 'VCU Issuance', 'Gold Standard': 'GS-VER Issuance', 'ACR': 'Offset Issuance', 'CAR': 'CRT Issuance' },
    },
    {
        canonical: 'Credit Quantity',
        description: 'Number of credits issued, transferred, or retired',
        terms: { 'Verra': 'Issuance Volume', 'Gold Standard': 'Credits Issued', 'ACR': 'Offset Quantity', 'CAR': 'CRT Quantity' },
    },
    {
        canonical: 'Ownership Transfer',
        description: 'Transfer of credit ownership between entities',
        terms: { 'Verra': 'VCU Transfer', 'Gold Standard': 'Credit Transfer', 'ACR': 'Offset Transfer', 'CAR': 'CRT Transfer' },
    },
    {
        canonical: 'Credit Retirement',
        description: 'Permanent removal of credits from circulation for offsetting',
        terms: { 'Verra': 'VCU Cancellation', 'Gold Standard': 'Credit Retirement', 'ACR': 'Offset Retirement', 'CAR': 'CRT Retirement' },
    },
    {
        canonical: 'Project Developer',
        description: 'The entity that develops and operates the project',
        terms: { 'Verra': 'Project Proponent', 'Gold Standard': 'Project Developer', 'ACR': 'Project Operator', 'CAR': 'Project Developer' },
    },
    {
        canonical: 'Validation',
        description: 'Independent assessment that a project meets methodology requirements',
        terms: { 'Verra': 'Validation', 'Gold Standard': 'Preliminary Review', 'ACR': 'Validation', 'CAR': 'Listing' },
    },
    {
        canonical: 'Verification',
        description: 'Periodic audit confirming emission reductions achieved',
        terms: { 'Verra': 'Verification', 'Gold Standard': 'Performance Review', 'ACR': 'Verification', 'CAR': 'Verification' },
    },
    {
        canonical: 'Vintage',
        description: 'The year in which the emission reductions occurred',
        terms: { 'Verra': 'Vintage', 'Gold Standard': 'Vintage', 'ACR': 'Vintage Year', 'CAR': 'Vintage' },
    },
];

export function getRegistryTerm(canonical: string, registry: string): string | undefined {
    const mapping = REGISTRY_TERM_MAPPINGS.find(m => m.canonical === canonical);
    return mapping?.terms[registry];
}
