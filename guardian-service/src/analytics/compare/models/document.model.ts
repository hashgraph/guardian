import { VcDocument, VpDocument } from "@guardian/common";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { IWeightModel } from "../interfaces/weight-model.interface";
import { IKeyMap } from "../interfaces/key-map.interface";
import { WeightType } from "../types/weight.type";
import MurmurHash3 from 'imurmurhash';
import { CompareUtils } from "../utils/utils";
import { SchemaModel } from "./schema.model";
import { DocumentFieldsModel } from "./document-fields.model";
import { PropertyModel } from "./property.model";

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
     * @public
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
     * Owner
     * @public
     */
    public readonly owner: string;

    /**
     * Relationship IDs
     * @protected
     */
    protected _relationshipIds: string[];

    /**
     * All relationships
     * @protected
     */
    protected _relationships: DocumentModel[];

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
     * Properties
     * @private
     */
    private readonly _document: DocumentFieldsModel;

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
        return this._key;
    }

    /**
     * Relationship IDs
     * @public
     */
    public get relationshipIds(): string[] {
        return this._relationshipIds;
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
        this.owner = document.owner;

        this._document =  new DocumentFieldsModel(document.document);

        this._weight = [];
        this._weightMap = {};
        this._hash = '';
    }

    /**
     * Set relationship models
     * @param relationships
     * @public
     */
    public setRelationships(relationships: DocumentModel[]): DocumentModel {
        if (Array.isArray(relationships)) {
            this._relationships = relationships;
        } else {
            this._relationships = [];
        }
        return this;
    }


    /**
     * Update all weight
     * @public
     */
    public update(options: ICompareOptions): DocumentModel {
        const weights = [];
        const weightMap = {};


        let _hashState: any;
        let _hash = '0';
        let _children = '0';
        let _children1 = '0';
        let _children2 = '0';
        let _document = '0';
        let _documentAndChildren = '0';

        if (this._relationships) {
            _hashState = MurmurHash3();
            _hashState.hash(this.key);
            for (const child of this._relationships) {
                _hashState.hash(String(child._hash));
            }
            _hash = String(_hashState.result());
        }

        if (this._relationships && this._relationships.length) {
            _hashState = MurmurHash3();
            for (const child of this._relationships) {
                _hashState.hash(child.key);
            }
            _children1 = String(_hashState.result());

            _hashState = MurmurHash3();
            for (const child of this._relationships) {
                _hashState.hash(child.getWeight(WeightType.CHILD_LVL_2));
            }
            _children2 = String(_hashState.result());

            if (options.childLvl > 1) {
                _children = _children2;
            } else if (options.childLvl > 0) {
                _children = _children1;
            } else {
                _children = '0';
            }
        }

        if (this._document) {
            _hashState = MurmurHash3();
            _hashState.hash(this.key)
            _hashState.hash(this._document.hash(options));
            _document = String(_hashState.result());
        }

        _documentAndChildren = CompareUtils.aggregateHash(_document, _children);

        weightMap[WeightType.CHILD_LVL_2] = _children2;
        weightMap[WeightType.CHILD_LVL_1] = _children;
        weightMap[WeightType.PROP_LVL_2] = _document;
        weightMap[WeightType.PROP_AND_CHILD_2] = _documentAndChildren;

        weights.push(weightMap[WeightType.CHILD_LVL_1]);
        weights.push(weightMap[WeightType.PROP_LVL_2]);
        weights.push(weightMap[WeightType.PROP_AND_CHILD_2]);

        this._hash = CompareUtils.aggregateHash(_hash, _document);
        this._weightMap = weightMap;
        this._weight = weights.reverse();
        return this;
    }


    /**
     * Update schema weights
     * @param schemaMap - schemas map
     * @param options - comparison options
     * @public
     */
    public updateSchemas(schemaMap: IKeyMap<SchemaModel>, options: ICompareOptions): void {
        this._document.updateSchemas(schemaMap, options);
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
        if (this.type !== doc.type) {
            return false;
        }
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
            return this._hash === doc._hash;
        }
    }


    /**
     * Get fields
     * @public
     */
    public getFieldsList(): PropertyModel<any>[] {
        return this._document.getFieldsList();
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        const document = this._document.getFieldsList();
        return {
            key: this.key,
            document,
        }
    }

    /**
     * Convert class to object
     * @public
     */
    public info(): any {
        return {
            id: this.id,
            type: this.type
        };
    }
}


/**
 * VC Document Model
 */
export class VcDocumentModel extends DocumentModel {
    constructor(vc: VcDocument, options: ICompareOptions) {
        super(DocumentType.VC, vc, options);

        this._relationshipIds = [];
        if (Array.isArray(vc.relationships)) {
            for (const id of vc.relationships) {
                this._relationshipIds.push(id);
            }
        }

        this._key = vc.schema;
    }

}

/**
 * VP Document Model
 */
export class VpDocumentModel extends DocumentModel {
    constructor(vp: VpDocument, options: ICompareOptions) {
        super(DocumentType.VP, vp, options);

        this._relationshipIds = [];
        if (Array.isArray(vp.relationships)) {
            for (const id of vp.relationships) {
                this._relationshipIds.push(id);
            }
        }

        this._key = vp.type;
    }
}