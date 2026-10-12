import { Artifact } from '@guardian/common/entity/artifact';

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