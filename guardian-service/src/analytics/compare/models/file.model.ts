import { Artifact } from '@guardian/common';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import MurmurHash3 from 'imurmurhash';
import * as crypto from 'crypto';

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
    private readonly options: ICompareOptions;

    constructor(artifact: Artifact, buffer: Buffer, options: ICompareOptions) {
        this.options = options;
        this.uuid = artifact.uuid;
        this.data = crypto
            .createHash('sha256')
            .update(buffer || '')
            .digest()
            .toString();
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
    public hash(options?: ICompareOptions): string {
        return this._weight;
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: ICompareOptions): void {
        const hashState = MurmurHash3();
        hashState.hash(String(this.uuid));
        hashState.hash(String(this.data));
        this._weight = String(hashState.result());
    }
}
