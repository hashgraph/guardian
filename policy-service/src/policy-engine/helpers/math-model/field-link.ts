import { GenerateUUIDv4 } from '@guardian/interfaces';
import { convertValue } from './utils.js';
import { MathItemType } from './math-item.type.js';
import { IFieldLink } from './math.interface.js';

export class FieldLink {
    public static readonly MAX_TABLES = 100;

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
        return Array.isArray(this.rows) || Array.isArray(this.tables);
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
            if (this.isTable) {
                this.validName = grids.every((rows) => rows.every((row) => Object.keys(row).every((key) => {
                    const cell = row[key];
                    return !(typeof cell === 'string' && cell.trim()) || !!FieldLink.toVariableName(cell);
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
        for (const rows of this.getGrids()) {
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
        return (rows || []).map((row) => {
            const values: Record<string, any> = {};
            for (const key of Object.keys(row)) {
                const name = FieldLink.toVariableName(row[key]);
                values[key] = name ? scope[name] : '';
            }
            return values;
        });
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
        if (this.tables) {
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
            if (Array.isArray(json.tables)) {
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
