/**
 * Abstract repository for aggregating PROJECT business_view rows by SDG.
 *
 * Implementations expose a single findAll() that returns one row per SDG id
 * encountered across all projects on the network. Services depend only on
 * this interface so swapping to a different storage backend only requires
 * a new implementation.
 */

export interface SdgStatsRow {
    sdgId: number;
    projects: number;
    credits: number;
    developers: number;
    countries: number;
    topMethodology: string | null;
}

export abstract class SdgRepository {
    abstract findAll(): Promise<SdgStatsRow[]>;
}
