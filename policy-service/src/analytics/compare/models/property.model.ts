import { ICompareOptions } from '../interfaces/compare-options.interface';
import { IProperties } from '../interfaces/properties.interface';
import { PropertyType } from '../types/property.type';
import { SchemaModel } from './schema.model';
import { TokenModel } from './token.model';

/**
 * Property Model
 */
export class PropertyModel<T> implements IProperties<T> {
    /**
     * Property name
     * @public
     */
    public readonly name: string;

    /**
     * Property nesting level
     * @public
     */
    public readonly lvl: number;

    /**
     * Full path
     * @public
     */
    public readonly path: string;

    /**
     * Property type
     * @public
     */
    public readonly type: PropertyType;

    /**
     * Property value
     * @public
     */
    public readonly value?: T;

    /**
     * Properties
     * @protected
     */
    protected _subProp: PropertyModel<T>[];

    /**
     * Weight
     * @protected
     */
    protected _weight: string;

    constructor(
        name: string,
        type: PropertyType,
        value: T,
        lvl?: number,
        path?: string
    ) {
        this.name = name;
        this.type = type;
        this.value = value;
        this.lvl = lvl === undefined ? 1 : lvl;
        this.path = path === undefined ? name : path;
        this._subProp = [];
        this._weight = String(this.value);
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @param options - comparison options
     * @public
     */
    public equal(item: PropertyModel<any>, options: ICompareOptions): boolean {
        return this.type === item.type && this._weight === item._weight;
    }

    /**
     * Convert class to object
     * @public
     */
    public toObject(): IProperties<T> {
        return {
            name: this.name,
            lvl: this.lvl,
            path: this.path,
            type: this.type,
            value: this.value
        }
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: ICompareOptions): string {
        if (options.propLvl === 1) {
            if (this.lvl === 1) {
                return `${this.path}:${this.value}`;
            } else {
                return null;
            }
        } else {
            return `${this.path}:${this.value}`;
        }
    }

    /**
     * Get properties
     * @public
     */
    public getPropList(): PropertyModel<T>[] {
        return this._subProp;
    }
}

/**
 * Property Model (type = UUID)
 */
export class UUIDPropertyModel extends PropertyModel<any> {
    constructor(
        name: string,
        value: any,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.UUID, value, lvl, path);
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: ICompareOptions): string {
        if (options.idLvl === 0) {
            return null;
        }
        return super.hash(options);
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @public
     */
    public override equal(item: PropertyModel<any>, options: ICompareOptions): boolean {
        if (options.idLvl === 0) {
            return true;
        } else {
            return this.type === item.type && this.value === item.value;
        }
    }
}

/**
 * Property Model (type = any)
 */
export class AnyPropertyModel extends PropertyModel<any> {
    constructor(
        name: string,
        value: any,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Property, value, lvl, path);
    }
}

/**
 * Property Model (type = Array)
 */
export class ArrayPropertyModel extends PropertyModel<number> {
    constructor(
        name: string,
        value: number,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Array, value, lvl, path);
    }
}

/**
 * Property Model (type = Object)
 */
export class ObjectPropertyModel extends PropertyModel<boolean> {
    constructor(
        name: string,
        value: boolean,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Object, value, lvl, path);
    }
}

/**
 * Property Model (type = Token)
 */
export class TokenPropertyModel extends PropertyModel<string> {
    /**
     * Token Model
     * @public
     */
    public token?: TokenModel;

    constructor(
        name: string,
        value: string,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Token, value, lvl, path);
    }

    /**
     * Set Token Model
     * @param token
     * @public
     */
    public setToken(token: TokenModel): void {
        this.token = token;
        if (this.token) {
            this._subProp.length = 0;
            this._subProp.push(new AnyPropertyModel('tokenName', this.token.tokenName, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('tokenSymbol', this.token.tokenSymbol, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('tokenType', this.token.tokenType, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('decimals', this.token.decimals, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('initialSupply', this.token.initialSupply, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableAdmin', this.token.enableAdmin, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableFreeze', this.token.enableFreeze, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableKYC', this.token.enableKYC, this.lvl + 1));
            this._subProp.push(new AnyPropertyModel('enableWipe', this.token.enableWipe, this.lvl + 1));
            this._weight = this.token.hash();
        }
    }

    /**
     * Convert class to object
     * @public
     */
    public override toObject(): IProperties<string> {
        const item = super.toObject();
        if (this.token) {
            item.tokenId = this.token.tokenId;
            item.tokenName = this.token.tokenName;
            item.tokenSymbol = this.token.tokenSymbol;
            item.tokenType = this.token.tokenType;
            item.decimals = this.token.decimals;
            item.initialSupply = this.token.initialSupply;
            item.enableAdmin = this.token.enableAdmin;
            item.enableFreeze = this.token.enableFreeze;
            item.enableKYC = this.token.enableKYC;
            item.enableWipe = this.token.enableWipe;
        }
        return item;
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: ICompareOptions): string {
        if (options.idLvl === 0 && this.token) {
            return `${this.path}:${this.token.hash(options)}`;
        }
        return super.hash(options);
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @public
     */
    public override equal(item: PropertyModel<any>, options: ICompareOptions): boolean {
        if (options.idLvl === 0) {
            return super.equal(item, options);
        } else {
            return this.type === item.type && this.value === item.value;
        }
    }
}

/**
 * Property Model (type = Schema)
 */
export class SchemaPropertyModel extends PropertyModel<string> {
    /**
     * Schema Model
     * @public
     */
    public schema?: SchemaModel;

    constructor(
        name: string,
        value: string,
        lvl?: number,
        path?: string
    ) {
        super(name, PropertyType.Schema, value, lvl, path);
    }

    /**
     * Set Schema Model
     * @param schema
     * @public
     */
    public setSchema(schema: SchemaModel): void {
        this.schema = schema;
        if (this.schema) {
            this._weight = this.schema.hash();
        }
    }

    /**
     * Convert class to object
     * @public
     */
    public override toObject(): IProperties<string> {
        const item = super.toObject();
        if (this.schema) {
            item.schemaId = this.schema.id;
        }
        return item;
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: ICompareOptions): string {
        if (options.idLvl === 0 && this.schema) {
            return `${this.path}:${this.schema.hash(options)}`;
        }
        return super.hash(options);
    }

    /**
     * Comparison of models using weight
     * @param item - model
     * @public
     */
    public override equal(item: PropertyModel<any>, options: ICompareOptions): boolean {
        if (options.idLvl === 0) {
            return super.equal(item, options);
        } else {
            return this.type === item.type && this.value === item.value;
        }
    }
}