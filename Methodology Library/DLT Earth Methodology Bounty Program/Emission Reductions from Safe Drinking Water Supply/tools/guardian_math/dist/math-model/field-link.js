import { GenerateUUIDv4 } from '../gi/index.js';
import { convertValue } from './utils.js';
import { MathItemType } from './math-item.type.js';
export class FieldLink {
    static MAX_TABLE_ROWS = 1000;
    static MAX_TABLES = 100;
    static MAX_COLUMN_ROWS = 10000;
    type = MathItemType.LINK;
    id;
    variableNameText = '';
    variableName = '';
    validName = false;
    validField = false;
    schema = '';
    field = '';
    description = '';
    value;
    rows = null;
    tables = null;
    columns = null;
    tableList = false;
    error = '';
    empty = true;
    validated = false;
    subscriber;
    get name() {
        return this.variableName;
    }
    get valid() {
        return this.validName && this.validField;
    }
    get path() {
        return this.field || '';
    }
    get invalid() {
        return !this.valid;
    }
    get isTable() {
        return Array.isArray(this.rows) || Array.isArray(this.tables) || !!this.columns;
    }
    get isTableList() {
        return Array.isArray(this.tables) || (!!this.columns && this.tableList);
    }
    constructor(name, path) {
        this.id = GenerateUUIDv4();
        this.empty = true;
        this.variableNameText = name || '';
        this.field = path || '';
    }
    static toVariableName(text) {
        const value = typeof text === 'string' ? text.trim() : '';
        if ((/^[A-Za-z]\w*(?:,\w+)*$/).test(value)) {
            return value.replace(/,/g, '_');
        }
        return null;
    }
    _update() {
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
            }
            else {
                const name = FieldLink.toVariableName(this.variableNameText);
                if (name) {
                    this.variableName = name;
                    this.validName = true;
                }
                else {
                    this.validName = false;
                }
            }
            if (this.field) {
                this.validField = true;
            }
            else {
                this.validField = false;
            }
            if (!this.validName) {
                this.error = 'Invalid name';
            }
            else if (!this.validField) {
                this.error = 'Invalid field';
            }
            else {
                this.error = '';
            }
        }
        catch (error) {
            this.validName = false;
            this.error = 'Invalid name';
        }
    }
    update() {
        this.validated = false;
        this.empty = false;
        this._update();
        if (this.subscriber) {
            this.subscriber();
        }
    }
    subscribe(f) {
        this.subscriber = f;
    }
    destroy() {
        this.subscriber = null;
    }
    validate() {
        this.validated = true;
        this._update();
    }
    getLatex() {
        if (this.invalid) {
            return null;
        }
        return convertValue(this.value);
    }
    getGrids() {
        if (this.tables) {
            return this.tables;
        }
        return this.rows ? [this.rows] : [];
    }
    getCellNames() {
        const names = [];
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
    getTableList(scope) {
        if (this.columns) {
            return this.getColumnTables(scope);
        }
        return (this.tables || []).map((rows) => this.getTableRows(scope, rows));
    }
    getTableRows(scope, rows = this.rows) {
        if (this.columns) {
            return this.getColumnRows(scope);
        }
        return (rows || []).map((row) => {
            const values = {};
            for (const key of Object.keys(row)) {
                const name = FieldLink.toVariableName(row[key]);
                values[key] = name ? scope[name] : '';
            }
            return values;
        });
    }
    getColumnRows(scope) {
        const values = this.getColumnValues(scope);
        const count = FieldLink.getColumnLength(values);
        if (count > FieldLink.MAX_COLUMN_ROWS) {
            throw new Error(`Too many rows: ${count}. The limit is ${FieldLink.MAX_COLUMN_ROWS}`);
        }
        return FieldLink.toColumnRows(Object.keys(this.columns || {}), values);
    }
    getUnknownColumns(keys) {
        const known = new Set(keys);
        const unknown = new Set();
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
    getColumnTables(scope) {
        const keys = Object.keys(this.columns || {});
        const values = this.getColumnValues(scope);
        const count = FieldLink.getColumnLength(values);
        if (count > FieldLink.MAX_TABLES) {
            throw new Error(`Too many tables: ${count}. The limit is ${FieldLink.MAX_TABLES}`);
        }
        const tables = [];
        let total = 0;
        for (let index = 0; index < count; index++) {
            const tableValues = {};
            for (const key of Object.keys(values)) {
                const value = values[key];
                if (!Array.isArray(value)) {
                    tableValues[key] = value;
                }
                else if (index < value.length) {
                    tableValues[key] = value[index];
                }
            }
            total += FieldLink.getColumnLength(tableValues);
            if (total > FieldLink.MAX_COLUMN_ROWS) {
                throw new Error(`Too many rows: ${total}. The limit is ${FieldLink.MAX_COLUMN_ROWS}`);
            }
            tables.push(FieldLink.toColumnRows(keys, tableValues));
        }
        return tables;
    }
    getColumnValues(scope) {
        const values = {};
        const columns = this.columns || {};
        for (const key of Object.keys(columns)) {
            const name = FieldLink.toVariableName(columns[key]);
            if (name) {
                values[key] = scope[name];
            }
        }
        return values;
    }
    static getColumnLength(values) {
        const bound = Object.keys(values);
        const lists = bound.filter((key) => Array.isArray(values[key]));
        if (lists.length) {
            return Math.max(...lists.map((key) => values[key].length));
        }
        return bound.length ? 1 : 0;
    }
    static toColumnRows(keys, values) {
        const count = FieldLink.getColumnLength(values);
        const rows = [];
        for (let index = 0; index < count; index++) {
            const row = {};
            for (const key of keys) {
                const value = values[key];
                if (!(key in values)) {
                    row[key] = '';
                }
                else if (Array.isArray(value)) {
                    row[key] = index < value.length ? value[index] : '';
                }
                else {
                    row[key] = value;
                }
            }
            rows.push(row);
        }
        return rows;
    }
    getNameGrids() {
        return this.columns ? [[this.columns]] : this.getGrids();
    }
    toJson() {
        const json = {
            type: this.type,
            // Preserve the original user notation (e.g. "x,i") in JSON;
            // CE uses the underscore-normalised variableName internally.
            name: this.variableNameText || '',
            description: this.description || '',
            field: this.field || '',
            schema: this.schema || ''
        };
        if (this.columns) {
            json.columns = { ...this.columns };
            if (this.tableList) {
                json.tableList = true;
            }
        }
        else if (this.tables) {
            json.tables = this.tables.map((rows) => rows.map((row) => ({ ...row })));
        }
        else if (this.rows) {
            json.rows = this.rows.map((row) => ({ ...row }));
        }
        return json;
    }
    static from(json) {
        if (!json || typeof json !== 'object') {
            return null;
        }
        try {
            const link = new FieldLink(json.name, json.field);
            link.schema = json.schema;
            link.description = json.description || '';
            if (json.columns && typeof json.columns === 'object' && !Array.isArray(json.columns)) {
                link.columns = { ...json.columns };
                link.tableList = json.tableList === true;
            }
            else if (Array.isArray(json.tables)) {
                link.tables = json.tables.map((rows) => Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []);
            }
            else if (Array.isArray(json.rows)) {
                link.rows = json.rows.map((row) => ({ ...row }));
            }
            link.empty = false;
            return link;
        }
        catch (error) {
            return null;
        }
    }
}
