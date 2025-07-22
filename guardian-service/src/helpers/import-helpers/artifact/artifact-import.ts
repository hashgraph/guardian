import { Artifact, DatabaseServer, getArtifactType, INotificationStep } from '@guardian/common';
import { GenerateUUIDv4, IOwner } from '@guardian/interfaces';
import { ObjectId } from '@mikro-orm/mongodb';
import { ImportMode } from '../common/import.interface.js';
import { ImportArtifactResult } from './artifact-import.interface.js';

export class ArtifactImport {
    private readonly mode: ImportMode;
    private readonly notifier: INotificationStep;

    constructor(mode: ImportMode, notifier: INotificationStep) {
        this.mode = mode;
        this.notifier = notifier;
    }

    public async import(
        artifacts: any[],
        user: IOwner
    ): Promise<ImportArtifactResult> {
        this.notifier.start();
        const { artifactsMap, artifactsObject, errors } = this.importArtifactsByFiles(artifacts, user);
        const addedArtifacts = await this.saveArtifacts(artifactsObject);
        this.notifier.complete();
        return {
            artifactsMap,
            artifacts: addedArtifacts,
            errors
        };
    }

    private prepareArtifactData(artifact: any, user: IOwner): Partial<any> {
        if (this.mode === ImportMode.VIEW) {
            return {
                _id: new ObjectId(artifact.id),
                id: artifact.id,
                uuid: artifact.uuid,
                type: getArtifactType(artifact.extention),
                name: artifact.name,
                category: artifact.category,
                extention: artifact.extention,
                data: artifact.data,
                policyId: artifact.policyId,
                owner: user.owner,
                creator: user.creator
            }
        } else {
            return {
                uuid: GenerateUUIDv4(),
                type: getArtifactType(artifact.extention),
                name: artifact.name,
                category: artifact.category,
                extention: artifact.extention,
                data: artifact.data,
                policyId: null,
                owner: user.owner,
                creator: user.creator
            }
        }
    }

    private importArtifactsByFiles(artifacts: Artifact[], user: IOwner) {
        const errors: any[] = [];
        const artifactsMap = new Map<string, string>();
        const artifactsObject: any[] = [];

        for (const artifact of artifacts) {
            const artifactObject = this.prepareArtifactData(artifact, user);
            artifactsObject.push(artifactObject);
            artifactsMap.set(artifact.uuid, artifactObject.uuid);
        }
        return { artifactsMap, artifactsObject, errors };
    }

    private async saveArtifacts(artifactsObject: Artifact[]): Promise<Artifact[]> {
        const addedArtifacts: Artifact[] = [];
        for (const artifact of artifactsObject) {
            const data = (artifact as any).data;
            delete (artifact as any).data;
            const file = await DatabaseServer.saveArtifact(artifact);
            await DatabaseServer.saveArtifactFile(artifact.uuid, data);
            addedArtifacts.push(file);
        }
        return addedArtifacts;
    }
}