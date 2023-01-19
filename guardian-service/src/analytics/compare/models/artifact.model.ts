import MurmurHash3 from 'imurmurhash';
import { ICompareOptions } from '../interfaces/compare-options.interface';

/**
 * Artifact Model
 */
export class ArtifactModel {
    /**
     * Artifact key
     */
    public readonly name: any;
    /**
     * File UUID
     */
    public readonly uuid: any;
    /**
     * File type
     */
    public readonly type: any;
    /**
     * File extension
     */
    public readonly extension: any;
    /**
     * File weight (hash)
     */
    public get weight(): string {
        return this._weight;
    }
    /**
     * Model key
     */
    public get key(): string {
        return null;
    }
    /**
     * File weight (hash)
     */
    private _weight: string;
    /**
     * File hash
     */
    private hash: string;

    constructor(json: any) {
        this.name = json.name;
        this.uuid = json.uuid;
        this.type = json.type;
        this.extension = json.extention;
    }

    /**
     * Update all weight
     * @param data - file data (hash)
     * @param options - comparison options
     * @public
     */
    public update(data: string, options: ICompareOptions): void {
        const hashState = MurmurHash3();
        hashState.hash(this.name);
        hashState.hash(this.type);
        hashState.hash(this.extension);
        hashState.hash(data);
        const weight = String(hashState.result());
        if (options.eventLvl > 0) {
            this._weight = weight;
        } else {
            this._weight = '';
        }
        this.hash = weight;
    }

    /**
     * Convert class to object
     */
    public toObject(): any {
        return {
            uuid: this.uuid,
            name: this.name,
            type: this.type,
            extension: this.extension,
            weight: this._weight,
        };
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @param index - weight index
     * @public
     */
    public equal(item: ArtifactModel, index?: number): boolean {
        return this.hash === item.hash;
    }
}