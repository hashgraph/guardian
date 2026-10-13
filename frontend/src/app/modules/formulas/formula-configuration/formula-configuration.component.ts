import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IFormulaItem, FormulaItemType, IFormulaLink, Schema, SchemaField, UserPermissions, EntityStatus, PolicyStatus } from '@guardian/interfaces';
import { debounceTime, forkJoin, Subject, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MathLiveComponent } from '../../common/mathlive/mathlive.component';
import { LinkDialog } from '../dialogs/link-dialog/link-dialog.component';
import { Formulas } from '../models/formulas';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ConditionFieldGroup } from '../../common/condition-if-editor/condition-if-editor.component';
import { FormulaFilesDialog } from '../dialogs/formula-files-dialog/formula-files-dialog.component';

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

    public get showPolicyVersion(): boolean {
        const status = this.policy?.status;
        return !!this.policy?.version && (status === PolicyStatus.PUBLISH || status === PolicyStatus.DISCONTINUED);
    }

    public config: Formulas = new Formulas();
    public readonly options = [
        { id: 'constant', text: 'Constant', icon: 'const' },
        { id: 'variable', text: 'Variable', icon: 'variable' },
        { id: 'formula', text: 'Formula', icon: 'function' },
        { id: 'text', text: 'Text', icon: 'text' }
    ];
    public readonly typeNames: { [type: string]: string } = {
        constant: 'Constant',
        variable: 'Variable',
        formula: 'Formula',
        text: 'Text'
    };

    public readonly typeIcons: { [type: string]: string } = {
        constant: 'const',
        variable: 'variable',
        formula: 'function',
        text: 'text'
    };

    public selected: IFormulaItem | null = null;
    /** the selected item as a list (the editor is re-mounted for every item) */
    public selectedList: IFormulaItem[] = [];
    public typePosition: number = 0;
    public typeTotal: number = 0;
    public selectedVisible: boolean = true;
    public searchText: string = '';
    public query: string = '';
    public isFiltering: boolean = false;
    public allHidden: boolean = false;
    public canDrag: boolean = false;
    private search$ = new Subject<string>();

    public readonly filters: { [type: string]: boolean } = {
        constant: true,
        variable: true,
        formula: true,
        text: true
    }

    public dirty: boolean = false;

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
                field: this.getFieldName(item.link)
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
                    this.markDirty();
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
            this.config.fromData(item?.config);
            this.selected = this.config.all[0] || null;
            this.refreshView();
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

    public onSave() {
        this.loading = true;
        const config = this.config.getJson();
        const value = this.overviewForm.value;
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        this.formulasService
            .updateFormula(item)
            .subscribe((data) => {
                this.item = data;
                this.formulasMap.set(String(this.item.uuid), String(this.item.name));
                this.dirty = false;
                this.overviewForm.markAsPristine();
                this.refreshView();
                this.loading = false;
            }, (e) => {
                this.loading = false;
            });
    }

    public addItem(option: any) {
        const type: FormulaItemType = option.id;
        const item = this.config.add(type);
        this.selected = item;
        this.dirty = true;
        this.refreshView();
        if (!this.selectedVisible) {
            this.clearSearch();
            this.filters.constant = true;
            this.filters.variable = true;
            this.filters.formula = true;
            this.filters.text = true;
            this.onFilter();
        }
        setTimeout(() => {
            this.scrollToRow(item);
            this.nameInput?.nativeElement.focus();
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
                this.markDirty();
                setTimeout(() => this.scrollToRow(this.selected));
            }
        });
    }

    public onFilter() {
        this.config.setFilters(this.filters);
        this.refreshView();
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
        this.query = String(value || '').trim();
        this.refreshView();
    }

    public select(item: IFormulaItem) {
        if (this.selected === item) {
            return;
        }
        this.selected = item;
        this.keyboard = false;
        this.refreshView();
    }

    public duplicateItem(item: IFormulaItem) {
        if (this.readonly) {
            return;
        }
        const copy = this.config.duplicate(item);
        if (copy) {
            this.selected = copy;
            this.dirty = true;
            this.refreshView();
            setTimeout(() => this.scrollToRow(copy));
        }
    }

    /**
     * Updates the list data and the state of the list and the editor.
     */
    public refreshView() {
        this.config.update();
        const selected = this.selected;
        this.selectedList = selected ? [selected] : [];
        const sameType = selected ? this.config.all.filter((e) => e.type === selected.type) : [];
        this.typeTotal = sameType.length;
        this.typePosition = selected ? sameType.indexOf(selected) + 1 : 0;
        this.selectedVisible = !selected || this.config.data.includes(selected);
        this.allHidden = !this.filters.constant && !this.filters.variable && !this.filters.formula && !this.filters.text;
        this.isFiltering = this.config.isFiltering;
        this.canDrag = !this.readonly && !this.isFiltering;
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
                // keep the display condition only when the link still points at the same schema
                const previous = item.link;
                if (
                    result.type === 'schema' &&
                    previous?.type === 'schema' &&
                    previous.entityId === result.entityId &&
                    previous.condition
                ) {
                    result.condition = previous.condition;
                } else {
                    delete result.condition;
                }
                item.link = result;
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
        this.markDirty();
    }

    public openFiles() {
        const dialogRef = this.dialogService.open(FormulaFilesDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                config: this.config,
                readonly: this.readonly
            },
        })!;
        dialogRef.onClose.subscribe((changed: boolean) => {
            if (changed) {
                this.markDirty();
            }
        });
    }

    public markDirty() {
        this.dirty = true;
        this.refreshView();
    }
}
