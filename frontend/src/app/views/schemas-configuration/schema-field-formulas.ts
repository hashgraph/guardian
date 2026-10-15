import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { catchError, expand, map, reduce, shareReplay, switchMap } from 'rxjs/operators';
import { DialogService } from 'primeng/dynamicdialog';
import { EntityStatus, IFormula, IFormulaItem, IFormulaLink, Schema, SchemaField, UserPermissions } from '@guardian/interfaces';
import { FormulasService } from 'src/app/services/formulas.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import {
    applyFieldBindingOps,
    applyFieldBindingOpsToFormulas,
    BINDABLE_ITEM_TYPES,
    buildFieldPath,
    createStubItem,
    FieldBindingOp,
    findFieldBindings,
    IFieldTarget,
    isEditableFormula,
    isLinkedTo,
    NEW_FORMULA_DOCUMENT
} from 'src/app/modules/formulas/models/field-bindings';
import { FormulasTree } from 'src/app/modules/formulas/models/formula-tree';
import { formulaTypeIcon, formulaTypeName } from 'src/app/modules/formulas/models/formula-meta';

const PAGE_SIZE = 100;

export interface IFieldFormulaRow {
    key: string;
    formulaId: string;
    formulaName: string;
    itemUuid: string;
    itemName: string;
    type: string;
    typeName: string;
    icon: string;
    published: boolean;
    pending: boolean;
}

export interface IFieldFormulaOption {
    value: string;
    label: string;
    type: string;
    icon: string;
    /** where the item is linked now, empty when it has no link */
    linkedTo: string;
}

export interface IFieldFormulaGroup {
    label: string;
    items: IFieldFormulaOption[];
}

export interface IFieldFormulaDocument {
    label: string;
    value: string;
    /** the option that creates a new formula document */
    isNew?: boolean;
}

export interface IFieldFormulasView {
    state: 'hidden' | 'loading' | 'save-first' | 'sub-schema' | 'ready';
    rows: IFieldFormulaRow[];
    groups: IFieldFormulaGroup[];
    documents: IFieldFormulaDocument[];
}

/**
 * A field as the designer shows it: the root (document) schema that is open, the
 * field, the names of the sub-schema fields drilled into and the list holding the field.
 */
export interface IFieldScope {
    schema: Schema;
    field: SchemaField;
    prefix: string[];
    fields: SchemaField[];
}

interface IPendingBinding {
    type: 'bind' | 'unbind' | 'create';
    policyId: string;
    formulaId: string;
    itemUuid: string;
    item?: IFormulaItem;
    scope: IFieldScope;
}

const HIDDEN: IFieldFormulasView = { state: 'hidden', rows: [], groups: [], documents: [] };

/**
 * Formula items shown on the fields of the schema designer.
 *
 * The binding is stored on the formula side (`IFormulaItem.link`), so changes are kept
 * as pending operations and written to the formula documents after the schemas are saved.
 */
export class SchemaFieldFormulas {
    /** the "New formula" form is open */
    public creating: boolean = false;
    /** inputs of the "New formula" form */
    public newName: string = '';
    /** no document is chosen up front, so a new formula document is never created by mistake */
    public newDocument: string = '';
    /** model of the "Assign formula" select, reset after every choice */
    public assignValue: string | null = null;

    private context$: Observable<{ canEdit: boolean; policies: any[] }> | null = null;
    private topic: string = '';
    private policy: any = null;
    private canEdit: boolean = false;
    private readonly formulas = new Map<string, IFormula[]>();
    private readonly loading = new Set<string>();
    private pending: IPendingBinding[] = [];
    private version: number = 0;

    private viewKey: any[] = [];
    private viewCache: IFieldFormulasView = HIDDEN;
    private viewField: SchemaField | null = null;

    private countKey: string = '';
    private countCache = new Map<string, number>();

    constructor(
        private readonly formulasService: FormulasService,
        private readonly policyEngineService: PolicyEngineService,
        private readonly profileService: ProfileService,
        private readonly dialogService: DialogService,
        private readonly reportError: (action: string, error: any) => void,
        private readonly describeLink: (link: IFormulaLink) => string
    ) {
    }

    public get hasPending(): boolean {
        return this.pending.length > 0;
    }

    /**
     * Resolves the policy of the topic and loads its formula documents (once per policy).
     */
    public load(topic: string): void {
        this.topic = topic || '';
        if (!this.topic) {
            this.setPolicy(null);
            return;
        }
        if (!this.context$) {
            this.context$ = forkJoin([
                this.profileService.getProfile(),
                this.policyEngineService.all()
            ]).pipe(
                map(([profile, policies]) => ({
                    canEdit: !!new UserPermissions(profile).FORMULAS_FORMULA_CREATE,
                    policies: policies || []
                })),
                catchError(() => of({ canEdit: false, policies: [] })),
                shareReplay(1)
            );
        }
        const topicId = this.topic;
        this.context$.subscribe(({ canEdit, policies }) => {
            if (topicId !== this.topic) {
                return;
            }
            this.canEdit = canEdit;
            this.setPolicy(policies.find((p) => p?.topicId === topicId) || null);
            if (this.policy && this.canEdit) {
                this.loadFormulas(this.policy.id, false);
            }
        });
    }

    private setPolicy(policy: any): void {
        if (this.policy !== policy) {
            this.policy = policy;
            this.version++;
        }
    }

    private loadFormulas(policyId: string, force: boolean): void {
        if (!policyId || this.loading.has(policyId) || (!force && this.formulas.has(policyId))) {
            return;
        }
        this.loading.add(policyId);
        this.version++;
        this.fetchAll(policyId).subscribe({
            next: (items) => {
                this.loading.delete(policyId);
                this.formulas.set(policyId, items);
                this.version++;
            },
            error: (error) => {
                this.loading.delete(policyId);
                this.version++;
                this.reportError('Load formulas', error);
            }
        });
    }

    private fetchAll(policyId: string): Observable<IFormula[]> {
        const page = (index: number) => this.formulasService
            .getFormulas(index, PAGE_SIZE, { policyId })
            .pipe(map((response) => ({ index, ...this.formulasService.parsePage(response) })));
        return page(0).pipe(
            expand((result) => (result.page.length && (result.index + 1) * PAGE_SIZE < result.count)
                ? page(result.index + 1)
                : EMPTY),
            reduce((all: IFormula[], result) => all.concat(result.page), [])
        );
    }

    /**
     * The section state for the field. Rebuilt only when the inputs change.
     */
    public view(scope: IFieldScope | null, eligible: boolean, subSchema: boolean): IFieldFormulasView {
        const schema = scope?.schema || null;
        const field = scope?.field || null;
        const key = [
            schema, field, field?.name, scope?.prefix.join('.'), scope?.fields, schema?.iri, (schema as any)?.id,
            eligible, subSchema, this.policy, this.canEdit, this.version
        ];
        if (key.length === this.viewKey.length && key.every((value, i) => value === this.viewKey[i])) {
            return this.viewCache;
        }
        this.viewKey = key;
        if (field !== this.viewField) {
            this.viewField = field;
            this.cancelCreate();
            this.assignValue = null;
        }
        this.viewCache = this.buildView(scope, eligible, subSchema);
        return this.viewCache;
    }

    private buildView(scope: IFieldScope | null, eligible: boolean, subSchema: boolean): IFieldFormulasView {
        if (!eligible || !scope || !this.policy || !this.canEdit) {
            return HIDDEN;
        }
        const schema = scope.schema;
        // formulas link to a document schema and the path from it; a sub-schema's own iri
        // is never matched by a request form
        if (subSchema) {
            return { ...HIDDEN, state: 'sub-schema' };
        }
        if (!this.schemaId(schema) || !schema.iri) {
            return { ...HIDDEN, state: 'save-first' };
        }
        const saved = this.formulas.get(this.policy.id);
        if (!saved) {
            return { ...HIDDEN, state: 'loading' };
        }
        const target = this.target(scope);
        const formulas = this.effectiveFormulas();
        const rows: IFieldFormulaRow[] = findFieldBindings(formulas, target).map(({ formula, item }) => ({
            key: `${formula.id}:${item.uuid}`,
            formulaId: String(formula.id),
            formulaName: formula.name || '',
            itemUuid: item.uuid,
            itemName: item.name || 'Untitled',
            type: item.type,
            typeName: formulaTypeName(item.type),
            icon: formulaTypeIcon(item.type),
            published: formula.status === EntityStatus.PUBLISHED,
            pending: this.pending.some((p) => this.isPendingOp(p, item.uuid, target, false))
        }));
        const groups: IFieldFormulaGroup[] = [];
        const documents: IFieldFormulaDocument[] = [];
        for (const formula of formulas) {
            const isNew = formula.id === NEW_FORMULA_DOCUMENT;
            if (!isNew && !isEditableFormula(formula)) {
                continue;
            }
            if (!isNew) {
                documents.push({ label: formula.name || 'Untitled', value: String(formula.id) });
            }
            const items: IFieldFormulaOption[] = [];
            for (const item of formula.config?.formulas || []) {
                if (!item || !BINDABLE_ITEM_TYPES.has(item.type) || isLinkedTo(item.link, target)) {
                    continue;
                }
                items.push({
                    value: `${formula.id}|${item.uuid}`,
                    label: item.name || 'Untitled',
                    type: item.type,
                    icon: formulaTypeIcon(item.type),
                    linkedTo: item.link ? this.describeLink(item.link) : ''
                });
            }
            if (items.length) {
                groups.push({ label: formula.name || 'Untitled', items });
            }
        }
        documents.push({ label: 'New formula document', value: NEW_FORMULA_DOCUMENT, isNew: true });
        if (!documents.some((d) => d.value === this.newDocument)) {
            this.newDocument = '';
        }
        return { state: 'ready', rows, groups, documents };
    }

    /**
     * Shows the chosen item on the field. Asks first when the item is linked elsewhere.
     */
    public assign(scope: IFieldScope, value: string | null): void {
        setTimeout(() => this.assignValue = null);
        if (!value || !this.policy) {
            return;
        }
        const separator = value.indexOf('|');
        const formulaId = value.slice(0, separator);
        const itemUuid = value.slice(separator + 1);
        const formula = this.effectiveFormulas().find((f) => f.id === formulaId);
        const item = formula?.config?.formulas?.find((i) => i.uuid === itemUuid);
        if (!formula || !item) {
            return;
        }
        const target = this.target(scope);
        const apply = () => {
            const index = this.pending.findIndex((p) => this.isPendingOp(p, itemUuid, target, true));
            if (index !== -1) {
                this.pending.splice(index, 1);
            } else {
                this.pending.push({ type: 'bind', policyId: this.policy.id, formulaId, itemUuid, scope: this.copyScope(scope) });
            }
            this.version++;
        };
        if (!item.link || isLinkedTo(item.link, target)) {
            apply();
            return;
        }
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Move formula link',
                text: `'${item.name || 'Untitled'}' is linked to ${this.describeLink(item.link)}. Move the link to this field?`,
                buttons: [{
                    name: 'Cancel',
                    class: 'secondary'
                }, {
                    name: 'Move',
                    class: 'primary'
                }]
            },
        });
        dialogRef?.onClose.subscribe((result: string) => {
            if (result === 'Move') {
                apply();
            }
        });
    }

    /**
     * Removes the item from the field. A pending assignment is simply dropped.
     */
    public unbind(scope: IFieldScope, row: IFieldFormulaRow): void {
        if (!this.policy || row.published) {
            return;
        }
        const target = this.target(scope);
        if (row.pending) {
            this.pending = this.pending.filter((p) => !this.isPendingOp(p, row.itemUuid, target, false));
        } else {
            this.pending.push({ type: 'unbind', policyId: this.policy.id, formulaId: row.formulaId, itemUuid: row.itemUuid, scope: this.copyScope(scope) });
        }
        this.version++;
    }

    /**
     * Adds an empty formula item linked to the field.
     */
    public create(scope: IFieldScope): void {
        if (!this.canCreate || !this.policy) {
            return;
        }
        const item = createStubItem(this.newName.trim());
        this.pending.push({
            type: 'create',
            policyId: this.policy.id,
            formulaId: this.newDocument,
            itemUuid: item.uuid,
            item,
            scope: this.copyScope(scope)
        });
        this.cancelCreate();
        this.version++;
    }

    public get canCreate(): boolean {
        return !!this.newName.trim() && !!this.newDocument;
    }

    /** every way out of the form clears it, so opening only shows it */
    public startCreate(): void {
        this.creating = true;
    }

    public cancelCreate(): void {
        this.creating = false;
        this.newName = '';
        this.newDocument = '';
    }

    /**
     * Number of formula items shown on the field, pending changes included.
     * Counted once per schema and change, so it is cheap to call for every field card.
     */
    public count(schema: Schema | null | undefined, prefix: string[], fieldName: string): number {
        const iri = String(schema?.iri || '');
        if (!iri || !this.policy || !this.canEdit || !this.formulas.has(this.policy.id)) {
            return 0;
        }
        // the version changes with the policy, the loaded formulas and the pending changes
        const key = `${this.version}|${iri}`;
        if (key !== this.countKey) {
            this.countKey = key;
            this.countCache = new Map<string, number>();
            for (const formula of this.effectiveFormulas()) {
                for (const item of formula.config?.formulas || []) {
                    const link = item?.link;
                    if (link?.type === 'schema' && link.entityId === iri && BINDABLE_ITEM_TYPES.has(item.type)) {
                        this.countCache.set(link.item, (this.countCache.get(link.item) || 0) + 1);
                    }
                }
            }
        }
        return this.countCache.get(buildFieldPath(prefix, fieldName)) || 0;
    }

    /**
     * Drops the pending changes of the schema (its edits were discarded).
     */
    public discard(schemaId: string | null | undefined): void {
        if (!schemaId || !this.pending.length) {
            return;
        }
        const count = this.pending.length;
        this.pending = this.pending.filter((p) => this.schemaId(p.scope.schema) !== schemaId);
        if (this.pending.length !== count) {
            this.version++;
        }
    }

    /**
     * The saved formulas of the schema as a request form shows them, for the Preview tab.
     * Emits null when the topic has no policy or the schema is not saved yet.
     */
    public previewTree(schemaIri: string | null | undefined): Observable<FormulasTree | null> {
        if (!this.policy?.id || !schemaIri) {
            return of(null);
        }
        return this.formulasService.getFormTree(this.policy.id, schemaIri).pipe(catchError(() => of(null)));
    }

    /**
     * Writes the pending changes. Every formula document is re-read first so concurrent
     * edits are kept. Changes of documents that failed stay pending.
     * Emits true when everything was written.
     */
    public save(): Observable<boolean> {
        // a field deleted after its formulas were assigned has nothing to link to
        this.pending = this.pending.filter((p) => p.scope.fields.includes(p.scope.field));
        const batch = [...this.pending];
        if (!batch.length) {
            return of(true);
        }
        const groups = new Map<string, IPendingBinding[]>();
        for (const p of batch) {
            const key = `${p.policyId}|${p.formulaId}`;
            groups.set(key, [...(groups.get(key) || []), p]);
        }
        const tasks = Array.from(groups.values()).map((list) => {
            const { policyId, formulaId } = list[0];
            const ops = list.map((p) => this.toOp(p));
            let request: Observable<FieldBindingOp[]>;
            if (formulaId === NEW_FORMULA_DOCUMENT) {
                const { config, skipped } = applyFieldBindingOps({ formulas: [], files: [] }, ops);
                request = this.formulasService.createFormula({
                    name: this.newDocumentName(policyId),
                    description: '',
                    policyId,
                    config
                }).pipe(map(() => skipped));
            } else {
                request = this.formulasService.getFormula(formulaId).pipe(
                    switchMap((formula: IFormula) => {
                        if (formula?.status === EntityStatus.PUBLISHED) {
                            throw new Error(`Formula "${formula.name}" is published and can't be changed.`);
                        }
                        const { config, skipped } = applyFieldBindingOps(formula?.config, ops);
                        return this.formulasService.updateFormula({ ...formula, config }).pipe(map(() => skipped));
                    })
                );
            }
            return request.pipe(
                map((skipped) => ({ list, skipped, error: null as any })),
                catchError((error) => of({ list, skipped: [] as FieldBindingOp[], error }))
            );
        });
        return forkJoin(tasks).pipe(map((results) => {
            const done = new Set<IPendingBinding>();
            let skipped = 0;
            let failed = false;
            for (const result of results) {
                if (result.error) {
                    failed = true;
                    this.reportError('Save formula assignments', result.error);
                } else {
                    result.list.forEach((p) => done.add(p));
                    skipped += result.skipped.length;
                }
            }
            if (skipped) {
                this.reportError('Save formula assignments', {
                    message: `${skipped} formula item(s) no longer exist and were not assigned.`
                });
            }
            this.pending = this.pending.filter((p) => !done.has(p));
            this.version++;
            const policies = new Set(Array.from(done).map((p) => p.policyId));
            for (const policyId of policies) {
                this.loadFormulas(policyId, true);
            }
            return !failed;
        }));
    }

    private newDocumentName(policyId: string): string {
        const name = this.policy?.id === policyId ? this.policy?.name : '';
        return `${name || 'Policy'} formulas`;
    }

    private effectiveFormulas(): IFormula[] {
        const policyId = this.policy?.id;
        const saved = this.formulas.get(policyId) || [];
        const ops = this.pending.filter((p) => p.policyId === policyId).map((p) => this.toOp(p));
        return applyFieldBindingOpsToFormulas(saved, ops, () => ({
            name: this.newDocumentName(policyId),
            status: EntityStatus.DRAFT,
            config: { formulas: [], files: [] }
        }));
    }

    private toOp(p: IPendingBinding): FieldBindingOp {
        const target = this.target(p.scope);
        if (p.type === 'create') {
            return { type: 'create', formulaId: p.formulaId, item: p.item!, target };
        }
        return { type: p.type, formulaId: p.formulaId, itemUuid: p.itemUuid, target };
    }

    /**
     * The root schema iri and the field path from it. The iri and the field name are read
     * when used, so a renamed key or a saved schema is picked up; the drilled-into field
     * names are fixed when the change is queued.
     */
    private target(scope: IFieldScope): IFieldTarget {
        return {
            schemaIri: String(scope.schema.iri || ''),
            fieldPath: buildFieldPath(scope.prefix, scope.field.name)
        };
    }

    private copyScope(scope: IFieldScope): IFieldScope {
        return { ...scope, prefix: [...scope.prefix] };
    }

    /** a pending unbind (`unbind` true) or a pending bind/create of the item on the field */
    private isPendingOp(p: IPendingBinding, itemUuid: string, target: IFieldTarget, unbind: boolean): boolean {
        return (p.type === 'unbind') === unbind &&
            p.itemUuid === itemUuid &&
            this.sameTarget(p, target);
    }

    private sameTarget(p: IPendingBinding, target: IFieldTarget): boolean {
        const own = this.target(p.scope);
        return own.schemaIri === target.schemaIri && own.fieldPath === target.fieldPath;
    }

    private schemaId(schema: Schema | null | undefined): string {
        return (schema as any)?.id || (schema as any)?._id || '';
    }
}
