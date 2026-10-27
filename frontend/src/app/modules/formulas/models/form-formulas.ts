import { FormulaItem, FormulasTree, IFormulaConditionContext } from './formula-tree';

const EMPTY: FormulaItem[] = [];

/**
 * Where the links of a form's fields are stored when the form shows a sub-schema:
 * links are saved against the document schema and the path from it.
 */
export interface IFormulaLinkScope {
    schema: string;
    prefix: string[];
}

/**
 * Formulas of a request form: filters formula items by their display condition
 * against the current form values. Results are memoized until the data changes.
 */
export class FormFormulas {
    public readonly fields: Record<string, { tree: FormulasTree; schema: string; path: string }>;

    private data: any = null;
    private cache = new Map<string, FormulaItem[]>();

    constructor(
        public readonly tree: FormulasTree,
        public readonly schemaIri: string,
        private equalsFn?: (a: any, b: any) => boolean,
        linkScope?: IFormulaLinkScope | null
    ) {
        this.fields = linkScope?.schema
            ? FormFormulas.scopedFields(tree, schemaIri, linkScope)
            : tree.getFields(schemaIri);
    }

    /**
     * Fields of the sub-schema keyed by its own IRI, resolved from the links stored
     * against the document schema under the drilled-into path.
     */
    private static scopedFields(
        tree: FormulasTree,
        schemaIri: string,
        linkScope: IFormulaLinkScope
    ): Record<string, { tree: FormulasTree; schema: string; path: string }> {
        const head = linkScope.prefix.length ? `${linkScope.prefix.join('.')}.` : '';
        const result: Record<string, { tree: FormulasTree; schema: string; path: string }> = {};
        for (const field of Object.values<any>(tree.getFields(linkScope.schema))) {
            if (field.path.startsWith(head)) {
                result[`${schemaIri}/${field.path.slice(head.length)}`] = field;
            }
        }
        return result;
    }

    /**
     * True when any formula item of the schema has a display condition,
     * i.e. the visible items can change together with the form data.
     */
    public get hasConditions(): boolean {
        return Object.values(this.fields).some((field) =>
            this.tree.get(field.schema, field.path).some((item) => item.hasConditionOn(field.schema, field.path))
        );
    }

    public setData(raw: any): void {
        this.data = raw;
        this.cache.clear();
    }

    public get(fullPath: string, entries?: Record<string, number> | null): FormulaItem[] {
        const field = this.fields[fullPath];
        if (!field) {
            return EMPTY;
        }
        const key = `${fullPath}|${JSON.stringify(entries ?? null)}`;
        let result = this.cache.get(key);
        if (!result) {
            const items = this.tree.get(field.schema, field.path, this.context(entries));
            result = items.length ? items : EMPTY;
            this.cache.set(key, result);
        }
        return result;
    }

    public context(entries?: Record<string, number> | null): IFormulaConditionContext {
        return { data: this.data, entries, anyEntry: true, equalsFn: this.equalsFn };
    }
}
