import { IOwner } from '@guardian/interfaces';
import { ImportArtifactResult } from './artifact-import.interface.js';
import { ArtifactImport } from './artifact-import.js';
import { ImportMode } from '../common/import.interface.js';
import { INotificationStep } from '@guardian/common';

/**
 * Import artifacts by files
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importArtifactsByFiles(
    user: IOwner,
    artifacts: any[] = [],
    mode: ImportMode,
    notifier: INotificationStep,
    userId: string | null
): Promise<ImportArtifactResult> {
    notifier.start();
    const artifactImport = new ArtifactImport(mode, notifier);
    const result = await artifactImport.import(artifacts, user);
    notifier.complete();
    return result;
}
