import { VcDocument, VpDocument } from "@guardian/common";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IWeightModel } from "../interfaces/weight-model.interface";
import { IKeyMap } from "../interfaces/key-map.interface";
import { WeightType } from "../types/weight.type";

enum DocumentType {
    VC = 'VC',
    VP = 'VP'
}

/**
 * Document Model
 */
export class DocumentModel implements IWeightModel {
    /**
     * Document id
     * @public
     */
    public readonly id: string;

    /**
     * Document type
     * @public
     */
    public readonly type: DocumentType;

    /**
     * Compare Options
     * @private
     */
    public readonly options: ICompareOptions;

    /**
     * Document
     * @public
     */
    public readonly document: any;

    /**
     * Message Id
     * @public
     */
    public readonly messageId: string;

    /**
     * TopicId
     * @public
     */
    public readonly topicId: string;

    /**
     * Relationship IDs
     * @public
     */
    public readonly relationshipIds: string[];

    /**
     * Schema
     * @public
     */
    public readonly schema: string;

    /**
     * All relationships
     * @private
     */
    private _relationships: DocumentModel[];

    /**
     * Weights
     * @private
     */
    private _weight: string[];

    /**
     * Weights map by name
     * @private
     */
    private _weightMap: IKeyMap<string>;

    /**
     * Children
     * @public
     */
    public get children(): DocumentModel[] {
        return this._relationships;
    }

    /**
     * Model key
     * @public
     */
    public get key(): string {
        return this.schema;
    }

    constructor(
        type: DocumentType,
        document: VcDocument | VpDocument,
        options: ICompareOptions
    ) {
        this.type = type;
        this.options = options;
        this.id = document.id;
        this.messageId = document.messageId;
        this.topicId = document.topicId;
        this.document = document.document;

        this._weight = [];
        this._weightMap = {};
    }

    /**
     * Set relationship models
     * @param relationships
     * @public
     */
    public setRelationships(relationships: DocumentModel[]): DocumentModel {
        this._relationships = relationships;
        return this;
    }


    /**
     * Update all weight
     * @public
     */
    public update(options: ICompareOptions): DocumentModel {
        const weights = [];
        const weightMap = {};


        this._weightMap = weightMap;
        this._weight = weights.reverse();
        return this;
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
    public equal(doc: DocumentModel, index?: number): boolean {
        if (this.key !== doc.key) {
            return false;
        }
        if (!this._weight.length) {
            return this.key === doc.key;
        }
        if (Number.isFinite(index)) {
            if (this._weight[index] === '0' && doc._weight[index] === '0') {
                return false;
            } else {
                return this._weight[index] === doc._weight[index];
            }
        } else {
            return this._weight[0] === doc._weight[0];
        }
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        return {};
    }
}


/**
 * VC Document Model
 */
export class VcDocumentModel extends DocumentModel {
    constructor(vc: VcDocument, options: ICompareOptions) {
        super(DocumentType.VC, vc, options)
    }
}

/**
 * VP Document Model
 */
export class VpDocumentModel extends DocumentModel {
    constructor(vp: VpDocument, options: ICompareOptions) {
        super(DocumentType.VP, vp, options)
    }
}