import { IFormulaItem, IFormula, IFormulaLink, FormulaItemType, Schema, SchemaField, IVCDocument, ISchema, IVPDocument, IVC, IVP, ICredentialSubject, IFormulaFile } from "@guardian/interfaces";

export interface Link {
    schema: string;
    path: string;
    item: FormulaItem;
}

export class FormulaFiles {
    public readonly name: string;
    public readonly type: string;
    public readonly url: string;

    constructor(config: IFormulaFile) {
        this.name = config.name || '';
        this.type = config.type || '';
        this.url = config.url || '';
    }
}

export class DocumentItem {
    private _type: Set<string>;
    private _map: Map<string, any>;

    constructor(document: IVCDocument | IVPDocument) {
        this._type = new Set<string>();
        this._map = new Map<string, any>();
        this.parsDoc(document);
    }

    private parsDoc(document: IVCDocument | IVPDocument) {
        try {
            if (!document || !document.document) {
                return;
            }
            const json = document.document;
            if ((json as IVC).credentialSubject) {
                this.parsVC(json as IVC);
            } else if ((json as IVP).verifiableCredential) {
                this.parsVP(json as IVP);
            } else {
                return;
            }
        } catch (error) {
            console.error(error);
        }
    }

    private addValue(key: string, value: any, prev?: string) {
        if (value) {
            let path: string;
            if (prev) {
                if (key) {
                    path = `${prev}.${key}`;
                } else {
                    path = `${prev}`;
                }
            } else {
                if (key) {
                    path = `${key}`;
                } else {
                    path = '';
                }
            }
            switch (typeof value) {
                case 'boolean':
                case 'number':
                case 'string': {
                    const old = this._map.get(path);
                    if (old) {
                        if (Array.isArray(old)) {
                            old.push(value);
                            this._map.set(path, old);
                        } else {
                            this._map.set(path, [old, value]);
                        }
                    } else {
                        this._map.set(path, value);
                    }
                    break;
                }
                case 'object': {
                    if (Array.isArray(value)) {
                        for (const e of value) {
                            this.addValue('', e, path);
                        }
                    } else {
                        this.parsFields(value, path);
                    }
                    break;
                }
                default: {
                    return;
                }
            }
        }
    }

    private parsFields(json: any, prev?: string) {
        if (json) {
            for (const [key, value] of Object.entries(json)) {
                this.addValue(key, value, prev);
            }
        }
    }

    private parsCredentialSubject(cs: any) {
        if (cs) {
            this._type.add(cs.type);
            this.parsFields(cs);
        }
    }

    private parsVC(vc: IVC) {
        if (vc && vc.credentialSubject) {
            if (Array.isArray(vc.credentialSubject)) {
                for (const cs of vc.credentialSubject) {
                    this.parsCredentialSubject(cs);
                }
            } else {
                this.parsCredentialSubject(vc.credentialSubject);
            }
        }
    }

    private parsVP(vp: IVP) {
        if (vp && vp.verifiableCredential) {
            if (Array.isArray(vp.verifiableCredential)) {
                for (const vc of vp.verifiableCredential) {
                    this.parsVC(vc);
                }
            } else {
                this.parsVC(vp.verifiableCredential);
            }
        }
    }

    public has(type?: string): boolean {
        if (type) {
            return this._type.has(type);
        }
        return false;
    }

    public get(path?: string): any {
        if (path) {
            return this._map.get(path);
        }
        return null;
    }
}

export class SchemaItem {
    public readonly type = 'schema';

    private _value: any;
    private _schema: Schema | null;
    private _field: SchemaField | null;
    private _type: string | undefined;
    private _path: string | undefined;

    constructor(schema: Schema | null, field: SchemaField | null) {
        this._schema = schema;
        this._field = field;
        this._type = schema?.type;
        this._path = field?.path;
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

    public setDocuments(documents: DocumentItem[]) {
        for (const doc of documents) {
            if (doc.has(this._type)) {
                this._value = doc.get(this._path);
                if (Array.isArray(this._value)) {
                    this._value = `[${this._value.join(',')}]`;
                }
                if (this._value !== undefined) {
                    return;
                }
            }
        }
    }

    public static empty() {
        return new SchemaItem(null, null);
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
    private _parent: FormulaTree | null;

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

        this._parent = null;
        this._relationshipItems = [];
        this._parentItems = [];
        this._linkItem = null;
        this._linkEntity = null;
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
            } else {
                this._linkItem = SchemaItem.empty();
            }
        }
    }

    public setDocuments(documents: DocumentItem[]) {
        if (this._schemaLink && this._linkItem) {
            (this._linkItem as SchemaItem).setDocuments(documents);
        }
    }

    public createNav(list: Set<FormulaItem>): any {
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
            if (!list.has(ref)) {
                const newList = new Set<FormulaItem>(list);
                newList.add(ref);
                const nav = ref.createNav(newList);
                item.children.push(nav);
            }
        }
        return item;
    }

    public getFiles(): FormulaFiles[] {
        return this._parent?.getFiles() || [];
    }
}

export class FormulaTree {
    public readonly uuid: string;
    public readonly name: string;
    public readonly description: string;

    private _links: Map<string, Map<string, FormulaItem[]>>;
    private _items: FormulaItem[];
    private _files: FormulaFiles[];

    constructor(formula: IFormula) {
        this.uuid = formula.uuid || '';
        this.name = formula.name || '';
        this.description = formula.description || '';

        this._links = new Map<string, Map<string, FormulaItem[]>>();
        this._items = [];
        this._files = [];
        this.parse(formula?.config?.formulas);
        this.parseFiles(formula?.config?.files);
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

    private parseFiles(files?: IFormulaFile[]) {
        if (!files) {
            return;
        }

        this._files = [];
        for (const config of files) {
            const file = new FormulaFiles(config);
            this._files.push(file);
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

    public setDocuments(documents: DocumentItem[]) {
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

    public getFiles(): FormulaFiles[] {
        return this._files;
    }
}

export class FormulasTree {
    public items: FormulaTree[];

    private _links: Map<string, Map<string, FormulaItem[]>>;

    constructor() {
        this._links = new Map<string, Map<string, FormulaItem[]>>();
        this.items = [];
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

    public setDocuments(documents: (IVCDocument | IVPDocument) | (IVCDocument | IVPDocument)[]) {
        const _documents: DocumentItem[] = [];
        if (Array.isArray(documents)) {
            for (const doc of documents) {
                const _doc = new DocumentItem(doc);
                _documents.push(_doc);
            }
        } else if (documents) {
            const _doc = new DocumentItem(documents);
            _documents.push(_doc);
        }

        for (const item of this.items) {
            item.setDocuments(_documents);
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

    public getFiles(items: FormulaItem[]): FormulaFiles[] {
        const result = new Set<any>();
        for (const item of items) {
            for (const files of item.getFiles()) {
                result.add(files);
            }
        }
        return Array.from(result);
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

    public static createNav(items: FormulaItem[]): any {
        const root: any = {
            view: 'root',
            type: 'root',
            children: []
        }
        for (const item of items) {
            const list = new Set<FormulaItem>();
            list.add(item);
            const nav = item.createNav(list);
            root.children.push(nav);
        }
        return root;
    }
}