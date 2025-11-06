import { CompareOptions, IChildrenLvl, IWeightModel, IKeyMap, IVcDocument, IVpDocument } from '../interfaces/index.js';
import { CompareUtils } from '../utils/index.js';
import { Hash3 } from '../hash/utils.js';
import { WeightType } from '../types/index.js';
import { SchemaModel } from './schema.model.js';
import { DocumentFieldsModel } from './document-fields.model.js';
import { PropertyModel } from './property.model.js';
import { PropertiesModel } from './properties.model.js';

/**
 * Document Type
 */
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
    public readonly options: CompareOptions;

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
     * Policy
     * @public
     */
    public readonly policy: string;

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
     * All schemas
     * @private
     */
    private _schemas: SchemaModel[];

    /**
     * Properties
     * @private
     */
    private readonly _document: DocumentFieldsModel;

    /**
     * Properties
     * @private
     */
    private readonly _options: PropertiesModel;

    /**
     * Attributes
     * @private
     */
    private _attributes: any;

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

    /**
     * Attributes
     * @public
     */
    public get attributes(): any {
        return this._attributes;
    }

    constructor(
        type: DocumentType,
        document: IVcDocument | IVpDocument,
        options: CompareOptions
    ) {
        this.type = type;
        this.options = options;
        this.id = document.id;
        this.messageId = document.messageId;
        this.topicId = document.topicId;
        this.owner = document.owner;
        this.policy = document.policyId;

        this._document = new DocumentFieldsModel(document.document);
        this._options = new PropertiesModel(document.option);

        this._weight = [];
        this._weightMap = {};
        this._hash = '';
        this._relationships = [];
    }

    /**
     * Set attributes
     * @param schemas
     * @public
     */
    public setAttributes(attributes: any): DocumentModel {
        this._attributes = attributes;
        return this;
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
     * Set schema models
     * @param schemas
     * @public
     */
    public setSchemas(schemas: SchemaModel[]): DocumentModel {
        this._schemas = schemas;
        return this;
    }

    /**
     * Update all weight
     * @public
     */
    public update(options: CompareOptions): DocumentModel {
        const weights = [];
        const weightMap = {};
        const hashUtils = new Hash3();

        let _hash = '0';
        let _hashSchemas = '0';
        let _children = '0';
        let _children1 = '0';
        let _children2 = '0';
        let _document = '0';
        let _documentAndChildren = '0';

        if (this._document && this._schemas) {
            this._document.updateSchemas(this._schemas, options);
            this._document.update(options);
        }

        if (this._schemas) {
            hashUtils.clear();
            for (const schema of this._schemas) {
                hashUtils.add(String(schema.hash(options)));
            }
            _hashSchemas = hashUtils.result();
        }

        if (this._relationships) {
            hashUtils.clear();
            hashUtils.add(_hashSchemas);
            for (const child of this._relationships) {
                hashUtils.add(String(child._hash));
            }
            _hash = hashUtils.result();
        }

        if (this._relationships) {
            hashUtils.clear();
            for (const child of this._relationships) {
                hashUtils.add(child.type);
            }
            _children1 = hashUtils.result();

            hashUtils.clear();
            for (const child of this._relationships) {
                hashUtils.add(child.getWeight(WeightType.CHILD_LVL_2));
            }
            _children2 = hashUtils.result();
        }

        if (this._document) {
            hashUtils.clear();
            hashUtils.add(this._document.hash(options));
            _document = hashUtils.result();
        }

        if (options.childLvl === IChildrenLvl.All) {
            _children = _children2;
        } else if (options.childLvl === IChildrenLvl.First) {
            _children = _children1;
        } else {
            _children = '0';
        }
        _documentAndChildren = CompareUtils.aggregateHash(_document, _children);

        weightMap[WeightType.CHILD_LVL_2] = _children2;
        weightMap[WeightType.CHILD_LVL_1] = _children;
        weightMap[WeightType.PROP_LVL_2] = _document;
        weightMap[WeightType.PROP_AND_CHILD_2] = _documentAndChildren;

        weights.push(_children);
        weights.push(_document);
        weights.push(''); //Schemas = -3
        weights.push(''); //Schemas = -2
        weights.push(''); //Schemas = -1
        weights.push(_document); //Schemas = -3
        weights.push(_document); //Schemas = -2
        weights.push(_document); //Schemas = -1
        weights.push(_documentAndChildren);

        this._hash = CompareUtils.aggregateHash(_hash, _document);
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
    private compareWeight(doc: DocumentModel, index: number, schema: number): boolean {
        const result = this._weight[index] === doc._weight[index] && this._weight[index] !== '0';
        switch (index) {
            case 1: return schema > -2 && result;
            case 2: return schema > -3 && result;
            case 3: return schema > -4 && result;
            case 4: return schema > -2;
            case 5: return schema > -3;
            case 6: return schema > -4;
            default: return result;
        }
    }

    /**
     * Get schemas list
     * @public
     */
    public getSchemas(): string[] {
        if (this._document && this._document.schemas) {
            return this._document.schemas;
        } else {
            return [];
        }
    }

    /**
     * Get document type
     * @public
     */
    public getTypes(): string[] {
        if (this._document && this._document.types) {
            return this._document.types;
        } else {
            return [];
        }
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

        if (!this._weight.length) {
            return this._hash === doc._hash;
        }

        if (!Number.isFinite(index)) {
            return this._hash === doc._hash;
        }

        const schemas = CompareUtils.compareSchemas(this._schemas, doc._schemas);
        if (schemas > 0 && schemas < 100) {
            return false;
        }

        return this.compareWeight(doc, index, schemas);
    }

    /**
     * Merge documents
     * @param docs - models
     * @public
     */
    public merge(docs: DocumentModel[] | DocumentModel): void {
        if (Array.isArray(docs)) {
            for (const doc of docs) {
                this.merge(doc);
            }
        } else {
            this._document.merge(docs._document);
        }
    }

    /**
     * Comparison of models using key
     * @param item - model
     * @public
     */
    public equalKey(doc: DocumentModel): boolean {
        const schemas = CompareUtils.compareSchemas(this._schemas, doc._schemas);
        return schemas < 0;
    }

    /**
     * Get fields
     * @public
     */
    public getOptionsList(): PropertyModel<any>[] {
        return this._options.getPropList();
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
        const options = this._options.getPropList();
        return {
            key: this.key,
            owner: this.owner,
            policy: this.policy,
            attributes: this.attributes,
            document,
            options
        }
    }

    /**
     * Convert class to object
     * @public
     */
    public info(): any {
        return {
            id: this.id,
            type: this.type,
            owner: this.owner,
            policy: this.policy,
        };
    }

    /**
     * Get schema title
     * @public
     */
    public title(): string {
        const titles: string[] = [];
        if (this._schemas) {
            for (const schema of this._schemas) {
                if (schema.description) {
                    titles.push(schema.description);
                } else if (schema.name) {
                    titles.push(schema.name);
                } else if (schema.iri) {
                    titles.push(schema.iri);
                }
            }
        }
        if (titles.length) {
            return titles.join(', ');
        } else {
            return this.key;
        }
    }
}

/**
 * VC Document Model
 */
export class VcDocumentModel extends DocumentModel {
    constructor(vc: IVcDocument, options: CompareOptions) {
        super(DocumentType.VC, vc, options);

        this._relationshipIds = [];
        if (Array.isArray(vc.relationships)) {
            for (const id of vc.relationships) {
                this._relationshipIds.push(id);
            }
        }

        this._key = vc.schema;
    }

    public static from(data: any, options: CompareOptions): VcDocumentModel {
        return new VcDocumentModel({
            schema: null,
            document: data
        } as any, options);
    }
}

/**
 * VP Document Model
 */
export class VpDocumentModel extends DocumentModel {
    constructor(vp: IVpDocument, options: CompareOptions) {
        super(DocumentType.VP, vp, options);

        this._relationshipIds = [];
        if (Array.isArray(vp.relationships)) {
            for (const id of vp.relationships) {
                this._relationshipIds.push(id);
            }
        }

        this._key = vp.type;
    }

    public static from(data: any, options: CompareOptions): VpDocumentModel {
        return new VpDocumentModel({
            type: null,
            document: data
        } as any, options);
    }
}
