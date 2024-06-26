import { Hash3 } from '../hash/utils.js';
import { IBlockArtifactRawData, IWeightItem, CompareOptions, IEventsLvl } from '../interfaces/index.js';

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
     * @private
     */
    private _weight: string;
    /**
     * File hash
     * @private
     */
    private _hash: string;

    constructor(json: IBlockArtifactRawData) {
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
    public update(data: string, options: CompareOptions): void {
        const hashState = new Hash3();
        hashState.add(this.name);
        hashState.add(this.type);
        hashState.add(this.extension);
        hashState.add(data);
        const weight = String(hashState.result());
        if (options.eventLvl === IEventsLvl.All) {
            this._weight = weight;
        } else {
            this._weight = '';
        }
        this._hash = weight;
    }

    /**
     * Convert class to object
     * @public
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
        return this._hash === item._hash;
    }

    /**
     * Comparison of models using key
     * @param item - model
     * @public
     */
    public equalKey(doc: ArtifactModel): boolean {
        return this.key === doc.key;
    }

    /**
     * Get weight object
     * @public
     */
    public toWeight(options: CompareOptions): IWeightItem {
        return {
            weight: this._hash
        }
    }
}
