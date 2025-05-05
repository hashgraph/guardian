import { IOwner } from '@guardian/interfaces';
import { INotifier } from '../../notifier.js';
import { ImportArtifactResult } from './artifact-import.interface.js';
import { ArtifactImport } from './artifact-import.js';
import { ImportMode } from '../common/import.interface.js';

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
    notifier: INotifier
): Promise<ImportArtifactResult> {
    const artifactImport = new ArtifactImport(mode, notifier);
    return await artifactImport.import(artifacts, user);
}
