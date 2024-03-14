import { ArtifactType } from '../type/artifact.type.js';

/**
 * Artifact interface
 */
export interface IArtifact {
    /**
     * Id
     */
    _id: any;
    /**
     * Serialized Id
     */
    id: string;
    /**
     * UUID
     */
    uuid?: string;
    /**
     * Name
     */
    name?: string;
    /**
     * Extention
     */
    extention?: string;
    /**
     * Artifact Type
     */
    type?: ArtifactType;
}
