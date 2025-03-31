import { DatabaseServer, getArtifactType } from '@guardian/common';
import { GenerateUUIDv4, IOwner } from '@guardian/interfaces';
import { INotifier } from '../notifier.js';
import { ImportArtifactResult } from './artifact-import.interface.js';

/**
 * Import artifacts by files
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importArtifactsByFiles(
    user: IOwner,
    artifacts: any[] = [],
    notifier: INotifier
): Promise<ImportArtifactResult> {
    const errors: any[] = [];
    const artifactsMap = new Map<string, string>();

    notifier.start('Import artifacts');
    const addedArtifacts = [];
    for (const artifact of artifacts) {
        const oldArtifactUUID = artifact.uuid;
        const newArtifactUUID = GenerateUUIDv4();
        delete artifact._id;
        delete artifact.id;
        artifact.creator = user.creator;
        artifact.owner = user.owner;
        artifact.uuid = newArtifactUUID;
        artifact.type = getArtifactType(artifact.extention);
        const file = await DatabaseServer.saveArtifact(artifact)
        await DatabaseServer.saveArtifactFile(newArtifactUUID, artifact.data);
        addedArtifacts.push(file);
        artifactsMap.set(oldArtifactUUID, newArtifactUUID);
    }

    notifier.completed();
    return { artifactsMap, errors, artifacts: addedArtifacts };
}
