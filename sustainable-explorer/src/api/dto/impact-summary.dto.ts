import { ApiProperty } from '@nestjs/swagger';
import {
    ImpactSummaryRow,
    ImpactSummarySectorRow,
} from '../repositories/impact-summary.repository';

/** Response shapes + the pure row->DTO builder for the Impact Summary aggregate, mirroring sdg.dto.ts's convention of co-locating the shaping helper next to the response classes it builds. */

/** Named sectors beyond this rank (by credits issued) are folded into one 'Others' bucket. */
export const TOP_SECTORS_LIMIT = 5;

export class ImpactSummarySdgDto {
    @ApiProperty({ description: 'SDG number (1-17)' })
    sdgId: number;

    @ApiProperty({ description: 'Official SDG name' })
    name: string;

    @ApiProperty({ description: 'Official SDG accent colour (hex)' })
    color: string;

    @ApiProperty({ description: 'Number of PROJECT rows tagged with this SDG' })
    projectCount: number;

    @ApiProperty({ description: 'Total credits (self-reported ER_y) summed across projects tagged with this SDG' })
    credits: number;
}

export class ImpactSummaryGeoDto {
    @ApiProperty({ description: "Country label, or 'Unknown' when the project's country is blank/missing" })
    country: string;

    @ApiProperty({ description: 'Number of PROJECT rows in this country' })
    projectCount: number;

    @ApiProperty({ description: 'On-chain credits issued (mv_project_stats.total_issued) for this country' })
    creditsIssued: number;

    @ApiProperty({ description: 'Share of totalCreditsIssued this country represents, 0-100' })
    percentage: number;
}

export class ImpactSummarySectorDto {
    @ApiProperty({ description: "Sector label, or 'Unknown'/'Others' for the explicit synthetic buckets" })
    sector: string;

    @ApiProperty({ description: "True when this row is the 'Unknown' bucket (project's sector is blank/missing)" })
    isUnknown: boolean;

    @ApiProperty({ description: "True when this row is the 'Others' bucket (named sectors beyond the top " + TOP_SECTORS_LIMIT + ")" })
    isOthers: boolean;

    @ApiProperty({ description: 'Number of PROJECT rows in this sector (or bucket)' })
    projectCount: number;

    @ApiProperty({ description: 'On-chain credits issued for this sector (or bucket)' })
    creditsIssued: number;

    @ApiProperty({ description: 'Share of totalCreditsIssued this sector (or bucket) represents, 0-100' })
    percentage: number;
}

export class ImpactSummaryRegistryDto {
    @ApiProperty({ nullable: true, description: 'Registry DID' })
    registryDid: string | null;

    @ApiProperty({ nullable: true, description: 'Registry display name' })
    displayName: string | null;

    @ApiProperty({ description: 'Number of PROJECT rows published under this registry' })
    projectCount: number;

    @ApiProperty({ description: 'Number of tokens with actual minting activity under this registry' })
    issuanceCount: number;

    @ApiProperty({ description: 'Number of METHODOLOGY (policy) rows under this registry' })
    policyCount: number;
}

export class ImpactSummaryResponseDto {
    @ApiProperty({ description: 'Hedera network this summary belongs to' })
    network: string;

    @ApiProperty({ description: 'Total on-chain credits issued (tCO2e), summed from mv_project_stats.total_issued' })
    totalCreditsIssued: number;

    @ApiProperty({
        description:
            'Total credits retired. INFERRED from Mirror-Node-deleted NFT serials (nft_cache.deleted) — there is ' +
            'no on-chain retirement/burn transaction record, so this is a derived figure, not a ledger.',
    })
    totalRetiredInferred: number;

    @ApiProperty({ description: 'totalCreditsIssued minus totalRetiredInferred — credits still in circulation' })
    activeSupplyInferred: number;

    @ApiProperty({ description: 'totalRetiredInferred as a percentage of totalCreditsIssued, 0-100. Inferred, see totalRetiredInferred.' })
    retirementRateInferred: number;

    @ApiProperty({
        description:
            'Explains the retirement-inference methodology, for direct reuse in UI disclosure copy and the ' +
            'Impact Summary PDF Limitations section.',
    })
    retirementMethodologyNote: string;

    @ApiProperty({ description: 'Number of PROJECT rows on this network' })
    activeProjects: number;

    @ApiProperty({ description: "Number of distinct countries across PROJECT rows (excludes the 'Unknown' bucket)" })
    activeCountries: number;

    @ApiProperty({ type: [ImpactSummarySdgDto], description: 'SDGs with at least one tagged project, sorted by SDG number' })
    sdgContributions: ImpactSummarySdgDto[];

    @ApiProperty({ type: [ImpactSummaryGeoDto], description: 'Credits issued per country, sorted descending' })
    geographicDistribution: ImpactSummaryGeoDto[];

    @ApiProperty({
        type: [ImpactSummarySectorDto],
        description:
            `Credits issued per sector, sorted descending. Named sectors beyond the top ${TOP_SECTORS_LIMIT} ` +
            "are folded into one 'Others' row; projects with no sector form a separate 'Unknown' row.",
    })
    sectorBreakdown: ImpactSummarySectorDto[];

    @ApiProperty({ type: [ImpactSummaryRegistryDto], description: 'Per-registry counts, deduped by registryDid, sorted by project count descending' })
    registryBreakdown: ImpactSummaryRegistryDto[];

    @ApiProperty({ description: "Distinct methodology count, deduped by relatedTopicId (business_view is per-message; republished methodology versions share a relatedTopicId)" })
    methodologyCount: number;

    @ApiProperty({ description: 'ISO timestamp this summary was computed (aggregates are computed live on each request)' })
    generatedAt: string;
}

const RETIREMENT_METHODOLOGY_NOTE =
    'Retirement figures are inferred from Hedera Mirror Node NFT serials marked deleted (nft_cache.deleted), ' +
    'not from an on-chain retirement/burn transaction record. There is no ledger of retirement events; treat ' +
    'this figure as an estimate, not an audited total.';

function pct(part: number, total: number): number {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10; // one decimal place
}

/** Collapses raw per-sector rows into the top-N named sectors plus an 'Others' bucket and an 'Unknown' bucket; all buckets, named or synthetic, are interleaved by amount in the final sort. */
function buildSectorBreakdown(rows: ImpactSummarySectorRow[], totalCreditsIssued: number): ImpactSummarySectorDto[] {
    const unknownRow = rows.find((r) => r.sector === 'Unknown') ?? null;
    // rows arrive pre-sorted DESC by creditsIssued from the repository query.
    const named = rows.filter((r) => r.sector !== 'Unknown');
    const top = named.slice(0, TOP_SECTORS_LIMIT);
    const rest = named.slice(TOP_SECTORS_LIMIT);

    const buckets: Array<{ sector: string; projectCount: number; creditsIssued: number; isUnknown: boolean; isOthers: boolean }> = top.map((r) => ({
        sector: r.sector,
        projectCount: r.projectCount,
        creditsIssued: r.creditsIssued,
        isUnknown: false,
        isOthers: false,
    }));

    if (rest.length > 0) {
        buckets.push({
            sector: 'Others',
            projectCount: rest.reduce((sum, r) => sum + r.projectCount, 0),
            creditsIssued: rest.reduce((sum, r) => sum + r.creditsIssued, 0),
            isUnknown: false,
            isOthers: true,
        });
    }

    if (unknownRow) {
        buckets.push({
            sector: 'Unknown',
            projectCount: unknownRow.projectCount,
            creditsIssued: unknownRow.creditsIssued,
            isUnknown: true,
            isOthers: false,
        });
    }

    return buckets
        .sort((a, b) => b.creditsIssued - a.creditsIssued)
        .map((b) => ({
            sector: b.sector,
            isUnknown: b.isUnknown,
            isOthers: b.isOthers,
            projectCount: b.projectCount,
            creditsIssued: b.creditsIssued,
            percentage: pct(b.creditsIssued, totalCreditsIssued),
        }));
}

/** Maps the raw repository aggregate into the API response shape. Pure — no I/O. */
export function buildImpactSummaryResponse(row: ImpactSummaryRow, network: string): ImpactSummaryResponseDto {
    const activeSupplyInferred = row.totalCreditsIssued - row.totalRetiredInferred;

    return {
        network,
        totalCreditsIssued: row.totalCreditsIssued,
        totalRetiredInferred: row.totalRetiredInferred,
        activeSupplyInferred,
        retirementRateInferred: pct(row.totalRetiredInferred, row.totalCreditsIssued),
        retirementMethodologyNote: RETIREMENT_METHODOLOGY_NOTE,
        activeProjects: row.activeProjects,
        activeCountries: row.activeCountries,
        sdgContributions: row.sdgContributions,
        geographicDistribution: row.geographicDistribution.map((g) => ({
            country: g.country,
            projectCount: g.projectCount,
            creditsIssued: g.creditsIssued,
            percentage: pct(g.creditsIssued, row.totalCreditsIssued),
        })),
        sectorBreakdown: buildSectorBreakdown(row.sectorBreakdown, row.totalCreditsIssued),
        registryBreakdown: row.registryBreakdown,
        methodologyCount: row.methodologyCount,
        generatedAt: new Date().toISOString(),
    };
}
