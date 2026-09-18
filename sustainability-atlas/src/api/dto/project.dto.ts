import { IsOptional, IsString, IsArray, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto, PaginationMeta } from './pagination.dto';
import { ProjectRow, ActivityEventRow, PolicySchemaRow, IssuanceEventRow } from '../repositories/project.repository';

export class ActivityEventDto {
    @ApiProperty({ description: 'Date of the activity (YYYY-MM-DD)' })
    date: string;

    @ApiProperty({ description: 'Human-readable description of the activity' })
    action: string;

    @ApiProperty({ description: 'Activity category: document | verification | registry | monitoring | credit' })
    type: string;

    @ApiProperty({ nullable: true, description: 'Schema name of the VC for this activity, when known' })
    schemaName: string | null;

    static fromRow(row: ActivityEventRow): ActivityEventDto {
        const seconds = parseFloat(row.consensusTimestamp);
        const date = new Date(seconds * 1000).toISOString().split('T')[0];

        const name = (row.schemaName ?? '').toLowerCase();
        const isVP = row.messageType === 'VP-Document';

        let type: string;
        let action: string;

        if (isVP) {
            type = 'verification';
            action = row.schemaName ? `${row.schemaName} approved` : 'Document approved';
        } else if (name.includes('monitor') || name.includes('mrv') || name.includes('measurement')) {
            type = 'monitoring';
            action = row.schemaName ? `${row.schemaName} submitted` : 'Monitoring report submitted';
        } else if (name.includes('verif') || name.includes('audit')) {
            type = 'verification';
            action = row.schemaName ? `${row.schemaName} submitted` : 'Verification document submitted';
        } else if (name.includes('token') || name.includes('credit') || name.includes('mint') || name.includes('issuance')) {
            type = 'credit';
            action = row.schemaName ? `${row.schemaName} issued` : 'Credits issued';
        } else if (name.includes('registr') || name.includes('registry')) {
            type = 'registry';
            action = row.schemaName ? `${row.schemaName} submitted` : 'Registry document submitted';
        } else {
            type = 'document';
            action = row.schemaName ? `${row.schemaName} submitted` : 'Document submitted';
        }

        return { date, action, type, schemaName: row.schemaName ?? null };
    }
}

export class IssuanceDto {
    @ApiProperty({ description: 'Hedera token ID (e.g. 0.0.12345)' })
    tokenId: string;

    @ApiProperty({ nullable: true, description: 'Token name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Token symbol' })
    symbol: string | null;

    @ApiProperty({ nullable: true, description: 'Token type (FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE)' })
    type: string | null;

    @ApiProperty({ description: 'Total supply of the token' })
    supply: number;

    @ApiProperty({ nullable: true, description: 'Date the token was minted (YYYY-MM-DD)' })
    mintDate: string | null;

    @ApiProperty({ nullable: true, description: 'Raw MintToken VC document from the Hedera message' })
    rawVc: Record<string, any> | null;
}

export class IssuanceEventDto {
    @ApiProperty({ description: 'HCS consensus timestamp of the MintToken VC message' })
    mintConsensusTimestamp: string;

    @ApiProperty({ nullable: true, description: 'Hedera token ID (e.g. 0.0.12345)' })
    tokenId: string | null;

    @ApiProperty({ nullable: true, description: 'Token name from token_cache' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Token symbol from token_cache' })
    symbol: string | null;

    @ApiProperty({ nullable: true, description: 'Token type (FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE)' })
    type: string | null;

    @ApiProperty({ nullable: true, description: 'Minted amount for this event' })
    amount: number | null;

    @ApiProperty({ nullable: true, description: 'Mint date (YYYY-MM-DD)' })
    mintDate: string | null;

    @ApiProperty({ nullable: true, description: 'Link method used to associate this mint with the project (relationship | cs_ref | ref_root | topic_scope)' })
    linkMethod: string | null;

    @ApiProperty({ nullable: true, description: 'Raw MintToken VC document from the Hedera message' })
    rawVc: Record<string, any> | null;

    @ApiProperty({
        nullable: true,
        description:
            'HCS consensus timestamp of the mint VP-Document. Guardian base64-encodes this value into the ' +
            'metadata of every NFT serial minted for this event, or into the fungible TOKENMINT ' +
            "transaction's memo. Either way it is how the on-chain mint is attributed to this VC.",
    })
    vpConsensusTimestamp: string | null;

    @ApiProperty({
        nullable: true,
        description:
            'What the ledger actually minted, in display units: the attributed serial count for ' +
            'non-fungible tokens, the summed mint-transaction amount (scaled by token decimals) for ' +
            'fungible ones. Null until the mint has been reconciled. Compare against `amount`, which is ' +
            'only what the MintToken VC declared. The two differ when a mint partially failed.',
    })
    mintedAmount: number | null;

    @ApiProperty({ nullable: true, description: "NFT serials whose metadata carries this mint's VP timestamp. Null for fungible tokens, which have no serials." })
    serialCount: number | null;

    @ApiProperty({ nullable: true, description: 'Of those serials, how many Mirror Node marks deleted (retired). Null for fungible tokens.' })
    serialRetiredCount: number | null;

    @ApiProperty({
        nullable: true,
        description:
            "Of those serials, how many are held by an account other than the token's treasury and are not " +
            'retired, i.e. transferred to a third party. Ownership is the only transfer signal available: ' +
            'Guardian writes no transfer record. Null for fungible tokens, whose balances cannot be traced ' +
            'back to the mint that created them.',
    })
    serialTransferredCount: number | null;

    @ApiProperty({
        nullable: true,
        description:
            'How far the on-chain mint reconciles against the VC: "verified" (minted amount equals the ' +
            'declared amount), "mismatch" (both known but different), "unmatched" (VP resolved, but no ' +
            'on-chain mint record carries its timestamp), "ambiguous" (multiple VPs claim this mint, not ' +
            'attributed), or null (no VP resolved yet).',
    })
    mintMatchStatus: string | null;

    static fromRow(row: IssuanceEventRow): IssuanceEventDto {
        return {
            mintConsensusTimestamp: row.mintConsensusTimestamp,
            tokenId: row.tokenId ?? null,
            name: row.name ?? null,
            symbol: row.symbol ?? null,
            type: row.type ?? null,
            amount: row.amount ?? null,
            mintDate: row.mintDate ?? null,
            linkMethod: row.linkMethod ?? null,
            rawVc: row.rawVc ?? null,
            vpConsensusTimestamp: row.vpConsensusTimestamp ?? null,
            mintedAmount: row.mintedAmount ?? null,
            serialCount: row.serialCount ?? null,
            serialRetiredCount: row.serialRetiredCount ?? null,
            serialTransferredCount: row.serialTransferredCount ?? null,
            mintMatchStatus: row.mintMatchStatus ?? null,
        };
    }
}

export class SerialRangeDto {
    @ApiProperty({ description: 'First serial in the run' })
    from: number;

    @ApiProperty({ description: 'Last serial in the run (equals `from` for a single serial)' })
    to: number;

    @ApiProperty({ description: 'Serials in this run' })
    count: number;

    @ApiProperty({ description: 'True when every serial in the run is retired (Mirror Node marks it deleted)' })
    deleted: boolean;

    @ApiProperty({
        nullable: true,
        description:
            'Account holding every serial in the range. Null when ownership has not been synced yet, ' +
            'and for retired serials, which no longer have a holder. Ranges are split on a change of ' +
            'holder, so a range never spans two owners.',
    })
    accountId: string | null;
}

export class MintSerialsResponseDto {
    @ApiProperty({ description: 'HCS consensus timestamp of the MintToken VC message' })
    mintConsensusTimestamp: string;

    @ApiProperty({ nullable: true, description: 'HCS consensus timestamp of the mint VP-Document (the value encoded in NFT metadata)' })
    vpConsensusTimestamp: string | null;

    @ApiProperty({ nullable: true, description: 'Hedera token ID these serials belong to' })
    tokenId: string | null;

    @ApiProperty({ nullable: true, description: 'Mint reconciliation status. See IssuanceEventDto.mintMatchStatus' })
    mintMatchStatus: string | null;

    @ApiProperty({ description: 'Serials this issuance produced in total, across every page' })
    totalSerials: number;

    @ApiProperty({ description: 'Of those, how many are still live' })
    activeCount: number;

    @ApiProperty({ description: 'Of those, how many are retired' })
    retiredCount: number;

    @ApiProperty({
        type: [SerialRangeDto],
        description:
            'Serials as contiguous ranges, ascending. A run of consecutive serials sharing the same ' +
            'retired state collapses to one entry. Lossless: every serial\'s status is implied by the ' +
            'range containing it. Enumerating them individually would mean ~1.6 MB for a large ' +
            'issuance where one range says the same thing.',
    })
    data: SerialRangeDto[];

    @ApiProperty({ type: PaginationMeta, description: 'Pagination over ranges, not over serials' })
    meta: PaginationMeta;
}

export class MintTransactionDto {
    @ApiProperty({
        enum: ['retirement', 'transfer'],
        description:
            'Whether the credits changed hands or left circulation (exactly one of two values). ' +
            '"transfer": the credits moved to another account and remain valid for future sale or ' +
            'retirement. "retirement": the credits can never be used again. A transfer that destroyed ' +
            'every credit it moved, and was their last movement, is a retirement in substance and is ' +
            'reported as one. Sorting by this field groups all retirements and all transfers.',
    })
    event: 'retirement' | 'transfer';

    @ApiProperty({ description: 'Hedera consensus timestamp of the transaction' })
    consensusTimestamp: string;

    @ApiProperty({
        enum: ['guardian', 'ledger'],
        nullable: true,
        description:
            'How well documented the offset claim is. "guardian": the registry\'s retirement ' +
            'contract recorded the claim on-chain, naming the retiring account and the exact ' +
            'serials. "ledger": the credits are provably destroyed, but nothing on-chain identifies ' +
            'who claimed the offset or when. Null on transfers.',
    })
    retirementSource: 'guardian' | 'ledger' | null;

    @ApiProperty({
        nullable: true,
        description:
            'Account holding the credits at the moment they left circulation. Retirements only. ' +
            'Where the retirement is evidenced only by destruction, this is the last transfer\'s ' +
            'recipient (the party that held the credits), not whoever sent them.',
    })
    holderAccountId: string | null;

    @ApiProperty({ nullable: true, description: 'Account the credits moved from. Transfers only.' })
    senderAccountId: string | null;

    @ApiProperty({ nullable: true, description: 'Account the credits moved to. Transfers only.' })
    receiverAccountId: string | null;

    @ApiProperty({ type: [Number], description: 'Serials from this mint event affected by the transaction, ascending' })
    serials: number[];

    @ApiProperty({
        description:
            'On a transfer, how many of the credits it moved have since been retired. The rest are ' +
            'still held and remain tradable. Always 0 on a retirement, which covers every credit it names.',
    })
    retiredSince: number;
}

export class MintTransactionsResponseDto {
    @ApiProperty({ nullable: true, description: 'The issuance these transactions were scoped to; null when covering every issuance of the project' })
    mintConsensusTimestamp: string | null;

    @ApiProperty({
        description:
            'Whether every treasury behind these credits has had its transfer history ingested. ' +
            'False means transfers may exist that have not been read yet, so an empty result is ' +
            '"not known yet" rather than "nothing happened". Retirements are unaffected, as they come ' +
            'from the retirement contracts, not from the treasury sweep.',
    })
    transferHistorySynced: boolean;

    @ApiProperty({ type: [MintTransactionDto], description: 'Transactions, newest first' })
    data: MintTransactionDto[];

    @ApiProperty({ type: PaginationMeta })
    meta: PaginationMeta;
}

export class LinkedVcDto {
    @ApiProperty({ description: 'HCS consensus timestamp identifying this VC message' })
    consensusTimestamp: string;

    @ApiProperty({ description: 'Hedera topic ID the VC was published to' })
    topicId: string;

    @ApiProperty({ nullable: true, description: 'Credential subject ID from the VC (may be null for MintToken)' })
    csId: string | null;
}

export class MilestoneDto {
    @ApiProperty({ description: 'Milestone key: registration | validation | mrvSubmission | verification | issuance' })
    key: string;

    @ApiProperty({ description: 'Human-readable milestone label' })
    label: string;

    @ApiProperty({ description: 'Milestone state: complete | current | expected | pending' })
    state: string;

    @ApiProperty({ nullable: true, description: 'Date associated with this milestone (YYYY-MM-DD, or bare YYYY for an expected issuance year), actual or expected' })
    date: string | null;

    @ApiProperty({ nullable: true, description: 'Whether the date is an actual on-chain date or an expected/forecast one: actual | expected' })
    dateType: string | null;
}

export class ProjectedIssuanceDto {
    @ApiProperty({
        nullable: true,
        description:
            'Total projected emission reduction (tCO2e): the mapped Estimated Annual Credits value as-is, ' +
            'never multiplied out across the crediting period (a single figure cannot honestly stand in ' +
            'for every year). Null when no amount is mapped/extracted, in which case periodStart/periodEnd ' +
            'may still be populated on their own.',
    })
    totalTco2e: number | null;

    @ApiProperty({ nullable: true, description: 'First year of the crediting period, when resolvable' })
    periodStart: number | null;

    @ApiProperty({ nullable: true, description: 'Last year of the crediting period, when resolvable' })
    periodEnd: number | null;
}

export class LinkedSchemaDto {
    @ApiProperty({ description: 'Schema UUID from the VC type field, or literal "MintToken" for mint VCs' })
    schemaUuid: string;

    @ApiProperty({ nullable: true, description: 'Human-readable schema name from the policy zip; null for MintToken or unmapped UUIDs' })
    schemaName: string | null;

    @ApiProperty({ description: 'True when this schema is flagged isProjectSchema in the policyMapping' })
    isProjectSchema: boolean;

    @ApiProperty({ description: 'Coarse Guardian document type (pdd | monitoringReport | validationReport | verificationReport | registration | unknown)' })
    docType: string;

    @ApiProperty({ description: 'Number of linked VCs carrying this schema UUID' })
    vcCount: number;

    @ApiProperty({ type: [LinkedVcDto], description: 'Individual VCs carrying this schema UUID' })
    linkedVcs: LinkedVcDto[];
}

export class ProjectQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by project name (partial match)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Filter by country name (partial match). The sentinel "__other__" instead matches every project whose stored country is non-empty but not a recognized ISO 3166-1 name/alpha-3 code.' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: 'Filter by methodology name (partial match)' })
    @IsOptional()
    @IsString()
    methodology?: string;

    @ApiPropertyOptional({ description: 'Filter by publishing registry name (partial match)' })
    @IsOptional()
    @IsString()
    registry?: string;

    @ApiPropertyOptional({
        description: 'Filter by publishing registry DID (exact match). Unambiguous where two registries share a display name.',
    })
    @IsOptional()
    @IsString()
    registryDid?: string;

    @ApiPropertyOptional({ description: 'Filter by developer name (partial match)' })
    @IsOptional()
    @IsString()
    developer?: string;

    @ApiPropertyOptional({ description: 'Filter by vintage year (exact match, e.g. "2022")' })
    @IsOptional()
    @IsString()
    vintage?: string;

    @ApiPropertyOptional({ description: 'Filter by project status (exact match, e.g. "Issuing")' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Filter by policy topic ID (exact match). Returns all projects under the same Guardian policy (every version of it)' })
    @IsOptional()
    @IsString()
    policyTopicId?: string;

    @ApiPropertyOptional({ description: 'Filter by instance topic ID (exact match). Returns only projects registered against this specific version of the methodology. Supports a `|`-delimited list to match any of several versions.' })
    @IsOptional()
    @IsString()
    instanceTopicId?: string;

    @ApiPropertyOptional({ description: 'Filter by SDG numbers (match any). Supports a `|`-delimited list, e.g. "3|7|13".' })
    @IsOptional()
    @IsString()
    sdgs?: string;

    @ApiPropertyOptional({ description: 'Filter by sector (partial match). Supports a `|`-delimited list.' })
    @IsOptional()
    @IsString()
    sector?: string;

    @ApiPropertyOptional({ description: 'Filter by sectoral scope (partial match). Supports a `|`-delimited list.' })
    @IsOptional()
    @IsString()
    sectoralScope?: string;

    @ApiPropertyOptional({ description: 'Vintage year range as "min|max". Either bound may be omitted, e.g. "2018|" or "|2024".' })
    @IsOptional()
    @IsString()
    vintageRange?: string;

    @ApiPropertyOptional({ description: 'Scoped-view deep link: matches a project whose instanceTopicId OR policyTopicId equals this value.' })
    @IsOptional()
    @IsString()
    methodologyId?: string;

    @ApiPropertyOptional({ description: 'Filter by lifecycle stage (Registered | Validation | Monitoring | Verified | Issued). Supports a `|`-delimited list.' })
    @IsOptional()
    @IsString()
    lifecycleStage?: string;

    @ApiPropertyOptional({ description: 'Expected issuance year range as "min|max". Either bound may be omitted.' })
    @IsOptional()
    @IsString()
    expectedIssuanceYearRange?: string;

    @ApiPropertyOptional({ enum: ['true', 'false'], description: '"true" = not yet issued (pipeline), "false" = issued.' })
    @IsOptional()
    @IsString()
    isPipeline?: string;
}

export class MethodologyFilterOptionDto {
    @ApiProperty({ description: "Methodology instance topic ID. Matches a project's instanceTopicId" })
    topicId: string;

    @ApiProperty({ nullable: true, description: 'Methodology display name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Methodology version' })
    version: string | null;
}

export class ProjectFilterOptionsDto {
    @ApiProperty({ type: [String] })
    registries: string[];

    @ApiProperty({ type: [String] })
    developers: string[];

    @ApiProperty({ type: [String] })
    statuses: string[];

    @ApiProperty({ type: [String] })
    sectors: string[];

    @ApiProperty({ type: [String] })
    sectoralScopes: string[];

    @ApiProperty({ type: [String] })
    vintages: string[];

    @ApiProperty({ type: [String], description: 'Raw stored country values (not geocoded/display-resolved)' })
    countries: string[];

    @ApiProperty({ type: [MethodologyFilterOptionDto], description: 'All methodologies (name + version) available in the system, for filter dropdowns' })
    methodologies: MethodologyFilterOptionDto[];
}

export class ProjectListSummaryDto {
    @ApiProperty({ description: 'Sum of issuance counts across every project matching the current filters' })
    totalIssuances: number;

    @ApiProperty({ description: 'Distinct country count across every project matching the current filters' })
    uniqueCountries: number;

    @ApiProperty({ description: 'Distinct registry count across every project matching the current filters' })
    uniqueRegistries: number;
}

export class ProjectIdNameDto {
    @ApiProperty({ description: 'sourceTimestamp ID' })
    id: string;

    @ApiProperty({ description: 'Display name' })
    name: string;

    @ApiProperty({
        nullable: true,
        description:
            'Stable project key (credentialSubject.id). This is what mint attribution joins on, ' +
            'so callers scoping another resource to these projects should prefer it over `id`.',
    })
    projectKey: string | null;
}

export class ProjectIdsDto {
    @ApiProperty({ type: [ProjectIdNameDto], description: '(id, name) pairs for every project matching the given filters' })
    items: ProjectIdNameDto[];
}

export class BatchProjectsDto {
    @ApiProperty({
        type: [String],
        description: 'sourceTimestamp IDs of the watchlisted projects to fetch (max 200, matching the watchlist size cap)',
    })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(200)
    @IsString({ each: true })
    sourceTimestamps: string[];
}

export class ProjectResponseDto {
    @ApiProperty({ description: 'Internal row identifier' })
    id: string;

    @ApiProperty({ description: 'Hedera network this data belongs to' })
    network: string;

    @ApiProperty({ nullable: true, description: 'Project display name' })
    name: string | null;

    @ApiProperty({ nullable: true, description: 'Project description or summary' })
    description: string | null;

    @ApiProperty({ nullable: true, description: 'Country where the project is located' })
    country: string | null;

    @ApiProperty({ nullable: true, description: 'Latitude of the project location' })
    lat: number | null;

    @ApiProperty({ nullable: true, description: 'Longitude of the project location' })
    lng: number | null;

    @ApiProperty({ nullable: true, description: 'GeoJSON Polygon/MultiPolygon string representing the project boundary, simplified for map display (full precision is kept in project_geometry)' })
    polygon: string | null;

    @ApiProperty({ nullable: true, description: 'Associated methodology name' })
    methodology: string | null;

    @ApiProperty({ nullable: true, description: 'URL-safe slug derived from the methodology name' })
    methodologyId: string | null;

    @ApiProperty({ nullable: true, description: 'DID of the publishing Standard Registry' })
    registryDid: string | null;

    @ApiProperty({ nullable: true, description: 'Display name of the publishing Standard Registry' })
    registryName: string | null;

    @ApiProperty({ nullable: true, description: 'Project developer / owner name' })
    developer: string | null;

    @ApiProperty({
        type: [String],
        description:
            'Detail-page-only (full=true) contact emails for every developer on the project, ' +
            'when the policy schema exposes them. Empty on list responses.',
    })
    developerEmails: string[];

    @ApiProperty({
        type: [String],
        description:
            'Detail-page-only (full=true) contact phone numbers for every developer on the project, ' +
            'when the policy schema exposes them. Empty on list responses.',
    })
    developerPhones: string[];

    @ApiProperty({ nullable: true, description: 'Accumulated emission reduction credits (ER_y)' })
    credits: number | null;

    @ApiProperty({ nullable: true, description: 'Project status (e.g. "Issuing")' })
    status: string | null;

    @ApiProperty({ nullable: true, description: 'Vintage year derived from the project start date' })
    vintage: string | null;

    @ApiProperty({ type: [Number], description: 'Sustainable Development Goal numbers associated with this project' })
    sdgs: number[];

    @ApiProperty({ nullable: true, description: 'Co-benefits description' })
    cobenefits: string | null;

    @ApiProperty({ nullable: true, description: 'Project category' })
    category: string | null;

    @ApiProperty({ nullable: true, description: 'Project scale (e.g. Large-scale, Small-scale)' })
    scale: string | null;

    @ApiProperty({ nullable: true, description: 'Project sector' })
    sector: string | null;

    @ApiProperty({ nullable: true, description: 'Sectoral scope designation' })
    sectoralScope: string | null;

    @ApiProperty({ nullable: true, description: 'Project creation / start date (ISO string or year)' })
    createdAt: string | null;

    @ApiProperty({ nullable: true, description: 'Crediting period start date (ISO string)' })
    creditingPeriodStart: string | null;

    @ApiProperty({ nullable: true, description: 'Crediting period end date (ISO string)' })
    creditingPeriodEnd: string | null;

    @ApiProperty({ nullable: true, description: 'Hedera topic ID of the first project VC' })
    topicId: string | null;

    @ApiProperty({ nullable: true, description: 'Hedera policy topic ID (parent of the instance topic)' })
    policyTopicId: string | null;

    @ApiProperty({ nullable: true, description: 'Instance topic ID for the specific methodology version this project was published under' })
    instanceTopicId: string | null;

    @ApiProperty({ description: 'Number of VC-Document messages that contributed to this project row' })
    vcCount: number;

    @ApiProperty({ nullable: true, description: 'Resolver method that established this project identity: topic | csRef | relationships | projectSchema' })
    decodeMethod: string | null;

    @ApiProperty({ nullable: true, description: 'Resolution anchor metadata: { dynamicTopicId } for the topic method, { rootVcTimestamp } for cs.ref / relationships / projectSchema' })
    metadata: Record<string, unknown> | null;

    @ApiProperty({ description: 'HCS consensus timestamp of the earliest source VC message' })
    sourceTimestamp: string;

    @ApiProperty({ nullable: true, description: 'Stable dedup key for this project (credentialSubject.id). Used as the projectId on linked credit rows.' })
    projectKey: string | null;

    @ApiProperty({ description: 'Last time this row was written to the database' })
    updatedAt: Date;

    @ApiProperty({ description: 'Number of distinct token issuances for this project (from MintToken VCs)' })
    issuanceCount: number;

    @ApiProperty({ type: [IssuanceDto], description: 'Linked token issuances for this project' })
    issuances: IssuanceDto[];

    @ApiProperty({ type: [IssuanceEventDto], description: 'Per-mint-event issuance history, oldest first' })
    issuanceEvents: IssuanceEventDto[];

    @ApiProperty({
        description:
            'Total credits the ledger actually minted, reconciled from NFT serials and fungible mint ' +
            "transactions. Falls back to the MintToken VC's declared amount for mints not yet reconciled.",
    })
    totalIssued: number;

    @ApiProperty({
        description:
            'Total credits the MintToken VCs declared. Differs from totalIssued when a mint partially ' +
            'failed. The VC states an intent, the ledger records what happened.',
    })
    totalDeclared: number;

    @ApiProperty({
        nullable: true,
        description:
            "Non-fungible credits held by an account other than the token's treasury, i.e. transferred to a " +
            'third party. Null when transfers cannot be determined (list responses, or fungible-only ' +
            'projects, whose balances cannot be traced back to a mint event).',
    })
    totalTransferred: number | null;

    @ApiProperty({ description: 'Total credits retired (NFT serials marked deleted by Mirror Node)' })
    totalRetired: number;

    @ApiProperty({ description: 'Credits currently in circulation (totalIssued - totalRetired)' })
    totalActive: number;

    @ApiProperty({
        type: [LinkedSchemaDto],
        description:
            'VCs attached to this project grouped by schema UUID, EXCLUDING schemas bound to an externalDataBlock ' +
            '(those are reported separately in mrvSchemas). Includes schemas with zero VCs ' +
            'so the frontend can surface "0 linked VCs" for project schemas that produced no matches.',
    })
    linkedSchemas: LinkedSchemaDto[];

    @ApiProperty({
        type: [LinkedSchemaDto],
        description:
            'VCs attached to this project whose schema is bound to a policy externalDataBlock, pushed ' +
            'external/IoT MRV data, reported separately from the regular Detailed Information schemas.',
    })
    mrvSchemas: LinkedSchemaDto[];

    @ApiProperty({ description: 'True when mrvSchemas contains at least one schema with vcCount > 0' })
    hasMrvData: boolean;

    @ApiProperty({ description: 'Derived lifecycle stage: Registered | Validation | Monitoring | Verified | Issued' })
    lifecycleStage: string;

    @ApiProperty({ nullable: true, description: 'Derived expected issuance year (YYYY), or null when undetermined ("TBD")' })
    expectedIssuanceYear: string | null;

    @ApiProperty({ nullable: true, description: 'Projected/actual credit volume: totalIssued when Issued, otherwise null ("Not estimated")' })
    projectedVolume: number | null;

    @ApiProperty({
        type: ProjectedIssuanceDto,
        nullable: true,
        description:
            'Detail-page-only (full=true) projected issuance breakdown for pipeline (non-Issued) projects, ' +
            'built from the mapped Estimated Annual Credits field. Null when Issued or when no estimate is mapped.',
    })
    projectedIssuance: ProjectedIssuanceDto | null;

    @ApiProperty({ type: [MilestoneDto], description: 'Registration → Validation → MRV Submission → Verification → Issuance milestone tracker' })
    milestones: MilestoneDto[];

    static fromRow(row: ProjectRow, network: string, full: boolean = false): ProjectResponseDto {
        const data = (row.businessData ?? {}) as Record<string, unknown>;

        // Build a quick-lookup map from policy schemas for this project.
        // Keys are trimmed to bare UUIDs because VC payloads expose only the
        // UUID portion of the type (e.g. "2c982fa6-..."), while policySchemas
        // carry full IRIs (e.g. "#2c982fa6-...&1.0.0"). Without trimming, the
        // lookup below always misses → schemaName=null, isProjectSchema=false.
        const trimSchemaId = (id: string): string =>
            id.replace(/^#/, '').split('&')[0].trim();

        const schemaMetaMap = new Map<string, Pick<PolicySchemaRow, 'name' | 'isProjectSchema' | 'docType' | 'isMrvSchema'>>();
        for (const s of (row.policySchemas ?? [])) {
            schemaMetaMap.set(trimSchemaId(s.schemaId), {
                name: s.name,
                isProjectSchema: s.isProjectSchema,
                docType: s.docType,
                isMrvSchema: s.isMrvSchema,
            });
        }
        // Schemas bound to an externalDataBlock (pushed external/IoT MRV data) — reported via
        // mrvSchemas instead of linkedSchemas. Lifecycle/milestone derivation below must still see
        // the FULL schema list (allLinkedSchemas) so an MRV-classified schema that also happens to
        // carry docType 'monitoringReport' doesn't silently stop counting toward that stage.
        const mrvSchemaUuidSet = new Set(
            [...schemaMetaMap.entries()].filter(([, meta]) => meta.isMrvSchema).map(([uuid]) => uuid),
        );

        // Group linkedVcs entries by schemaUuid.
        const rawLinkedVcs = Array.isArray(data['linkedVcs'])
            ? (data['linkedVcs'] as Array<Record<string, unknown>>)
            : [];

        const groupedBySchema = new Map<string, LinkedVcDto[]>();
        for (const entry of rawLinkedVcs) {
            const uuid = typeof entry['schemaUuid'] === 'string' ? entry['schemaUuid'] : 'unknown';
            const ts = typeof entry['consensusTimestamp'] === 'string' ? entry['consensusTimestamp'] : '';
            const topicId = typeof entry['topicId'] === 'string' ? entry['topicId'] : '';
            const csId = typeof entry['csId'] === 'string' ? entry['csId'] : null;

            if (!groupedBySchema.has(uuid)) {
                groupedBySchema.set(uuid, []);
            }
            groupedBySchema.get(uuid)!.push({ consensusTimestamp: ts, topicId, csId });
        }

        // Build LinkedSchemaDto entries for every UUID present in linked VCs.
        const linkedFromVcs: LinkedSchemaDto[] = [];
        for (const [uuid, vcs] of groupedBySchema.entries()) {
            const meta = schemaMetaMap.get(uuid);
            linkedFromVcs.push({
                schemaUuid: uuid,
                schemaName: meta?.name ?? null,
                isProjectSchema: meta?.isProjectSchema ?? false,
                docType: meta?.docType ?? 'unknown',
                vcCount: vcs.length,
                linkedVcs: vcs,
            });
        }

        // Also include schemas that are in the policy zip but have ZERO linked VCs,
        // so the frontend can render "Project schema: 0 VCs" for phantom cases like Capturiant.
        // Compare on the trimmed UUID (linkedVcs entries store the bare UUID
        // form, so a full-IRI comparison would always miss and treat every
        // schema as empty). Only built for the detail response (full=true) —
        // the list never renders these, and every entry has vcCount === 0 so
        // it can't affect the vcCount-guarded stage checks below.
        const emptySchemas: LinkedSchemaDto[] = [];
        if (full) {
            const linkedSchemaUuids = new Set(groupedBySchema.keys());
            for (const s of (row.policySchemas ?? [])) {
                const trimmed = trimSchemaId(s.schemaId);
                if (!linkedSchemaUuids.has(trimmed)) {
                    emptySchemas.push({
                        schemaUuid: trimmed,
                        schemaName: s.name,
                        isProjectSchema: s.isProjectSchema,
                        docType: s.docType,
                        vcCount: 0,
                        linkedVcs: [],
                    });
                }
            }
        }

        // Sort: project schemas first, then schemas with VCs by count desc,
        // then empty schemas (also project-schema-first within each tier).
        const sortGroup = (a: LinkedSchemaDto): number => {
            if (a.vcCount > 0 && a.isProjectSchema) return 0;
            if (a.vcCount > 0 && !a.isProjectSchema) return 1;
            if (a.vcCount === 0 && a.isProjectSchema) return 2;
            return 3;
        };
        const allLinkedSchemas: LinkedSchemaDto[] = [
            ...linkedFromVcs,
            ...emptySchemas,
        ].sort((a, b) => {
            const ga = sortGroup(a);
            const gb = sortGroup(b);
            if (ga !== gb) return ga - gb;
            // Within groups that have VCs, sort by count desc
            if (a.vcCount !== b.vcCount) return b.vcCount - a.vcCount;
            return 0;
        });

        // Split out externalDataBlock-bound (MRV) schemas into their own group — the "Detailed
        // Information" section only shows non-MRV schemas; MRV data gets its own dedicated section.
        const linkedSchemas = allLinkedSchemas.filter(s => !mrvSchemaUuidSet.has(s.schemaUuid));
        const mrvSchemas = allLinkedSchemas.filter(s => mrvSchemaUuidSet.has(s.schemaUuid));
        const hasMrvData = mrvSchemas.some(s => s.vcCount > 0);

        // Friendly display name: when the stored displayName is a bare DID or
        // topic id (the project-schema VC never landed to supply a real title),
        // fall back to the project schema's name, then the methodology name.
        const rawName = row.displayName ?? '';
        const looksLikeId = !rawName || /^did:/i.test(rawName) || /^\d+\.\d+\.\d+$/.test(rawName) || rawName === (row.projectKey ?? '');
        const projectSchemaName = allLinkedSchemas.find(s => s.isProjectSchema && s.schemaName)?.schemaName ?? null;
        const friendlyName = looksLikeId
            ? (projectSchemaName ?? (typeof data['methodology'] === 'string' ? (data['methodology'] as string) : null) ?? rawName)
            : rawName;

        const totalIssued = row.totalIssued ?? 0;
        const isIssued = totalIssued > 0 || (row.issuanceCount ?? 0) > 0;

        // Earliest VC of a given docType, by consensusTimestamp (F8 conversion).
        const earliestVcOfType = (docTypes: string[]): LinkedVcDto | null => {
            const vcs = allLinkedSchemas
                .filter(s => docTypes.includes(s.docType))
                .flatMap(s => s.linkedVcs)
                .filter(vc => vc.consensusTimestamp);
            if (vcs.length === 0) return null;
            return vcs.reduce((earliest, vc) => vc.consensusTimestamp.localeCompare(earliest.consensusTimestamp) < 0 ? vc : earliest);
        };
        const tsToDate = (ts: string): string | null => {
            const s = parseFloat(ts);
            if (!Number.isFinite(s)) return null;
            const d = new Date(s * 1000);
            return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
        };

        // List rows (full=false) get lifecycleStage/expectedIssuanceYear from
        // mv_project_lifecycle — the same classification, precomputed — and skip
        // the linkedVcs/policySchemas walk below entirely (a perf win too, since
        // it used to run on every list row regardless of `full`). The detail page
        // (full=true), and any list row the MV hasn't caught up to yet (e.g. a
        // project created since the last refresh), fall through to the original
        // Node computation, unchanged.
        let lifecycleStage: string;
        let expectedIssuanceYear: string | null;
        // Hoisted for the full-only milestones block further below, which
        // needs the actual mint event, not just its year.
        let firstIssuanceEvent: IssuanceEventRow | null = null;

        if (!full && row.lifecycleStage) {
            lifecycleStage = row.lifecycleStage;
            expectedIssuanceYear = row.expectedIssuanceYear ?? null;
        } else {
            // A stage is reached only when the project actually has a VC of that
            // docType. Schemas the policy defines but the project never submitted
            // are carried as zero-VC entries (for the detail phantom-schema view) —
            // they must NOT advance the stage, or every project under a policy would
            // inherit that policy's most-advanced document type.
            const hasVerification = allLinkedSchemas.some(s => s.docType === 'verificationReport' && s.vcCount > 0);
            const hasMonitoring = allLinkedSchemas.some(s => s.docType === 'monitoringReport' && s.vcCount > 0);
            const hasValidation = allLinkedSchemas.some(s => s.docType === 'validationReport' && s.vcCount > 0);

            lifecycleStage = isIssued ? 'Issued'
                : hasVerification ? 'Verified'
                : hasMonitoring ? 'Monitoring'
                : hasValidation ? 'Validation'
                : 'Registered';

            firstIssuanceEvent = (row.issuanceEvents ?? []).find(e => e.mintDate) ?? null;
            const creditingPeriodStartYear = typeof data['creditingPeriodStart'] === 'string' ? data['creditingPeriodStart'].match(/\d{4}/)?.[0] ?? null : null;
            const vintageYear = typeof data['vintage'] === 'string' ? data['vintage'].match(/\d{4}/)?.[0] ?? null : null;

            // Only real, dynamically-extracted fields feed this — no guessed cadence.
            // Issued projects use their actual first-issuance year (detail only);
            // pipeline projects use the crediting-period start or vintage year
            // (vintage maps to the IWA firstYearIssuance forecast field), else "TBD".
            expectedIssuanceYear = isIssued
                ? (firstIssuanceEvent?.mintDate?.slice(0, 4) ?? null)
                : creditingPeriodStartYear ?? vintageYear ?? null;
        }

        // §3.4 — credits is reported-to-date, never a forward projection (F5); only totalIssued qualifies.
        let projectedVolume = isIssued ? totalIssued : null;

        let projectedIssuance: ProjectedIssuanceDto | null = null;
        if (full) {
            const rawAmount = typeof data['estimatedAnnualCredits'] === 'number' ? data['estimatedAnnualCredits']
                : typeof data['estimatedAnnualCredits'] === 'string' ? parseFloat(data['estimatedAnnualCredits']) : null;
            const estimatedAmount = rawAmount && rawAmount > 0 ? rawAmount : null;

            const startYear = typeof data['creditingPeriodStart'] === 'string'
                ? parseInt(data['creditingPeriodStart'].match(/\d{4}/)?.[0] ?? '', 10)
                : (typeof data['vintage'] === 'string' ? parseInt(data['vintage'].match(/\d{4}/)?.[0] ?? '', 10) : NaN);
            const endYear = typeof data['creditingPeriodEnd'] === 'string'
                ? parseInt(data['creditingPeriodEnd'].match(/\d{4}/)?.[0] ?? '', 10)
                : NaN;
            const periodStart = Number.isFinite(startYear) ? startYear : null;
            const periodEnd = Number.isFinite(endYear) ? endYear : null;

            if (estimatedAmount !== null || periodStart !== null || periodEnd !== null) {
                projectedIssuance = { totalTco2e: estimatedAmount, periodStart, periodEnd };
            }

            if (projectedIssuance?.totalTco2e != null && !isIssued) projectedVolume = projectedIssuance.totalTco2e;
        }

        // Milestones are only rendered on the detail page — skip building them
        // (and the earliest-VC lookups they need) on list rows.
        let milestones: MilestoneDto[] = [];
        if (full) {
            const registrationVc = earliestVcOfType(['registration', 'pdd']);
            const validationVc = earliestVcOfType(['validationReport']);
            const mrvVc = earliestVcOfType(['monitoringReport']);
            const verificationVc = earliestVcOfType(['verificationReport']);

            milestones = [
                {
                    key: 'registration',
                    label: 'Registration',
                    state: 'complete',
                    date: registrationVc ? tsToDate(registrationVc.consensusTimestamp) : (typeof data['createdAt'] === 'string' ? data['createdAt'] : null),
                    // createdAt is worker-derived (vintage/crediting-period), not an
                    // on-chain timestamp — don't overstate it as 'actual'.
                    dateType: registrationVc ? 'actual' : (typeof data['createdAt'] === 'string' ? 'expected' : null),
                },
                {
                    key: 'validation',
                    label: 'Validation',
                    // A project that already has a later-stage VC clearly moved past
                    // validation even without an explicit validationReport VC on file —
                    // don't leave it stuck showing as the active step.
                    state: validationVc ? 'complete' : ((mrvVc || verificationVc || isIssued) ? 'complete' : 'expected'),
                    date: validationVc ? tsToDate(validationVc.consensusTimestamp) : null,
                    dateType: validationVc ? 'actual' : null,
                },
                {
                    key: 'mrvSubmission',
                    label: 'MRV Submission',
                    state: mrvVc ? 'complete' : (isIssued ? 'complete' : ((validationVc || verificationVc) ? 'expected' : 'pending')),
                    date: mrvVc ? tsToDate(mrvVc.consensusTimestamp) : (typeof data['creditingPeriodStart'] === 'string' ? data['creditingPeriodStart'] : null),
                    dateType: mrvVc ? 'actual' : (typeof data['creditingPeriodStart'] === 'string' ? 'expected' : null),
                },
                {
                    key: 'verification',
                    label: 'Verification',
                    state: verificationVc ? 'complete' : (isIssued ? 'complete' : (mrvVc ? 'current' : 'pending')),
                    date: verificationVc ? tsToDate(verificationVc.consensusTimestamp) : null,
                    dateType: verificationVc ? 'actual' : null,
                },
                {
                    key: 'issuance',
                    label: 'Issuance',
                    state: isIssued ? 'complete' : (verificationVc ? 'current' : 'pending'),
                    date: isIssued ? (firstIssuanceEvent?.mintDate ?? null) : expectedIssuanceYear,
                    dateType: isIssued ? 'actual' : (expectedIssuanceYear ? 'expected' : null),
                },
            ];
        }

        return {
            id: row.id,
            network,
            name: friendlyName,
            description: typeof data['description'] === 'string' ? data['description'] : null,
            country: typeof data['country'] === 'string' ? data['country'] : null,
            lat: typeof data['lat'] === 'number' ? data['lat'] : null,
            lng: typeof data['lng'] === 'number' ? data['lng'] : null,
            polygon: row.polygon ?? null,
            methodology: typeof data['methodology'] === 'string' ? data['methodology'] : null,
            methodologyId: typeof data['methodologyId'] === 'string' ? data['methodologyId'] : null,
            registryDid: row.registryDid,
            registryName: row.registryName,
            developer: typeof data['developer'] === 'string' ? data['developer'] : null,
            // Detail-page-only, matching linkedSchemas/mrvSchemas: contact details
            // never ship on list rows (privacy + payload weight). Falls back to
            // the legacy singular businessData key for rows written before
            // array support existed — project-mapper.service.ts no longer
            // writes that key, but old rows still have it instead of the array.
            developerEmails: full
                ? (Array.isArray(data['developerEmails'])
                    ? (data['developerEmails'] as string[])
                    : typeof data['developerEmail'] === 'string' ? [data['developerEmail']] : [])
                : [],
            developerPhones: full
                ? (Array.isArray(data['developerPhones'])
                    ? (data['developerPhones'] as string[])
                    : typeof data['developerPhone'] === 'string' ? [data['developerPhone']] : [])
                : [],
            credits: typeof data['credits'] === 'number' ? data['credits'] : null,
            status: typeof data['status'] === 'string' ? data['status'] : null,
            vintage: typeof data['vintage'] === 'string' ? data['vintage'] : null,
            sdgs: Array.isArray(data['sdgs']) ? (data['sdgs'] as number[]) : [],
            cobenefits: typeof data['cobenefits'] === 'string' ? data['cobenefits'] : null,
            category: typeof data['category'] === 'string' ? data['category'] : null,
            scale: typeof data['scale'] === 'string' ? data['scale'] : null,
            sector: typeof data['sector'] === 'string' ? data['sector'] : null,
            sectoralScope: typeof data['sectoralScope'] === 'string' ? data['sectoralScope'] : null,
            createdAt: typeof data['createdAt'] === 'string' ? data['createdAt'] : null,
            creditingPeriodStart: typeof data['creditingPeriodStart'] === 'string' ? data['creditingPeriodStart'] : null,
            creditingPeriodEnd: typeof data['creditingPeriodEnd'] === 'string' ? data['creditingPeriodEnd'] : null,
            topicId: typeof data['topicId'] === 'string' ? data['topicId'] : null,
            policyTopicId: typeof data['policyTopicId'] === 'string' ? data['policyTopicId'] : null,
            instanceTopicId: typeof data['instanceTopicId'] === 'string' ? data['instanceTopicId'] : null,
            vcCount: typeof data['vcCount'] === 'number' ? data['vcCount'] : 0,
            decodeMethod: typeof data['decodeMethod'] === 'string' ? data['decodeMethod'] : null,
            metadata: data['metadata'] && typeof data['metadata'] === 'object' && !Array.isArray(data['metadata'])
                ? (data['metadata'] as Record<string, unknown>)
                : null,
            sourceTimestamp: row.sourceTimestamp,
            projectKey: row.projectKey ?? null,
            updatedAt: row.updatedAt,
            issuances: (row.issuances ?? []).map(i => ({
                tokenId: i.tokenId,
                name: i.name,
                symbol: i.symbol,
                type: i.type,
                supply: i.supply,
                mintDate: i.mintDate,
                rawVc: i.rawVc ?? null,
            })),
            issuanceEvents: (row.issuanceEvents ?? []).map(e => IssuanceEventDto.fromRow(e)),
            issuanceCount: row.issuanceCount ?? 0,
            totalIssued: row.totalIssued ?? 0,
            totalDeclared: row.totalDeclared ?? row.totalIssued ?? 0,
            totalTransferred: row.totalTransferred ?? null,
            totalRetired: row.totalRetired ?? 0,
            totalActive: row.totalActive ?? 0,
            // Detail-page-only: LinkedVcsPanel/ProjectPolicyCanvas/RelationshipDiagram
            // (pages/projects/[id].vue) are the only consumers — the list page never
            // reads these, so list rows skip shipping the per-schema/per-VC arrays.
            // Still computed above either way (friendlyName's ID-lookalike fallback,
            // and the pre-MV lifecycle-stage derivation, both depend on it).
            linkedSchemas: full ? linkedSchemas : [],
            mrvSchemas: full ? mrvSchemas : [],
            hasMrvData,
            lifecycleStage,
            expectedIssuanceYear,
            projectedVolume,
            projectedIssuance,
            milestones,
        };
    }
}

export class PaginatedProjectsDto {
    @ApiProperty({ type: [ProjectResponseDto] })
    data: ProjectResponseDto[];

    @ApiProperty()
    meta: { page: number; limit: number; total: number; totalPages: number };

    @ApiProperty({ type: ProjectListSummaryDto, description: 'Aggregates over every project matching the current filters, not just this page' })
    summary: ProjectListSummaryDto;
}
