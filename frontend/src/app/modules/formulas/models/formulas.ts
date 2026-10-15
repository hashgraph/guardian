import { moveItemInArray } from '@angular/cdk/drag-drop';
import { IFormulaItem, FormulaItemType, GenerateUUIDv4, IFormulaConfig, IFormulaFile } from '@guardian/interfaces';

/**
 * Text part (marked or not) of a highlighted line.
 */
export interface IFormulaSegment {
    text: string;
    mark: boolean;
}

/**
 * Link label split into the entity and the field name.
 */
export interface IFormulaLinkLabel {
    entity: string;
    field: string;
}

/**
 * Row data of the item list. Computed once in `update()`.
 */
export interface IFormulaRowMeta {
    /** the entity name of the link ("Entity:"), null for constants and items without a link */
    entity: IFormulaSegment[] | null;
    /** the summary line: "= value · description" for constants, the field name for links */
    sub: IFormulaSegment[];
    /** plain text of the summary line (for the tooltip) */
    subText: string;
    /** true when the item has no summary at all (no link) */
    noLink: boolean;
    /** the match that is not visible on the row, only while searching */
    hit: { label: string; text: string; segments: IFormulaSegment[] } | null;
}

interface ISearchPart {
    label: string;
    /** the text shown in the hit line */
    raw: string;
    /** lower-cased text the terms are compared with */
    lower: string;
}

/**
 * Turns a LaTeX string into plain text: `\_` -> `_`, `\word` -> ` word `,
 * `{ } ^ \` are dropped and the spaces are collapsed.
 */
export function latexToPlain(latex: string | null | undefined): string {
    return String(latex ?? '')
        .replace(/\\_/g, '_')
        .replace(/\\([a-zA-Z]+)/g, ' $1 ')
        .replace(/[{}^\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Splits the text into marked and unmarked segments. Terms are compared ignoring case.
 */
export function highlightSegments(text: string, terms: string[]): IFormulaSegment[] {
    text = String(text ?? '');
    if (!text) {
        return [];
    }
    const lower = text.toLowerCase();
    if (!terms.length || lower.length !== text.length) {
        return [{ text, mark: false }];
    }
    const ranges: [number, number][] = [];
    for (const term of terms) {
        if (!term) {
            continue;
        }
        let index = lower.indexOf(term);
        while (index !== -1) {
            ranges.push([index, index + term.length]);
            index = lower.indexOf(term, index + term.length);
        }
    }
    if (!ranges.length) {
        return [{ text, mark: false }];
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const range of ranges) {
        const last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) {
            last[1] = Math.max(last[1], range[1]);
        } else {
            merged.push([range[0], range[1]]);
        }
    }
    const result: IFormulaSegment[] = [];
    let position = 0;
    for (const [start, end] of merged) {
        if (start > position) {
            result.push({ text: text.slice(position, start), mark: false });
        }
        result.push({ text: text.slice(start, end), mark: true });
        position = end;
    }
    if (position < text.length) {
        result.push({ text: text.slice(position), mark: false });
    }
    return result;
}

export class Formulas {
    private items: IFormulaItem[];
    private filterMap: Map<FormulaItemType, boolean>;
    private query: string;
    private terms: string[];
    public files: IFormulaFile[];
    /** items that pass the type filters and the search */
    public data: IFormulaItem[];
    /** number of items of each type that match the search (type filters are not applied) */
    public counts: { [type: string]: number };
    /** row data by item uuid */
    public meta: Map<string, IFormulaRowMeta>;
    /** the provider of link labels, set by the component */
    public labelFn: ((item: IFormulaItem) => IFormulaLinkLabel | null) | null;

    constructor() {
        this.items = [];
        this.files = [];
        this.data = [];
        this.query = '';
        this.terms = [];
        this.counts = this.emptyCounts();
        this.meta = new Map<string, IFormulaRowMeta>();
        this.labelFn = null;
        this.filterMap = new Map<FormulaItemType, boolean>();
        this.filterMap.set(FormulaItemType.Constant, true);
        this.filterMap.set(FormulaItemType.Variable, true);
        this.filterMap.set(FormulaItemType.Formula, true);
        this.filterMap.set(FormulaItemType.Text, true);
    }

    public get all() {
        return this.items;
    }

    private create(type: FormulaItemType): IFormulaItem {
        const item: IFormulaItem = {
            uuid: GenerateUUIDv4(),
            name: '',
            description: '',
            type: type,
        };
        if (type === FormulaItemType.Constant) {
            item.value = '';
            return item;
        } else if (type === FormulaItemType.Variable) {
            item.value = '';
            item.link = null;
            return item;
        } else if (type === FormulaItemType.Formula) {
            item.value = '';
            item.link = null;
            item.relationships = [];
            return item;
        } else if (type === FormulaItemType.Text) {
            item.value = '';
            item.link = null;
            item.relationships = [];
            return item;
        } else {
            return item;
        }
    }

    public get total(): number {
        return this.items.length;
    }

    public get isFiltering(): boolean {
        return !!this.query || Array.from(this.filterMap.values()).some((e) => !e);
    }

    public add(type: FormulaItemType): IFormulaItem {
        const item = this.create(type);
        this.items.push(item);
        this.update();
        return item;
    }

    /**
     * Inserts a deep copy (with a new uuid) right after the original.
     */
    public duplicate(item: IFormulaItem): IFormulaItem | null {
        const index = this.items.findIndex((e) => e.uuid === item?.uuid);
        if (index === -1) {
            return null;
        }
        const copy: IFormulaItem = JSON.parse(JSON.stringify(item));
        copy.uuid = GenerateUUIDv4();
        this.items.splice(index + 1, 0, copy);
        this.update();
        return copy;
    }

    public indexOf(item: IFormulaItem | null): number {
        return item ? this.items.findIndex((e) => e.uuid === item.uuid) : -1;
    }

    public delete(item: IFormulaItem): void {
        this.items = this.items.filter((e) => e.uuid !== item?.uuid);
        this.update();
    }

    public addFile(file: IFormulaFile): void {
        if (file) {
            this.files.push(file);
        }
    }

    public deleteFile(file: IFormulaFile): void {
        this.files = this.files.filter((e) => e !== file);
    }

    public setFilters(filter: any): void {
        this.filterMap.set(FormulaItemType.Constant, filter.constant);
        this.filterMap.set(FormulaItemType.Variable, filter.variable);
        this.filterMap.set(FormulaItemType.Formula, filter.formula);
        this.filterMap.set(FormulaItemType.Text, filter.text);
        this.update();
    }

    public setQuery(query: string): void {
        this.query = String(query ?? '').trim();
        this.terms = this.query.toLowerCase().split(/\s+/).filter((e) => !!e);
        this.update();
    }

    /**
     * Recalculates the visible items, the counters and the row data.
     */
    public update(): void {
        const counts = this.emptyCounts();
        const data: IFormulaItem[] = [];
        const meta = new Map<string, IFormulaRowMeta>();
        for (const item of this.items) {
            const parts = this.getParts(item);
            if (!this.isMatch(parts)) {
                continue;
            }
            counts[item.type]++;
            if (this.filterMap.get(item.type)) {
                data.push(item);
                meta.set(item.uuid, this.getMeta(item, parts));
            }
        }
        this.counts = counts;
        this.data = data;
        this.meta = meta;
    }

    private emptyCounts(): { [type: string]: number } {
        return {
            [FormulaItemType.Constant]: 0,
            [FormulaItemType.Variable]: 0,
            [FormulaItemType.Formula]: 0,
            [FormulaItemType.Text]: 0
        };
    }

    private getParts(item: IFormulaItem): ISearchPart[] {
        const parts: ISearchPart[] = [];
        const add = (label: string, raw: any) => {
            raw = String(raw ?? '');
            if (raw) {
                parts.push({ label, raw, lower: raw.toLowerCase() });
            }
        };
        add('Name', latexToPlain(item.name));
        if (item.type === FormulaItemType.Constant) {
            add('Value', item.value);
        } else if (item.type === FormulaItemType.Text) {
            add('Text', item.value);
        } else if (item.type === FormulaItemType.Formula) {
            add('Formula', latexToPlain(item.value));
        }
        const link = this.getLinkLabel(item);
        if (link) {
            add('Link', `${link.entity}: ${link.field}`);
        }
        for (const label of this.getConditionLabels(item)) {
            add('Shown if', label);
        }
        const source = [item.source?.methodology, item.source?.section, item.source?.equation, item.source?.page]
            .map((e) => String(e ?? '').trim())
            .filter((e) => e)
            .join(' · ');
        add('Source', source);
        add('Description', item.description);
        return parts;
    }

    private getLinkLabel(item: IFormulaItem): IFormulaLinkLabel | null {
        if (!item.link || !this.labelFn) {
            return null;
        }
        return this.labelFn(item);
    }

    private getConditionLabels(item: IFormulaItem): string[] {
        const condition: any = item.link?.condition;
        if (!condition) {
            return [];
        }
        let rows: any[];
        if (Array.isArray(condition.AND)) {
            rows = condition.AND;
        } else if (Array.isArray(condition.OR)) {
            rows = condition.OR;
        } else {
            rows = [condition];
        }
        const result: string[] = [];
        for (const row of rows) {
            const field = row?.field;
            const name = field?.description || field?.title || field?.name || '';
            const operator = row?.comparator === 'contains' ? 'contains' : '=';
            result.push(`${name} ${operator} ${row?.fieldValue ?? ''}`.trim());
        }
        return result;
    }

    private isMatch(parts: ISearchPart[]): boolean {
        return this.terms.every((term) => parts.some((part) => part.lower.includes(term)));
    }

    private getMeta(item: IFormulaItem, parts: ISearchPart[]): IFormulaRowMeta {
        const terms = this.terms;
        let entity: IFormulaSegment[] | null = null;
        let sub: IFormulaSegment[] = [];
        let subText = '';
        let noLink = false;
        let visible: string[];
        if (item.type === FormulaItemType.Constant) {
            subText = `= ${item.value ?? ''}${item.description ? ' · ' + item.description : ''}`;
            sub = highlightSegments(subText, terms);
            visible = ['Name', 'Value', 'Description'];
        } else {
            const link = this.getLinkLabel(item);
            if (link) {
                entity = highlightSegments(`${link.entity}:`, terms);
                sub = highlightSegments(link.field, terms);
                subText = `${link.entity}: ${link.field}`;
            } else {
                noLink = true;
            }
            visible = ['Name', 'Link'];
        }
        let hit: IFormulaRowMeta['hit'] = null;
        if (terms.length) {
            const part = parts.find((e) => !visible.includes(e.label) && terms.some((t) => e.lower.includes(t)));
            if (part) {
                const first = terms.map((t) => part.lower.indexOf(t)).filter((i) => i !== -1);
                const start = Math.max(0, Math.min(...first) - 20);
                const text = (start ? '…' : '') + part.raw.slice(start);
                hit = { label: part.label, text, segments: highlightSegments(text, terms) };
            }
        }
        return { entity, sub, subText, noLink, hit };
    }

    public fromData(config: IFormulaConfig) {
        const items: IFormulaItem[] = config?.formulas || [];
        const files: IFormulaFile[] = config?.files || [];
        this.items = items.map((e) => this._fromItemJson(e));
        this.files = files.map((e) => this._fromFileJson(e));
        this.update();
    }

    public getJson(): IFormulaConfig {
        return {
            formulas: this.items.map((e) => this._toItemJson(e)),
            files: this.files.map((e) => this._toFileJson(e)),
        };
    }

    private _fromItemJson(item: IFormulaItem): IFormulaItem {
        return item;
    }

    private _toItemJson(item: IFormulaItem): IFormulaItem {
        return item;
    }

    private _fromFileJson(item: IFormulaFile): IFormulaFile {
        return item;
    }

    private _toFileJson(item: IFormulaFile): IFormulaFile {
        return item;
    }

    public getItem(uuid: string): IFormulaItem | null {
        for (const item of this.items) {
            if (item.uuid === uuid) {
                return item;
            }
        }
        return null;
    }

    public reorder(previousIndex: number, currentIndex: number) {
        if (previousIndex !== currentIndex) {
            const prevItem = this.data[previousIndex];
            const currentItem = this.data[currentIndex];
            const originalPreviousIndex = this.items.findIndex((e) => e === prevItem);
            const originalCurrentIndex = this.items.findIndex((e) => e === currentItem);
            moveItemInArray(this.items, originalPreviousIndex, originalCurrentIndex);
            this.update();
        }
    }
}
