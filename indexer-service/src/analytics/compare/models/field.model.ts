import { CompareOptions, IIdLvl, IPropertiesLvl, IKeyMap, IWeightModel } from '../interfaces/index.js';
import { PropertyType, WeightType } from '../types/index.js';
import { AnyPropertyModel, ArrayPropertyModel, PropertyModel, UUIDPropertyModel } from './property.model.js';
import { SchemaDocumentModel } from './schema-document.model.js';
import { Hash3 } from '../hash/utils.js';

/**
 * Field Model
 * @extends IWeightModel
 */
export class FieldModel implements IWeightModel {
    /**
     * Model index
     * @public
     */
    public readonly index: number;

    /**
     * Field name
     * @public
     */
    public readonly name: string;

    /**
     * Field title
     * @public
     */
    public readonly title: string;

    /**
     * Field property
     * @public
     */
    public readonly property: string;

    /**
     * Field description
     * @public
     */
    public readonly description: string;

    /**
     * Field type
     * @public
     */
    public readonly type: string;

    /**
     * Field format
     * @public
     */
    public readonly format: string;

    /**
     * Pattern
     * @public
     */
    public readonly pattern: string;

    /**
     * Unit
     * @public
     */
    public readonly unit: string;

    /**
     * Unit System
     * @public
     */
    public readonly unitSystem: string;

    /**
     * If value = array
     * @public
     */
    public readonly isArray: boolean;

    /**
     * If value = sub-schema
     * @public
     */
    public readonly isRef: boolean;

    /**
     * ReadOnly
     * @public
     */
    public readonly readOnly: boolean;

    /**
     * Required
     * @public
     */
    public readonly required: boolean;

    /**
     * Custom type
     * @public
     */
    public readonly customType: string;

    /**
     * Field comment
     * @public
     */
    public readonly comment: string;

    /**
     * If value = remote link
     * @public
     */
    public readonly remoteLink: string;

    /**
     * If value = enum
     * @public
     */
    public readonly enum: string[];

    /**
     * Field order
     * @public
     */
    public readonly order: number;

    /**
     * Children
     * @public
     */
    public get children(): FieldModel[] {
        if (this._subSchema) {
            return this._subSchema.fields;
        }
        return [];
    }

    /**
     * Condition
     * @public
     */
    public get condition(): string {
        return this._condition;
    }

    /**
     * Model key
     * @public
     */
    public get key(): string {
        return null;
    }

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
     * Condition
     * @private
     */
    private _condition: string;

    /**
     * Sub-schema
     * @private
     */
    private _subSchema: SchemaDocumentModel;

    constructor(
        name: string,
        prop: any,
        required: boolean
    ) {
        let _property = prop;
        if (_property.oneOf && _property.oneOf.length) {
            _property = _property.oneOf[0];
        }

        this.name = name;
        this.title = _property.title || name;
        this.description = _property.description || name;
        this.comment = _property.$comment;

        this.isArray = _property.type === 'array';
        if (this.isArray) {
            _property = _property.items;
        }

        this.isRef = !!(_property.$ref && !_property.type);
        if (this.isRef) {
            this.type = _property.$ref;
        } else {
            this.type = _property.type ? String(_property.type) : null;
            this.format = _property.format ? String(_property.format) : null;
            this.pattern = _property.pattern ? String(_property.pattern) : null;
            this.enum = _property.enum;
            this.remoteLink = _property.$ref;
        }

        this.readOnly = !!(_property.readOnly);

        const {
            unit,
            unitSystem,
            customType,
            orderPosition,
            property
        } = this.parseFieldComment(this.comment);

        this.unit = unit ? String(unit) : null;
        this.unitSystem = unitSystem ? String(unitSystem) : null;
        this.property = property ? String(property) : null;
        this.customType = customType ? String(customType) : null;
        this.required = required;

        if (Number.isFinite(orderPosition) && orderPosition > -1) {
            this.order = orderPosition;
        } else {
            this.order = -1;
        }
        this.index = this.order === -1 ? null : this.order;

        this._weight = [];
        this._weightMap = {};
    }

    /**
     * Parse Field comment
     * @param comment
     * @private
     */
    private parseFieldComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Calculations base weight
     * @param options - comparison options
     * @public
     */
    public calcBaseWeight(options: CompareOptions): void {
        const weights = [];
        const weightMap = {};

        const hashState = new Hash3();

        if (options.propLvl) {
            hashState.clear();
            hashState.add(this.name);
            const weight = hashState.result();
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_0] = weight;
        }

        if (options.propLvl !== IPropertiesLvl.None) {
            hashState.clear();
            hashState.add(this.description);
            const weight = hashState.result();
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_1] = weight;
        }

        if (options.propLvl !== IPropertiesLvl.None) {
            hashState.clear();
            hashState.add(this.description);
            if (!this.isRef && options.idLvl === IIdLvl.All) {
                hashState.add(this.type);
            }
            const weight = hashState.result();
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_2] = weight;
        }

        if (options.propLvl !== IPropertiesLvl.None && options.idLvl === IIdLvl.All) {
            hashState.clear();
            hashState.add(this.name + this.description);
            if (!this.isRef) {
                hashState.add(this.type);
            }
            const weight = hashState.result();
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_3] = weight;
        }

        if (options.propLvl !== IPropertiesLvl.None) {
            hashState.clear();
            hashState.add(
                this.name +
                this.title +
                this.description +
                this.format +
                this.pattern +
                this.unit +
                this.unitSystem +
                this.isArray +
                this.isRef +
                this.readOnly +
                this.required +
                this.customType +
                this.remoteLink +
                this.condition
            );
            if (!this.isRef && options.idLvl === IIdLvl.All) {
                hashState.add(this.type);
            }
            if (Array.isArray(this.enum)) {
                for (const i of this.enum) {
                    hashState.add(i);
                }
            }
            const weight = hashState.result();
            weights.push(weight);
            weightMap[WeightType.SCHEMA_LVL_4] = weight;
        }

        this._weightMap = weightMap;
        this._weight = weights.reverse();
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
     * Check weight by number
     * @param index - weight index
     * @public
     */
    public checkWeight(iteration: number): boolean {
        return iteration < this._weight.length;
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @param index - weight index
     * @public
     */
    public equal(field: FieldModel, iteration?: number): boolean {
        if (!this._weight.length) {
            return this.name === field.name;
        }
        if (iteration) {
            if (this._weight[iteration] === '0' && field._weight[iteration] === '0') {
                return false;
            } else {
                return this._weight[iteration] === field._weight[iteration];
            }
        } else {
            return this._weight[0] === field._weight[0];
        }
    }

    /**
     * Comparison of models using key
     * @param item - model
     * @public
     */
    public equalKey(item: FieldModel): boolean {
        return this.key === item.key;
    }

    /**
     * Get properties
     * @param type - filter by property type
     * @public
     */
    public getPropList(type?: PropertyType): PropertyModel<any>[] {
        const properties: PropertyModel<any>[] = [];
        if (this.name) {
            properties.push(new AnyPropertyModel('name', this.name));
        }
        if (this.title) {
            properties.push(new AnyPropertyModel('title', this.title));
        }
        if (this.property) {
            properties.push(new AnyPropertyModel('property', this.property));
        }
        if (this.description) {
            properties.push(new AnyPropertyModel('description', this.description));
        }
        if (this.required !== undefined) {
            properties.push(new AnyPropertyModel('required', this.required));
        }
        if (this.isArray !== undefined) {
            properties.push(new AnyPropertyModel('multiple', this.isArray));
        }
        if (this.type) {
            properties.push(new UUIDPropertyModel('type', this.type));
        }
        if (this.format) {
            properties.push(new AnyPropertyModel('format', this.format));
        }
        if (this.pattern) {
            properties.push(new AnyPropertyModel('pattern', this.pattern));
        }
        if (this.customType) {
            properties.push(new AnyPropertyModel('customType', this.customType));
        }
        if (this.unit) {
            properties.push(new AnyPropertyModel('unit', this.unit));
        }
        if (this.unitSystem) {
            properties.push(new AnyPropertyModel('unitSystem', this.unitSystem));
        }
        if (this.readOnly !== undefined) {
            properties.push(new AnyPropertyModel('readOnly', this.readOnly));
        }
        if (this.remoteLink) {
            properties.push(new AnyPropertyModel('remoteLink', this.remoteLink));
        }
        if (Array.isArray(this.enum)) {
            properties.push(new ArrayPropertyModel('enum', this.enum.length));
            if (this.enum.length) {
                for (let index = 0; index < this.enum.length; index++) {
                    const v = this.enum[index];
                    properties.push(new AnyPropertyModel(String(index), v, 2, `enum.${index}`));
                }
            }
        }
        if (this.condition) {
            properties.push(new AnyPropertyModel('condition', this.condition));
        }
        if (this.order !== undefined) {
            properties.push(new AnyPropertyModel('order', this.order));
        }
        return properties;
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): any {
        return {
            index: this.index,
            name: this.name,
            title: this.title,
            property: this.property,
            description: this.description,
            type: this.type,
            format: this.format,
            pattern: this.pattern,
            unit: this.unit,
            unitSystem: this.unitSystem,
            isArray: this.isArray,
            isRef: this.isRef,
            readOnly: this.readOnly,
            required: this.required,
            customType: this.customType,
            comment: this.comment,
            remoteLink: this.remoteLink,
            enum: this.enum,
            condition: this.condition,
            order: this.order
        }
    }

    /**
     * Set sub-schema model
     * @param subSchema
     * @public
     */
    public setSubSchema(subSchema: SchemaDocumentModel): void {
        this._subSchema = subSchema;
    }

    /**
     * Set condition model
     * @param condition
     * @public
     */
    public setCondition(condition: string): void {
        this._condition = condition;
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: CompareOptions): void {
        if (this._subSchema) {
            this._subSchema.update(options);
        }
        this.calcBaseWeight(options);
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: CompareOptions): string {
        return this._weight[0];
    }

    /**
     * Get field
     * @param path
     * @public
     */
    public getField(path: string): FieldModel {
        if (!path) {
            return null;
        }
        const index = path.indexOf('.');
        if (index !== -1) {
            const name = path.slice(0, index);
            const next = path.slice(index + 1);
            if (name === this.name && this._subSchema) {
                return this._subSchema.getField(next);
            }
        } else {
            const name = path;
            if (name === this.name) {
                return this;
            }
        }
        return null;
    }
}
