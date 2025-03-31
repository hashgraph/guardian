import { Artifact } from "@guardian/common";

/**
 * Import Result
 */
export interface ImportArtifactResult {
    /**
     * New token uuid
     */
    artifactsMap: Map<string, string>;
    /**
     * Errors
     */
    errors: any[];
    /**
     * Errors
     */
    artifacts: Artifact[];
}