import { IFormulaItem, IFormula, IFormulaLink, FormulaItemType, Schema, SchemaField, IVCDocument, ISchema } from "@guardian/interfaces";

export interface Link {
    schema: string;
    path: string;
    item: FormulaItem;
}

export class SchemaItem {
    public readonly type = 'schema';

    private _value: any;
    private _schema: Schema;
    private _field: SchemaField;

    constructor(schema: Schema, field: SchemaField) {
        this._schema = schema;
        this._field = field;
    }

    public get name() {
        return this._schema?.name;
    }

    public get description() {
        return this._schema?.description;
    }

    public get field() {
        return this._field?.description;
    }

    public get value() {
        return this._value;
    }
}

export class FormulaItem {
    public readonly uuid: string;
    public readonly name: string;
    public readonly description: string;
    public readonly type: FormulaItemType;

    private _value: any;
    private _link: IFormulaLink | null;
    private _relationships: string[] | null;

    private _schemaLink: { schema: string, path: string } | null;
    private _formulaLink: { formula: string, variable: string } | null;
    private _parent: FormulaTree;

    private _relationshipItems: FormulaItem[];
    private _parentItems: FormulaItem[];
    private _linkEntity: FormulaTree | Schema | null;
    private _linkItem: FormulaItem | SchemaItem | null;

    constructor(config: IFormulaItem) {
        this.uuid = config.uuid || '';
        this.name = config.name || '';
        this.description = config.description || '';
        this.type = config.type || '';

        this._value = config.value || '';
        this._link = config.link || null;
        this._relationships = config.relationships || null;

        this._schemaLink = null;
        this._formulaLink = null;
        if (this._link) {
            if (this._link.type === 'schema') {
                this._schemaLink = {
                    schema: this._link.entityId,
                    path: this._link.item
                }
            }
            if (this._link.type === 'formula') {
                this._formulaLink = {
                    formula: this._link.entityId,
                    variable: this._link.item
                }
            }
        }

        this._relationshipItems = [];
        this._parentItems = [];
        this._linkItem = null;
    }

    public get value() {
        return this._value;
    }

    public get hasLink() {
        return !!this._link;
    }

    public get schemaLink() {
        return this._schemaLink;
    }

    public get formulaLink() {
        return this._formulaLink;
    }

    public get linkEntity() {
        return this._linkEntity;
    }

    public get linkItem() {
        return this._linkItem;
    }

    public get linkEntityName() {
        if (this._formulaLink && this._linkEntity) {
            return this._linkEntity.name;
        }
        if (this._schemaLink && this._linkEntity) {
            return this._linkEntity.name;
        }
        return null;
    }

    public get linkItemName() {
        if (this._formulaLink && this._linkItem) {
            return (this._linkItem as FormulaItem).name;
        }
        if (this._schemaLink && this._linkItem) {
            return (this._linkItem as SchemaItem).field;
        }
        return null;
    }

    public get relationshipItems() {
        return this._relationshipItems;
    }

    public setParent(parent: FormulaTree) {
        this._parent = parent;
    }

    public setRelationship(items: FormulaItem[]) {
        if (Array.isArray(this._relationships)) {
            this._relationshipItems = items.filter((e) => this._relationships?.includes(e.uuid));
        } else {
            this._relationshipItems = [];
        }

        this._parentItems = [];
        for (const item of items) {
            if (Array.isArray(item._relationships) && item._relationships.includes(this.uuid)) {
                this._parentItems.push(item);
            }
        }
    }

    public setFormulas(formulas: FormulaTree[]) {
        if (this._formulaLink) {
            this._linkEntity = formulas.find((e) => e.uuid === this._formulaLink?.formula) || null;
            if (this._linkEntity) {
                this._linkItem = this._linkEntity.get(this._formulaLink.variable);
            }
        }
    }

    public setSchemas(schemas: Schema[]) {
        if (this._schemaLink) {
            const schema = schemas.find((e) => e.iri === this._schemaLink?.schema) || null;
            this._linkEntity = schema;
            if (schema) {
                const field = schema.getField(this._schemaLink.path);
                if (field) {
                    this._linkItem = new SchemaItem(schema, field);
                }
            }
        }
    }

    public setDocuments(documents: any[]) {

    }

    public createNav(): any {
        const item: any = {
            view: 'component',
            type: this.type,
            name: this.name,
            data: this,
            children: []
        }
        if (this._formulaLink) {
            item.children.push({
                view: 'link',
                type: this._linkItem?.type,
                entity: this._linkEntity?.name,
                name: this._linkItem?.name,
                data: this._linkItem,
                children: []
            });
        }
        if (this._schemaLink) {
            item.children.push({
                view: 'link',
                type: 'field',
                entity: this._linkEntity?.name,
                name: (this._linkItem as SchemaItem)?.field,
                data: this._linkItem,
                children: []
            });
        }
        for (const ref of this._relationshipItems) {
            item.children.push(ref.createNav());
        }
        return item;
    }
}

export class FormulaTree {
    public readonly uuid: string;
    public readonly name: string;
    public readonly description: string;

    private _links: Map<string, Map<string, FormulaItem[]>>;
    private _items: FormulaItem[];

    constructor(formula: IFormula) {
        this.uuid = formula.uuid || '';
        this.name = formula.name || '';
        this.description = formula.description || '';

        this._links = new Map<string, Map<string, FormulaItem[]>>();
        this.parse(formula?.config?.formulas)
    }

    private parse(items?: IFormulaItem[]) {
        if (!items) {
            return;
        }

        this._items = [];
        for (const config of items) {
            const item = new FormulaItem(config);
            item.setParent(this);
            const link = item.schemaLink;
            if (link) {
                const map = this._links.get(link.schema) || new Map<string, FormulaItem[]>();
                const array = map.get(link.path) || [];
                array.push(item);
                map.set(link.path, array);
                this._links.set(link.schema, map);
            }
            this._items.push(item);
        }

        for (const item of this._items) {
            item.setRelationship(this._items);
        }
    }

    public setFormulas(formulas: FormulaTree[]) {
        for (const item of this._items) {
            item.setFormulas(formulas);
        }
    }

    public setSchemas(schemas: Schema[]) {
        for (const item of this._items) {
            item.setSchemas(schemas);
        }
    }

    public setDocuments(documents: any[]) {
        for (const item of this._items) {
            item.setDocuments(documents);
        }
    }

    public hasLink(schema: string, path: string): boolean {
        return this._links.get(schema)?.has(path) || false;
    }

    public getLink(schema: string, path: string): FormulaItem[] {
        return this._links.get(schema)?.get(path) || [];
    }

    public get(variable: string): FormulaItem | null {
        for (const item of this._items) {
            if (item.name === variable) {
                return item;
            }
        }
        return null;
    }

    public merge(links: Map<string, Map<string, FormulaItem[]>>) {
        for (const [schema, map] of this._links.entries()) {
            const fullMap = links.get(schema) || new Map<string, FormulaItem[]>();
            for (const [path, array] of map.entries()) {
                const fullArray = fullMap.get(path) || [];
                for (const item of array) {
                    fullArray.push(item);
                }
                fullMap.set(path, fullArray);
            }
            links.set(schema, fullMap);
        }
    }
}

export class FormulasTree {
    public items: FormulaTree[];

    private _links: Map<string, Map<string, FormulaItem[]>>;

    constructor() {
        this._links = new Map<string, Map<string, FormulaItem[]>>();
    }

    public setFormulas(formulas: IFormula[]) {
        if (Array.isArray(formulas)) {
            this.items = formulas.map((f) => new FormulaTree(f));
        } else {
            this.items = [];
        }
        for (const item of this.items) {
            item.setFormulas(this.items);
        }
    }

    public setSchemas(schemas: Schema[]) {
        for (const item of this.items) {
            item.setSchemas(schemas);
        }
    }

    public setDocuments(documents: any[]) {
        for (const item of this.items) {
            item.setDocuments(documents);
        }
    }

    public update() {
        this._links.clear();
        for (const item of this.items) {
            item.merge(this._links);
        }
    }

    public has(schema: string, path: string): boolean {
        return this._links.get(schema)?.has(path) || false;
    }

    public get(schema: string, path: string): FormulaItem[] {
        return this._links.get(schema)?.get(path) || [];
    }

    public getFields(schema?: string) {
        const result: any = {};
        if (schema) {
            const map = this._links.get(schema);
            if (map) {
                for (const path of map.keys()) {
                    result[`${schema}/${path}`] = {
                        tree: this,
                        schema,
                        path
                    };
                }
            }
        }
        return result;
    }

    public static from(response?: {
        formulas: IFormula[],
        schemas: ISchema[],
        document: IVCDocument,
        relationships: IVCDocument[]
    }) {
        if (!response) {
            return null;
        }

        const documents = [];
        if (response.document) {
            documents.push(response.document);
        }
        if (response.relationships) {
            for (const document of response.relationships) {
                documents.push(document);
            }
        }

        const schemas = [];
        if (response.schemas) {
            for (const s of response.schemas) {
                const schema = Schema.from(s);
                if (schema) {
                    schemas.push(schema);
                }
            }
        }

        const tree = new FormulasTree();
        tree.setFormulas(response.formulas);
        tree.setSchemas(schemas);
        tree.setDocuments(documents);
        tree.update();

        return tree;
    }

    public static createNav(items: any[]): any {
        const root = {
            view: 'root',
            type: 'root',
            children: items.map((e) => e.createNav())
        }
        return root;
    }
}