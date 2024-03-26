import { IRecordResult } from '@guardian/common';
import { CompareOptions } from '../interfaces/compare-options.interface.js';
import { IWeightModel } from '../interfaces/weight-model.interface.js';
import { IKeyMap } from '../interfaces/key-map.interface.js';
import { WeightType } from '../types/weight.type.js';
import { DocumentModel } from './document.model.js';

/**
 * Document Model
 */
export class RecordModel implements IWeightModel {
    /**
     * Compare Options
     * @public
     */
    public readonly options: CompareOptions;

    /**
     * All children
     * @protected
     */
    protected _children: DocumentModel[];

    /**
     * Weights
     * @protected
     */
    protected _weight: string[];

    /**
     * Weights map by name
     * @protected
     */
    protected _weightMap: IKeyMap<string>;

    /**
     * Weights
     * @protected
     */
    protected _key: string;

    /**
     * Hash
     * @private
     */
    private _hash: string;

    /**
     * Count
     * @private
     */
    private _count: number;

    /**
     * Tokens
     * @private
     */
    private _tokens: number;

    /**
     * Children
     * @public
     */
    public get children(): DocumentModel[] {
        return this._children;
    }

    /**
     * Model key
     * @public
     */
    public get key(): string {
        return this._key;
    }

    /**
     * Count
     * @public
     */
    public get count(): number {
        return this._count;
    }

    /**
     * Tokens
     * @public
     */
    public get tokens(): number {
        return this._tokens;
    }

    constructor(
        options: CompareOptions
    ) {
        this.options = options;

        this._weight = [];
        this._weightMap = {};
        this._hash = '';
    }

    private findToken(document: IRecordResult): number {
        try {
            const vp = document?.document;
            const vcs = vp?.verifiableCredential || [];
            const mintIndex = Math.max(1, vcs.length - 1);
            const mint = vcs[mintIndex];
            if (mint && mint.credentialSubject) {
                if (Array.isArray(mint.credentialSubject)) {
                    return Number(mint.credentialSubject[0].amount);
                } else {
                    return Number(mint.credentialSubject.amount);
                }
            } else {
                return 0;
            }
        } catch (error) {
            return 0;
        }
    }

    /**
     * Set documents
     * @param children
     * @public
     */
    public setDocuments(documents: IRecordResult[]): RecordModel {
        this._count = 0;
        this._tokens = 0;
        if (Array.isArray(documents)) {
            for (const document of documents) {
                if (document.type === 'vc') {
                    this._count++;
                }
                if (document.type === 'vp') {
                    this._count++;
                    this._tokens += this.findToken(document);
                }
            }
        }
        return this;
    }

    /**
     * Set relationship models
     * @param children
     * @public
     */
    public setChildren(children: DocumentModel[]): RecordModel {
        if (Array.isArray(children)) {
            this._children = children;
        } else {
            this._children = [];
        }
        return this;
    }

    /**
     * Update all weight
     * @public
     */
    public update(options: CompareOptions): RecordModel {
        const weights = [];
        const weightMap = {};
        this._hash = ''
        this._weightMap = weightMap;
        this._weight = weights.reverse();
        return this;
    }

    /**
     * Compare weight
     * @param doc
     * @param index
     * @param schema
     * @private
     */
    private compareWeight(doc: RecordModel, index: number): boolean {
        return this._weight[index] === doc._weight[index] && this._weight[index] !== '0';
    }

    /**
     * Get weight by name
     * @param type - weight name
     * @public
     */
    public getWeight(type?: WeightType): string {
        if (type) {
            return this._weightMap[type];
        } else {
            return this._weight[0];
        }
    }

    /**
     * Check weight by number
     * @param index - weight index
     * @public
     */
    public checkWeight(index: number): boolean {
        return index < this._weight.length;
    }

    /**
     * Get all weight
     * @public
     */
    public getWeights(): string[] {
        return this._weight;
    }

    /**
     * Get weight number
     * @public
     */
    public maxWeight(): number {
        return this._weight ? this._weight.length : 0;
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @param index - weight index
     * @public
     */
    public equal(doc: RecordModel, index?: number): boolean {
        if (!this._weight.length) {
            return this._hash === doc._hash;
        }

        if (!Number.isFinite(index)) {
            return this._hash === doc._hash;
        }

        return this.compareWeight(doc, index);
    }

    /**
     * Comparison of models using key
     * @param item - model
     * @public
     */
    public equalKey(doc: RecordModel): boolean {
        return true;
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        return {
            documents: this._count,
            tokens: this._tokens,
        }
    }

    /**
     * Convert class to object
     * @public
     */
    public info(): any {
        return {
            documents: this._count,
            tokens: this._tokens,
        }
    }
}
