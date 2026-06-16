function escapeCsv(val: unknown): string {
    const s = val == null ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function toCsvRow(fields: unknown[]): string {
    return fields.map(escapeCsv).join(',');
}

export function downloadCsv(filename: string, rows: string[][]): void {
    const content = rows.map(r => toCsvRow(r)).join('\r\n');
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function csvDateStamp(): string {
    return new Date().toISOString().slice(0, 10);
}

export function isoDate(val: string | null | undefined): string {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toISOString().slice(0, 10);
}

export function buildProjectCsvRows(projects: any[], network: string = ''): string[][] {
    const header = [
        'Network', 'Name', 'Description', 'Country', 'Latitude', 'Longitude',
        'Methodology', 'Registry Name', 'Developer', 'Credits', 'Status', 'Vintage',
        'SDGs', 'Co-benefits', 'Category', 'Sector', 'Sectoral Scope', 'Created At',
        'Crediting Period Start', 'Crediting Period End', 'Issuance Count',
        'Total Issued', 'Total Retired', 'Total Active',
    ];
    const rows = projects.map(p => [
        network,
        p.name ?? '',
        p.description ?? '',
        p.country ?? '',
        p.lat ?? '',
        p.lng ?? '',
        p.methodology ?? '',
        p.registry ?? '',
        p.developer ?? '',
        p.credits ?? 0,
        p.status ?? '',
        p.vintage ?? '',
        Array.isArray(p.sdgs) ? p.sdgs.join(';') : (p.sdgs ?? ''),
        (p as any).cobenefits ?? '',
        p.category ?? '',
        p.sector ?? '',
        p.sectoralScope ?? '',
        p.createdAt ?? '',
        p.creditingPeriodStart ?? '',
        p.creditingPeriodEnd ?? '',
        p.issuanceCount ?? 0,
        p.totalIssued ?? 0,
        p.totalRetired ?? 0,
        p.totalActive ?? 0,
    ]);
    return [header, ...rows];
}

export function buildCreditCsvRows(credits: any[], network: string = ''): string[][] {
    const header = [
        'Network', 'Name', 'Symbol', 'Type', 'Mint Amount',
        'Project', 'Methodology', 'Registry', 'Mint Date',
    ];
    const rows = credits.map(c => [
        network,
        c.name ?? '',
        c.symbol ?? '',
        c.type ?? '',
        c.supply ?? 0,
        c.projectDisplay ?? c.project ?? '',
        c.methodologyDisplay ?? c.methodology ?? '',
        c.registry ?? '',
        isoDate(c.mintDate),
    ]);
    return [header, ...rows];
}

export function hederaTimestamp(ts: string | null | undefined, format: 'date' | 'datetime' = 'date'): string {
    if (!ts) return '';
    const seconds = parseFloat(ts);
    if (isNaN(seconds)) return ts;
    const d = new Date(seconds * 1000);
    return format === 'datetime' ? d.toLocaleString('en-US') : d.toISOString().slice(0, 10);
}

export function buildRegistryCsvRows(registries: any[], network: string = ''): string[][] {
    const header = [
        'Network', 'Name', 'ID', 'Geography', 'Website',
        'Methodologies', 'Projects', 'Users', 'Issuances', 'Tags', 'Created',
    ];
    const rows = registries.map(r => [
        network,
        r.name ?? '',
        r.relatedTopicId ?? '',
        r.geography ?? '',
        r.website ?? '',
        r.stats?.policyCount ?? 0,
        r.stats?.projectCount ?? 0,
        r.stats?.userCount ?? 0,
        r.stats?.issuanceCount ?? 0,
        r.tags ?? '',
        hederaTimestamp(r.sourceTimestamp),
    ]);
    return [header, ...rows];
}

export function buildMethodologyCsvRows(methodologies: any[], network: string = ''): string[][] {
    const header = [
        'Network', 'Methodology Name', 'ID', 'Description', 'Status', 'Registry Name',
        'Version', 'Sectoral Scopes', 'Emission Reduction Approach',
        'Published Date',
        'Project Count', 'Issuances', 'Total Issued', 'Total Retired', 'Total Active',
    ];
    const rows = methodologies.map(m => [
        network,
        m.name ?? '',
        m.topicId ?? '',
        m.description ?? '',
        m.status ?? '',
        m.registryName ?? '',
        m.version ?? '',
        Array.isArray(m.sectoralScopes) ? m.sectoralScopes.join(';') : (m.sectoralScopes ?? ''),
        m.emissionReductionApproach ?? '',
        hederaTimestamp(m.sourceTimestamp, 'datetime'),
        m.stats?.instanceProjectCount ?? 0,
        m.stats?.instanceIssuanceCount ?? 0,
        m.totalIssued ?? 0,
        m.totalRetired ?? 0,
        m.totalActive ?? 0,
    ]);
    return [header, ...rows];
}
