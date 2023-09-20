import { Artifact, DatabaseServer, getArtifactType } from "@guardian/common";
import { GenerateUUIDv4 } from "@guardian/interfaces";
import { INotifier } from "@helpers/notifier";

/**
 * Import Result
 */
interface ImportResult {
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

/**
 * Import artifacts by files
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importArtifactsByFiles(
    owner: string,
    artifacts: any[] = [],
    notifier: INotifier
): Promise<ImportResult> {
    const errors: any[] = [];
    const artifactsMap = new Map<string, string>();

    notifier.start('Import artifacts');
    const addedArtifacts = [];
    for (const artifact of artifacts) {
        delete artifact._id;
        delete artifact.id;
        const newArtifactUUID = GenerateUUIDv4();
        artifact.owner = owner;
        artifact.uuid = newArtifactUUID;
        artifact.type = getArtifactType(artifact.extention);
        addedArtifacts.push(await DatabaseServer.saveArtifact(artifact));
        await DatabaseServer.saveArtifactFile(newArtifactUUID, artifact.data);

        artifactsMap.set(artifact.uuid, newArtifactUUID);
    }

    notifier.completed();
    return { artifactsMap, errors, artifacts: addedArtifacts };
}