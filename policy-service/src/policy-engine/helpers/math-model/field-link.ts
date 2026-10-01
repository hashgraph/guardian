import { GenerateUUIDv4 } from '@guardian/interfaces';
import { convertValue } from './utils.js';
import { MathItemType } from './math-item.type.js';
import { IFieldLink } from './math.interface.js';

export class FieldLink {
    public static readonly MAX_TABLE_ROWS = 1000;
    public static readonly MAX_TABLES = 100;
    public static readonly MAX_COLUMN_ROWS = 10000;

    public readonly type = MathItemType.LINK;

    public readonly id: string;
    public variableNameText: string = '';
    public variableName: string = '';
    public validName: boolean = false;
    public validField: boolean = false;

    public schema: string | null = '';
    public field: string | null = '';
    public description: string | null = '';

    public value: any;
    public rows: Record<string, string>[] | null = null;
    public tables: Record<string, string>[][] | null = null;
    public columns: Record<string, string> | null = null;

    public error: string = '';
    public empty: boolean = true;
    public validated: boolean = false;

    private subscriber: Function | null;

    public get name(): string {
        return this.variableName;
    }

    public get valid(): boolean {
        return this.validName && this.validField;
    }

    public get path(): string {
        return this.field || '';
    }

    public get invalid(): boolean {
        return !this.valid;
    }

    public get isTable(): boolean {
        return Array.isArray(this.rows) || Array.isArray(this.tables) || !!this.columns;
    }

    public get isTableList(): boolean {
        return Array.isArray(this.tables);
    }

    constructor(name?: string, path?: string) {
        this.id = GenerateUUIDv4();
        this.empty = true;
        this.variableNameText = name || '';
        this.field = path || '';
    }

    private static toVariableName(text: unknown): string | null {
        const value = typeof text === 'string' ? text.trim() : '';
        if ((/^[A-Za-z]\w*(?:,\w+)*$/).test(value)) {
            return value.replace(/,/g, '_');
        }
        return null;
    }

    private _update() {
        try {
            const grids = this.getGrids();
            if (grids.length > FieldLink.MAX_TABLES) {
                this.validName = false;
                this.error = 'Too many tables';
                return;
            }
            if (grids.reduce((count, rows) => count + rows.length, 0) > FieldLink.MAX_TABLE_ROWS) {
                this.validName = false;
                this.error = 'Too many rows';
                return;
            }
            if (this.isTable) {
                this.validName = this.getNameGrids().every((rows) => rows.every((row) => Object.keys(row).every((key) => {
                    const cell = row[key];
                    return typeof cell === 'string' && (!cell.trim() || !!FieldLink.toVariableName(cell));
                })));
            } else {
                const name = FieldLink.toVariableName(this.variableNameText);
                if (name) {
                    this.variableName = name;
                    this.validName = true;
                } else {
                    this.validName = false;
                }
            }

            if (this.field) {
                this.validField = true;
            } else {
                this.validField = false;
            }

            if (!this.validName) {
                this.error = 'Invalid name';
            } else if (!this.validField) {
                this.error = 'Invalid field';
            } else {
                this.error = '';
            }
        } catch (error) {
            this.validName = false;
            this.error = 'Invalid name';
        }
    }

    public update() {
        this.validated = false;
        this.empty = false;
        this._update();
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public subscribe(f: Function) {
        this.subscriber = f;
    }

    public destroy() {
        this.subscriber = null;
    }

    public validate() {
        this.validated = true;
        this._update();
    }

    public getLatex(): string | unknown[] | null {
        if (this.invalid) {
            return null;
        }
        return convertValue(this.value);
    }

    public getGrids(): Record<string, string>[][] {
        if (this.tables) {
            return this.tables;
        }
        return this.rows ? [this.rows] : [];
    }

    public getCellNames(): string[] {
        const names: string[] = [];
        for (const rows of this.getNameGrids()) {
            for (const row of rows) {
                for (const key of Object.keys(row)) {
                    const name = FieldLink.toVariableName(row[key]);
                    if (name) {
                        names.push(name);
                    }
                }
            }
        }
        return names;
    }

    public getTableList(scope: { [name: string]: any }): Record<string, any>[][] {
        return (this.tables || []).map((rows) => this.getTableRows(scope, rows));
    }

    public getTableRows(
        scope: { [name: string]: any },
        rows: Record<string, string>[] | null = this.rows
    ): Record<string, any>[] {
        if (this.columns) {
            return this.getColumnRows(scope);
        }
        return (rows || []).map((row) => {
            const values: Record<string, any> = {};
            for (const key of Object.keys(row)) {
                const name = FieldLink.toVariableName(row[key]);
                values[key] = name ? scope[name] : '';
            }
            return values;
        });
    }

    public getColumnRows(scope: { [name: string]: any }): Record<string, any>[] {
        const values = this.getColumnValues(scope);
        const count = FieldLink.getColumnLength(values);
        if (count > FieldLink.MAX_COLUMN_ROWS) {
            throw new Error(`Too many rows: ${count}. The limit is ${FieldLink.MAX_COLUMN_ROWS}`);
        }
        return FieldLink.toColumnRows(Object.keys(this.columns || {}), values);
    }

    public getUnknownColumns(keys: string[]): string[] {
        const known = new Set(keys);
        const unknown = new Set<string>();
        for (const rows of this.getNameGrids()) {
            for (const row of rows) {
                for (const key of Object.keys(row)) {
                    if (!known.has(key)) {
                        unknown.add(key);
                    }
                }
            }
        }
        return Array.from(unknown);
    }

    private getColumnValues(scope: { [name: string]: any }): Record<string, any> {
        const values: Record<string, any> = {};
        const columns = this.columns || {};
        for (const key of Object.keys(columns)) {
            const name = FieldLink.toVariableName(columns[key]);
            if (name) {
                values[key] = scope[name];
            }
        }
        return values;
    }

    private static getColumnLength(values: Record<string, any>): number {
        const bound = Object.keys(values);
        const lists = bound.filter((key) => Array.isArray(values[key]));
        if (lists.length) {
            return Math.max(...lists.map((key) => values[key].length));
        }
        return bound.length ? 1 : 0;
    }

    private static toColumnRows(keys: string[], values: Record<string, any>): Record<string, any>[] {
        const count = FieldLink.getColumnLength(values);
        const rows: Record<string, any>[] = [];
        for (let index = 0; index < count; index++) {
            const row: Record<string, any> = {};
            for (const key of keys) {
                const value = values[key];
                if (!(key in values)) {
                    row[key] = '';
                } else if (Array.isArray(value)) {
                    row[key] = index < value.length ? value[index] : '';
                } else {
                    row[key] = value;
                }
            }
            rows.push(row);
        }
        return rows;
    }

    private getNameGrids(): Record<string, string>[][] {
        return this.columns ? [[this.columns]] : this.getGrids();
    }

    public toJson(): IFieldLink {
        const json: IFieldLink = {
            type: this.type,
            // Preserve the original user notation (e.g. "x,i") in JSON;
            // CE uses the underscore-normalised variableName internally.
            name: this.variableNameText || '',
            description: this.description || '',
            field: this.field || '',
            schema: this.schema || ''
        }
        if (this.columns) {
            json.columns = { ...this.columns };
        } else if (this.tables) {
            json.tables = this.tables.map((rows) => rows.map((row) => ({ ...row })));
        } else if (this.rows) {
            json.rows = this.rows.map((row) => ({ ...row }));
        }
        return json;
    }

    public static from(json: IFieldLink): FieldLink | null {
        if (!json || typeof json !== 'object') {
            return null;
        }
        try {
            const link = new FieldLink(json.name, json.field);
            link.schema = json.schema;
            link.description = json.description || '';
            if (json.columns && typeof json.columns === 'object' && !Array.isArray(json.columns)) {
                link.columns = { ...json.columns };
            } else if (Array.isArray(json.tables)) {
                link.tables = json.tables.map((rows) => Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []);
            } else if (Array.isArray(json.rows)) {
                link.rows = json.rows.map((row) => ({ ...row }));
            }
            link.empty = false;
            return link;
        } catch (error) {
            return null;
        }
    }
}
