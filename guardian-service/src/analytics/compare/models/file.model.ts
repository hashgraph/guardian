import { CompareOptions, IArtifactRawData } from '../interfaces/index.js';
import { Hash3, Sha256 } from '../hash/utils.js';

/**
 * File Model
 */
export class FileModel {
    /**
     * ID
     * @public
     */
    public readonly uuid: string;

    /**
     * Token ID
     * @public
     */
    public readonly data: string;

    /**
     * Weights
     * @private
     */
    private _weight: string;

    /**
     * Compare Options
     * @private
     */
    private readonly options: CompareOptions;

    constructor(raw: IArtifactRawData, options: CompareOptions) {
        this.options = options;
        this.uuid = raw.uuid;
        this.data = Sha256.hash(raw.data);
        this.update(this.options);
    }

    /**
     * Comparison of models using id
     * @param item - model
     * @public
     */
    public equal(item: FileModel): boolean {
        if (!this._weight) {
            return this.uuid === item.uuid;
        }
        return this._weight === item._weight;
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        return {
            uuid: this.uuid,
            data: this.data,
        }
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options?: CompareOptions): string {
        return this._weight;
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: CompareOptions): void {
        const hashState = new Hash3();
        hashState.add(String(this.uuid));
        hashState.add(String(this.data));
        this._weight = hashState.result();
    }

    /**
     * Create model
     * @param raw
     * @param options
     * @public
     * @static
     */
    public static fromEntity(
        raw: IArtifactRawData,
        options: CompareOptions
    ): FileModel {
        if (!raw) {
            throw new Error('Unknown artifact');
        }
        const artifactsModel = new FileModel(raw, options);
        artifactsModel.update(options);
        return artifactsModel;
    }
}
