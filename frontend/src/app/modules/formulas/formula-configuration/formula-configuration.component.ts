import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IFormulaItem, IFormulaSource, FormulaItemType, IFormulaLink, Schema, SchemaField, UserPermissions, EntityStatus, PolicyStatus } from '@guardian/interfaces';
import { debounceTime, forkJoin, Observable, of, Subject, Subscription, switchMap } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MathLiveComponent } from '../../common/mathlive/mathlive.component';
import { LinkDialog } from '../dialogs/link-dialog/link-dialog.component';
import { Formulas, MISSING_LINK_TEXT } from '../models/formulas';
import { FORMULA_TYPES, SOURCE_FIELDS, formulaTypeIcon, formulaTypeName } from '../models/formula-meta';
import { moveLink } from '../models/field-bindings';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ConditionFieldGroup } from '../../common/condition-if-editor/condition-if-editor.component';
import { FormulaFilesDialog } from '../dialogs/formula-files-dialog/formula-files-dialog.component';

type SourceKey = keyof IFormulaSource;
const SOURCE_KEYS: SourceKey[] = SOURCE_FIELDS.map((f) => f.key);

@Component({
    selector: 'app-formula-configuration',
    templateUrl: './formula-configuration.component.html',
    styleUrls: ['../../policy-engine/styles/top-toolbar.scss', './formula-configuration.component.scss'],
    standalone: false
})
export class FormulaConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    @ViewChild('editor') editor: ElementRef<HTMLElement>;
    @ViewChild('rows') rows: ElementRef<HTMLElement>;
    @ViewChild('nameInput') nameInput: ElementRef<HTMLInputElement>;

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    private subscription = new Subscription();
    private formulaId: string;

    public item: any;
    public policy: any;
    public schemas: Schema[];
    public formulas: any[];
    public readonly: boolean = false;
    public keyboard: boolean = false;

    public readonly EntityStatus = EntityStatus;

    /** formulas can be published only when their policy is published */
    public get canPublish(): boolean {
        return this.policy?.status === PolicyStatus.PUBLISH;
    }

    public get showPolicyVersion(): boolean {
        const status = this.policy?.status;
        return !!this.policy?.version && (status === PolicyStatus.PUBLISH || status === PolicyStatus.DISCONTINUED);
    }

    public config: Formulas = new Formulas();
    public readonly options = FORMULA_TYPES;
    public readonly typeNames = formulaTypeName;
    public readonly typeIcons = formulaTypeIcon;

    public selected: IFormulaItem | null = null;
    /** the selected item as a list (the editor is re-mounted for every item) */
    public selectedList: IFormulaItem[] = [];
    public typePosition: number = 0;
    public typeTotal: number = 0;
    public selectedVisible: boolean = true;
    public searchText: string = '';
    /** the applied (debounced) search text */
    public get query(): string {
        return this.config.searchQuery;
    }
    public get isFiltering(): boolean {
        return this.config.isFiltering;
    }
    public get allHidden(): boolean {
        return !Object.values(this.filters).some((e) => e);
    }
    public get canDrag(): boolean {
        return !this.readonly && !this.isFiltering;
    }
    private search$ = new Subject<string>();

    public readonly filters: { [type: string]: boolean } = {
        constant: true,
        variable: true,
        formula: true,
        text: true
    }

    public dirty: boolean = false;
    /** the schema link of the selected item points to a schema or field that does not exist */
    public selectedLinkMissing: boolean = false;
    public readonly missingLinkText = MISSING_LINK_TEXT;

    public overviewForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<string>('', Validators.required),
    });

    private schemasMap: Map<string, string> = new Map<string, string>();
    private schemasFieldMap: Map<string, string> = new Map<string, string>();
    private formulasMap: Map<string, string> = new Map<string, string>();
    private formulasFieldMap: Map<string, string> = new Map<string, string>();

    constructor(
        private profileService: ProfileService,
        private formulasService: FormulasService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
        this.config.labelFn = (item: IFormulaItem) => {
            if (!item.link) {
                return null;
            }
            return {
                entity: this.getEntityName(item.link),
                field: this.getFieldName(item.link),
                missing: this.isLinkMissing(item.link)
            };
        };
        this.subscription.add(
            this.search$.pipe(debounceTime(150)).subscribe((value) => {
                this.applyQuery(value);
            })
        );
        this.subscription.add(
            this.overviewForm.valueChanges.subscribe(() => {
                if (this.overviewForm.dirty) {
                    this.dirty = true;
                }
            })
        );
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        this.profileService
            .getProfile()
            .subscribe((profile) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;

                if (this.isConfirmed) {
                    this.loadData();
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }
            }, (e) => {
                this.loading = false;
            });
    }

    private loadData() {
        this.formulaId = this.route.snapshot.params['formulaId'];
        this.loading = true;
        forkJoin([
            this.formulasService.getFormula(this.formulaId),
            this.formulasService.getRelationships(this.formulaId),
        ]).subscribe(([item, relationships]) => {
            this.item = item;
            this.readonly = this.item?.status === EntityStatus.PUBLISHED;
            this.updateRelationships(relationships);

            this.overviewForm.setValue({
                name: item.name || '',
                description: item.description || '',
                policy: this.policy?.name || '',
            });
            const selectedId = this.selected?.uuid || this.route.snapshot.queryParams['item'];
            this.config.fromData(item?.config);
            this.selected = (selectedId && this.config.getItem(selectedId)) || this.config.all[0] || null;
            this.refreshSelection();
            this.dirty = false;
            this.overviewForm.markAsPristine();
            this.loading = false;
        }, (e) => {
            this.loading = false;
        });
    }

    private updateRelationships(relationships: any) {
        this.policy = relationships?.policy || {};
        const schemas = relationships?.schemas || [];
        const formulas = relationships?.formulas || [];

        this.schemas = [];
        for (const schema of schemas) {
            try {
                const item = new Schema(schema);
                this.schemas.push(item);
            } catch (error) {
                console.log(error);
            }
        }

        this.linkGroupsCache.clear();
        this.linkResolversCache.clear();
        this.linkFirstEntryCache.clear();
        this.schemasMap.clear();
        this.schemasFieldMap.clear();
        for (const schema of this.schemas) {
            this.schemasMap.set(String(schema.iri), String(schema.name));
            const fields = schema.getFields();
            for (const field of fields) {
                this.schemasFieldMap.set(`${schema.iri}.${field.path}`, String(field.description));
            }
        }

        this.formulas = [];
        for (const formula of formulas) {
            this.formulas.push(formula);
        }

        this.formulasMap.clear();
        this.formulasFieldMap.clear();
        this.formulasMap.set(String(this.item.uuid), String(this.item.name));
        for (const formula of this.formulas) {
            this.formulasMap.set(String(formula.uuid), String(formula.name));
            const fields = formula?.config?.formulas || [];
            for (const field of fields) {
                this.formulasFieldMap.set(`${formula.uuid}.${field.uuid}`, String(field.name));
            }
        }
    }

    public onBack() {
        this.router.navigate(['/formulas']);
    }

    private getSaveItem(): any {
        const value = this.overviewForm.value;
        return {
            ...this.item,
            name: value.name,
            description: value.description,
            config: this.config.getJson()
        };
    }

    public onSave() {
        this.loading = true;
        this.formulasService
            .updateFormula(this.getSaveItem())
            .subscribe((data) => {
                this.item = data;
                this.formulasMap.set(String(this.item.uuid), String(this.item.name));
                this.dirty = false;
                this.overviewForm.markAsPristine();
                this.refreshList();
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }

    public onChangeStatus(status: EntityStatus) {
        if (status !== EntityStatus.PUBLISHED) {
            this.changeStatus(status);
            return;
        }
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Publish Formula',
                text: `Are you sure want to publish formula (${this.item?.name})?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Publish',
                    class: 'primary'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Publish') {
                this.changeStatus(status);
            }
        });
    }

    /**
     * Saves unsaved changes first: the status requests do not send the configuration.
     */
    private changeStatus(status: EntityStatus) {
        let request: (item: any) => Observable<any>;
        if (status === EntityStatus.DRAFT) {
            request = (item) => this.formulasService.draft(item);
        } else if (status === EntityStatus.DRY_RUN) {
            request = (item) => this.formulasService.dryRun(item);
        } else {
            request = (item) => this.formulasService.publish(item);
        }
        this.loading = true;
        const save$ = this.dirty ? this.formulasService.updateFormula(this.getSaveItem()) : of(this.item);
        save$
            .pipe(switchMap((item) => request(item || this.item)))
            .subscribe(() => {
                this.loadData();
            }, (e) => {
                this.loading = false;
            });
    }

    public addItem(option: any) {
        const type: FormulaItemType = option.id;
        const item = this.config.add(type);
        this.selected = item;
        this.dirty = true;
        this.refreshSelection();
        if (!this.selectedVisible) {
            this.clearSearch();
            this.showAllTypes();
        }
        setTimeout(() => {
            this.scrollToRow(item);
            this.nameInput?.nativeElement.focus();
        });
    }

    public hasSource(item: IFormulaItem): boolean {
        return !!item.source && SOURCE_KEYS.some((key) => !!item.source?.[key]);
    }

    public getSource(item: IFormulaItem, key: SourceKey): string {
        return item.source?.[key] || '';
    }

    /**
     * Creates `source` lazily on the first non-empty value and removes it when all fields are empty.
     */
    public setSource(item: IFormulaItem, key: SourceKey, value: string | null) {
        const text = value || '';
        if (!text && !item.source) {
            return;
        }
        const source: IFormulaSource = { ...(item.source || {}) };
        if (text) {
            source[key] = text;
        } else {
            delete source[key];
        }
        if (SOURCE_KEYS.some((k) => !!source[k]?.trim())) {
            item.source = source;
        } else {
            delete item.source;
        }
        this.markDirty();
    }

    public applyMethodologyToAll(item: IFormulaItem) {
        const value = this.getSource(item, 'methodology');
        if (!value) {
            return;
        }
        const all = this.config.all;
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Apply methodology to all items',
                text: `Set methodology "${value}" on all ${all.length} items? Items that already have a different methodology will be overwritten.`,
                regularText: true,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Apply',
                    class: 'primary'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Apply') {
                for (const e of all) {
                    e.source = { ...(e.source || {}), methodology: value };
                }
                this.markDirty();
            }
        });
    }

    public deleteItem(item: any) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete item',
                text: 'Are you sure want to delete item?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                const index = this.config.indexOf(item);
                this.config.delete(item);
                if (this.selected?.uuid === item.uuid) {
                    const all = this.config.all;
                    this.selected = all[index] || all[index - 1] || null;
                }
                this.dirty = true;
                this.refreshSelection();
                setTimeout(() => this.scrollToRow(this.selected));
            }
        });
    }

    public onFilter() {
        this.config.setFilters(this.filters);
        this.refreshSelection();
    }

    public toggleFilter(type: string) {
        this.filters[type] = !this.filters[type];
        this.onFilter();
    }

    public showAllTypes() {
        this.filters.constant = true;
        this.filters.variable = true;
        this.filters.formula = true;
        this.filters.text = true;
        this.onFilter();
    }

    public onSearch(value: string) {
        this.searchText = value;
        this.search$.next(value);
    }

    public clearSearch() {
        this.searchText = '';
        this.applyQuery('');
    }

    private applyQuery(value: string) {
        this.config.setQuery(value);
        this.refreshSelection();
    }

    public select(item: IFormulaItem) {
        if (this.selected === item) {
            return;
        }
        this.selected = item;
        this.keyboard = false;
        this.refreshSelection();
    }

    public duplicateItem(item: IFormulaItem) {
        if (this.readonly) {
            return;
        }
        const copy = this.config.duplicate(item);
        if (copy) {
            this.selected = copy;
            this.dirty = true;
            this.refreshSelection();
            setTimeout(() => this.scrollToRow(copy));
        }
    }

    /**
     * Rebuilds the list rows and the counters, then the state of the editor.
     */
    private refreshList() {
        this.config.update();
        this.refreshSelection();
    }

    /**
     * Updates the state of the list and the editor that depends on the selected item.
     */
    private refreshSelection() {
        const selected = this.selected;
        this.selectedList = selected ? [selected] : [];
        this.selectedLinkMissing = !!selected?.link && this.isLinkMissing(selected.link);
        const sameType = selected ? this.config.all.filter((e) => e.type === selected.type) : [];
        this.typeTotal = sameType.length;
        this.typePosition = selected ? sameType.indexOf(selected) + 1 : 0;
        this.selectedVisible = !selected || this.config.data.includes(selected);
    }

    private scrollToRow(item: IFormulaItem | null) {
        if (!item) {
            return;
        }
        const row = this.rows?.nativeElement.querySelector(`[data-uuid="${item.uuid}"]`);
        row?.scrollIntoView({ block: 'nearest' });
    }

    public onKeyboard($event: boolean) {
        this.keyboard = $event;
    }

    public onKeyboardFocus($event: MathLiveComponent) {
        setTimeout(() => {
            if (this.keyboard) {
                const focus = $event.getElement();
                const scroll = this.editor;
                if (!scroll) {
                    return;
                }
                const targetRect = focus.nativeElement.getBoundingClientRect();
                const scrollRect = scroll.nativeElement.getBoundingClientRect();
                const y = targetRect.y - scrollRect.y;
                const height = scrollRect.height;
                const d = y - height + 60;
                if (d > 0) {
                    scroll.nativeElement.scrollTop += d;
                }
            }
        });
    }

    public onLink(item: IFormulaItem) {
        if (this.readonly) {
            return;
        }
        const dialogRef = this.dialogService.open(LinkDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            focusOnShow: false,
            data: {
                link: item.link,
                schemas: this.schemas,
                formulas: [
                    this.item,
                    ...this.formulas
                ]
            },
        })!;
        dialogRef.onClose.subscribe((result: IFormulaLink | null) => {
            if (result) {
                // keeps the display condition only when the link still points at the same schema
                if (result.type === 'schema') {
                    item.link = moveLink(item.link, { schemaIri: result.entityId, fieldPath: result.item });
                } else {
                    delete result.condition;
                    item.link = result;
                }
                this.markDirty();
            }
        });
    }

    // ── Display condition of a schema link ───────────────────────────────────

    private linkGroupsCache = new Map<string, ConditionFieldGroup[]>();
    private linkResolversCache = new Map<string, (pathStr: string) => SchemaField | null>();
    private linkFirstEntryCache = new Map<string, () => { field: SchemaField; fieldPath: string[] } | null>();

    private findSchema(entityId: string): Schema | undefined {
        return this.schemas?.find((s) => s.iri === entityId);
    }

    public getLinkFieldGroups(link: IFormulaLink): ConditionFieldGroup[] {
        const entityId = link.entityId;
        let groups = this.linkGroupsCache.get(entityId);
        if (!groups) {
            groups = this.buildLinkFieldGroups(this.findSchema(entityId));
            this.linkGroupsCache.set(entityId, groups);
        }
        return groups;
    }

    private buildLinkFieldGroups(schema?: Schema): ConditionFieldGroup[] {
        const result: ConditionFieldGroup[] = [];
        if (!schema) {
            return result;
        }
        const nestLabel = (name: string, depth: number) =>
            depth <= 1 ? name : ' '.repeat((depth - 1) * 3) + '› ' + name;
        const addGroups = (fields: SchemaField[], groupName: string, depth: number) => {
            const items: { pathStr: string; label: string }[] = [];
            for (const f of fields) {
                if (f.readOnly || f.isRef) { continue; }
                items.push({ pathStr: f.path || f.name, label: f.description || f.title || f.name });
            }
            if (items.length) {
                result.push({ label: nestLabel(groupName, depth), items });
            }
            for (const f of fields) {
                if (f.readOnly || !f.isRef || !Array.isArray(f.fields) || !f.fields.length) { continue; }
                addGroups(f.fields, f.description || f.title || f.name, depth + 1);
            }
        };
        addGroups(schema.fields || [], `This schema – ${schema.name}`, 0);
        return result;
    }

    private snapshotField(field: SchemaField): SchemaField {
        return {
            name: field.name,
            title: field.title,
            description: field.description,
            type: field.type,
            isArray: field.isArray,
            isRef: field.isRef,
            ...(field.enum ? { enum: field.enum } : {})
        } as SchemaField;
    }

    public getLinkResolveField(link: IFormulaLink): (pathStr: string) => SchemaField | null {
        const entityId = link.entityId;
        let resolver = this.linkResolversCache.get(entityId);
        if (!resolver) {
            resolver = (pathStr: string) => {
                const field = this.findSchema(entityId)?.getField(pathStr);
                return field ? this.snapshotField(field) : null;
            };
            this.linkResolversCache.set(entityId, resolver);
        }
        return resolver;
    }

    public getLinkFirstEntry(link: IFormulaLink): () => { field: SchemaField; fieldPath: string[] } | null {
        let first = this.linkFirstEntryCache.get(link.entityId);
        if (!first) {
            first = () => this.findFirstEntry(link);
            this.linkFirstEntryCache.set(link.entityId, first);
        }
        return first;
    }

    private findFirstEntry(link: IFormulaLink): { field: SchemaField; fieldPath: string[] } | null {
        const resolve = this.getLinkResolveField(link);
        for (const group of this.getLinkFieldGroups(link)) {
            for (const option of group.items) {
                const field = resolve(option.pathStr);
                if (field) {
                    return { field, fieldPath: option.pathStr.split('.') };
                }
            }
        }
        return null;
    }

    public toggleLinkCondition(item: IFormulaItem, on: boolean): void {
        if (this.readonly || !item.link) {
            return;
        }
        if (!on) {
            delete item.link.condition;
            this.markDirty();
            return;
        }
        const first = this.getLinkFirstEntry(item.link)();
        if (!first) {
            return;
        }
        item.link.condition = {
            field: first.field,
            fieldValue: '',
            ...(first.fieldPath.length > 1 ? { fieldPath: first.fieldPath } : {})
        };
        this.markDirty();
    }

    public getEntityName(link: IFormulaLink): string {
        if (link.type === 'schema') {
            return this.schemasMap.get(link.entityId) || '';
        }
        if (link.type === 'formula') {
            return this.formulasMap.get(link.entityId) || '';
        }
        return '';
    }

    /**
     * A schema link whose schema or field is not among the policy schemas.
     */
    public isLinkMissing(link: IFormulaLink): boolean {
        if (link?.type !== 'schema') {
            return false;
        }
        return !this.schemasMap.has(link.entityId) || !this.schemasFieldMap.has(`${link.entityId}.${link.item}`);
    }

    public getFieldName(link: IFormulaLink): string {
        if (link.type === 'schema') {
            return this.schemasFieldMap.get(`${link.entityId}.${link.item}`) || '';
        }
        if (link.type === 'formula') {
            if (link.entityId === this.item?.uuid) {
                return this.config.getItem(link.item)?.name || '';
            } else {
                return this.formulasFieldMap.get(`${link.entityId}.${link.item}`) || '';
            }
        }
        return '';
    }

    public deleteLink(item: IFormulaItem, $event: any) {
        if (this.readonly) {
            return;
        }
        $event.preventDefault();
        $event.stopPropagation();
        item.link = null;
        this.markDirty();
    }

    public drop(event: CdkDragDrop<any[]>) {
        this.config.reorder(event.previousIndex, event.currentIndex);
        this.dirty = true;
        this.refreshSelection();
    }

    public openFiles() {
        this.dialogService.open(FormulaFilesDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                config: this.config,
                readonly: this.readonly,
                onChange: () => this.dirty = true
            },
        });
    }

    /**
     * An item was edited: its row (name, value, link, source) and the search counters are rebuilt.
     */
    public markDirty() {
        this.dirty = true;
        this.refreshList();
    }
}
