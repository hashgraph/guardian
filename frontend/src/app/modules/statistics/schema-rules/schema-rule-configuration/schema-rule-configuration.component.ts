import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentFieldValidators, EntityStatus, FieldRuleResult, ISchemaRules, ISchemaRulesConfig, PolicyStatus, Schema, SchemaField, UserPermissions } from '@guardian/interfaces';
import { debounceTime, forkJoin, Observable, of, Subject, Subscription, switchMap } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { TreeGraphComponent } from '../../../common/tree-graph/tree-graph.component';
import { TreeNode } from '../../../common/tree-graph/tree-node';
import { TreeListItem } from '../../../common/tree-graph/tree-list';
import { SchemaData, SchemaNode } from '../../../common/models/schema-node';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SchemaService } from 'src/app/services/schema.service';
import { TreeSource } from '../../../common/tree-graph/tree-source';
import { createAutocomplete } from '../../../common/models/lang-modes/autocomplete';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { ConditionRule, FormulaRule, RangeRule } from '../../../common/models/conditions';
import { FieldRule, FieldRules } from "src/app/modules/common/models/field-rule";
import { EnumValue, SchemaRuleConfigDialog } from '../dialogs/schema-rule-config-dialog/schema-rule-config-dialog.component';
import { CustomConfirmDialogComponent } from '../../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IPFSService } from 'src/app/services/ipfs.service';

@Component({
    selector: 'app-schema-rule-configuration',
    templateUrl: './schema-rule-configuration.component.html',
    styleUrls: [
        '../../../policy-engine/styles/top-toolbar.scss',
        './schema-rule-configuration.component.scss'
    ],
    standalone: false
})
export class SchemaRuleConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    public ruleId: string;
    public item: any | undefined;
    public policy: any;
    public schemas: Schema[];
    public enumMap: Map<string, Map<string, EnumValue>>;

    private subscription = new Subscription();
    private tree: TreeGraphComponent;
    private nodes: SchemaNode[];
    private source: TreeSource<SchemaNode>;

    public selectedNode: SchemaNode | null = null;
    public rootNode: SchemaNode | null = null;

    public nodeLoading: boolean = true;
    public searchField: string = '';
    public tabIndex: number = 0;

    public view: 'schemas' | 'rules' = 'schemas';
    private viewInitialized: boolean = false;

    public testOpen: boolean = false;
    public testValues = new Map<string, string>();
    public testResults = new Map<string, FieldRuleResult>();
    public hoverKey: string | null = null;
    public readonly FieldRuleResult = FieldRuleResult;
    private validators: DocumentFieldValidators;
    private test$ = new Subject<void>();
    private testOptions = new WeakMap<EnumValue, { items: any[], options: any[] }>();

    public readonly: boolean = false;
    public dirty: boolean = false;
    public readonly EntityStatus = EntityStatus;

    @ViewChild('fieldTree', { static: false }) fieldTree: ElementRef;
    @ViewChild('treeTabs', { static: false }) treeTabs: ElementRef;

    private _selectTimeout1: any;
    private _selectTimeout2: any;
    private _selectTimeout3: any;

    public variables: FieldRules = new FieldRules();

    public overviewForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<string>('', Validators.required),
    });

    public schemaFilterType: number = 1;
    public properties: Map<string, string>;

    public get zoom(): number {
        if (this.tree) {
            return Math.round(this.tree.zoom * 100);
        } else {
            return 100;
        }
    }

    public get rulesCount(): number {
        return this.variables.variables.length;
    }

    public get testSummary(): { pass: number, fail: number, error: number, none: number } {
        const summary = { pass: 0, fail: 0, error: 0, none: 0 };
        for (const variable of this.variables.variables) {
            switch (this.testResults.get(this.key(variable))) {
                case FieldRuleResult.Success: summary.pass++; break;
                case FieldRuleResult.Failure: summary.fail++; break;
                case FieldRuleResult.Error: summary.error++; break;
                case FieldRuleResult.None: summary.none++; break;
            }
        }
        return summary;
    }

    public get showPolicyVersion(): boolean {
        const status = this.policy?.status;
        return !!this.policy?.version && (status === PolicyStatus.PUBLISH || status === PolicyStatus.DISCONTINUED);
    }

    public get roots(): SchemaNode[] {
        return this.source?.roots;
    }

    public codeMirrorOptions: any = {
        theme: 'default',
        mode: 'formula-lang',
        styleActiveLine: false,
        lineNumbers: false,
        lineWrapping: false,
        foldGutter: true,
        gutters: [
            'CodeMirror-lint-markers'
        ],
        autoCloseBrackets: true,
        matchBrackets: true,
        lint: true,
        readOnly: false,
        viewportMargin: Infinity,
        variables: [],
        extraKeys: { "Ctrl-Space": "autocomplete" },
        scrollbarStyle: null,
        singleLine: true
    };

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private schemaRulesService: SchemaRulesService,
        private ipfs: IPFSService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
        this.subscription.add(
            this.overviewForm.valueChanges.subscribe(() => {
                if (this.overviewForm.dirty) {
                    this.dirty = true;
                }
            })
        );
        this.subscription.add(
            this.test$.pipe(debounceTime(150)).subscribe(() => this.runTest())
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
        this.ruleId = this.route.snapshot.params['ruleId'];
        this.loading = true;
        forkJoin([
            this.schemaRulesService.getRule(this.ruleId),
            this.schemaRulesService.getRelationships(this.ruleId),
            this.schemaService.properties()
        ]).subscribe(([item, relationships, properties]) => {
            this.item = item;
            this.readonly = !this.user.SCHEMAS_RULE_CREATE || this.item?.status === EntityStatus.ACTIVE;
            if (relationships) {
                this.updateTree(relationships, properties);
            }
            this.updateForm(item);
            if (!this.viewInitialized) {
                this.viewInitialized = true;
                this.view = this.variables.variables.length ? 'rules' : 'schemas';
            }
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    private updateTree(relationships: any, properties: any[]) {
        this.policy = relationships.policy || {};
        this.nodes = [];
        this.properties = new Map<string, string>();
        if (properties) {
            for (const property of properties) {
                this.properties.set(property.title, property.value);
            }
        }
        const schemas = relationships.schemas || [];
        this.schemas = [];
        for (const schema of schemas) {
            try {
                const item = new Schema(schema);
                const node = SchemaNode.from(item, this.properties);
                for (const field of item.fields) {
                    if (field.isRef && field.type) {
                        node.addId(field.type)
                    }
                }
                this.nodes.push(node);
                this.schemas.push(item)
            } catch (error) {
                console.log(error);
            }
        }

        this.selectedNode = null;
        this.rootNode = null;
        this.source = new TreeSource(this.nodes);
        if (this.tree) {
            this.tree.setData(this.source);
        }

        this.updateFieldMap();
    }

    private updateFieldMap() {
        this.enumMap = new Map<string, Map<string, EnumValue>>();
        for (const schema of this.schemas) {
            const map = new Map<string, EnumValue>();
            this.enumMap.set(schema.iri || '', map);
            this.getFieldList(schema.fields, map);
        }
    }

    private getFieldList(fields: SchemaField[], map: Map<string, EnumValue>) {
        for (const field of fields) {
            if (field.enum || field.remoteLink) {
                map.set(field.path || '', new EnumValue(this.ipfs, field));
            }
            if (Array.isArray(field.fields)) {
                this.getFieldList(field.fields, map);
            }
        }
    }

    private updateForm(item: ISchemaRules) {
        this.overviewForm.setValue({
            name: item.name || '',
            description: item.description || '',
            policy: this.policy?.name || '',
        });
        this.overviewForm.markAsPristine();
        this.dirty = false;

        const config = item.config;
        this.variables.fromData(config?.fields);
        this.variables.updateType(this.schemas);
        this.updateCodeMirror();

        const map1 = this.variables.getMap();
        for (const root of this.source.roots) {
            const map2 = map1.get(root.data.iri);
            if (map2) {
                const rootView = root.fields;
                const data = rootView.data;
                for (const field of data.list) {
                    const path = field.path.map((e) => e.data.name).join('.');
                    field.selected = map2.has(path);
                }
                rootView.updateHidden();
                rootView.updateSelected();
            }
        }
        this.rebuildTest();
    }

    public onBack() {
        this.router.navigate(['/schema-rules']);
    }

    public initTree($event: TreeGraphComponent) {
        this.tree = $event;
        if (this.nodes) {
            this.tree.setData(this.source);
        }
    }

    public createNodes($event: any) {
        this.tree.move(18, 46);
    }

    public onSelectNode(node: TreeNode<SchemaData> | null) {
        clearTimeout(this._selectTimeout1);
        clearTimeout(this._selectTimeout2);
        clearTimeout(this._selectTimeout3);
        this.nodeLoading = true;
        this.selectedNode = node as SchemaNode;
        this._selectTimeout1 = setTimeout(() => {
            this._updateSelectNode();
        }, 350)
    }

    private _updateSelectNode() {
        this.rootNode = (this.selectedNode?.getRoot() || null) as SchemaNode;
        if (this.rootNode) {
            const schemaId = this.selectedNode?.data?.iri;
            const rootView = this.rootNode.fields;
            rootView.collapseAll(true);
            rootView.highlightAll(false);
            const items = rootView.find((item) => item.type === schemaId);
            for (const item of items) {
                rootView.collapsePath(item, false);
                rootView.highlight(item, true);
            }
            rootView.searchItems(this.searchField, this.schemaFilterType);
            rootView.updateHidden();
            rootView.updateSelected();
            this._selectTimeout2 = setTimeout(() => {
                this._updateSelectScroll();
            }, 200)
        }
    }

    private _updateSelectScroll() {
        const first = (document as any)
            .querySelector('.field-item[highlighted="true"]:not([search-highlighted="hidden"])');
        if (this.fieldTree) {
            if (first) {
                this.fieldTree.nativeElement.scrollTop = first.offsetTop;
            } else {
                this.fieldTree.nativeElement.scrollTop = 0;
            }
        }
        this._selectTimeout3 = setTimeout(() => {
            this.nodeLoading = false;
        }, 200)
    }

    public onCollapseField(field: TreeListItem<any>) {
        if (this.rootNode) {
            const rootView = this.rootNode.fields;
            rootView.collapse(field, !field.collapsed);
            rootView.updateHidden();
        }
    }

    public onSelectField(field: TreeListItem<any>) {
        if (field.expandable) {
            this.onCollapseField(field);
            return;
        }
        if (this.readonly) {
            return;
        }
        field.selected = !field.selected;
        this.dirty = true;
        if (this.rootNode) {
            const rootView = this.rootNode.fields;
            rootView.updateHidden();
            rootView.updateSelected();
        }
        this.updateVariables();
    }

    public onSchemaFilter(type: number) {
        clearTimeout(this._selectTimeout3);
        this.nodeLoading = true;
        if (this.source) {
            let highlighted: any;

            const roots = this.source.roots;
            for (const root of roots) {
                root.fields.searchItems(this.searchField, this.schemaFilterType);
            }

            for (const node of this.source.nodes) {
                node.fields.searchView(this.searchField);
                if (!highlighted && node.fields.searchHighlighted) {
                    highlighted = node;
                }
            }

            if (this.rootNode) {
                const rootView = this.rootNode.fields;
                rootView.updateHidden();
            }

            if (type === 1 && highlighted) {
                this.onNavTarget(highlighted);
            }
        }
        this._selectTimeout3 = setTimeout(() => {
            this.nodeLoading = false;
        }, 250)
    }

    public onNavTarget(highlighted: SchemaNode) {
        const el = document.querySelector(`.tree-node[node-id="${highlighted.uuid}"]`);
        const grid = el?.parentElement?.parentElement;
        if (el && grid) {
            const elCoord = el.getBoundingClientRect();
            const gridCoord = grid.getBoundingClientRect();
            const x = elCoord.left - gridCoord.left;
            const y = elCoord.top - gridCoord.top;
            this.tree?.move(-x + 50, -y + 56);
        }
    }

    public onNavRoot(root: SchemaNode) {
        const el = document.querySelector(`.tree-node[node-id="${root.uuid}"]`);
        const grid = el?.parentElement?.parentElement;
        if (el && grid) {
            const elCoord = el.getBoundingClientRect();
            const gridCoord = grid.getBoundingClientRect();
            const x = elCoord.left - gridCoord.left;
            this.tree?.move(-x + 50, 56);
            this.tree.onSelectNode(root);
        }
    }

    public onNavNext(dir: number) {
        const el = this.treeTabs.nativeElement;
        const max = Math.floor((el.scrollWidth - el.offsetWidth) / 148);
        let current = Math.floor(this.treeTabs.nativeElement.scrollLeft / 148);
        if (dir < 0) {
            current--;
        } else {
            current++;
        }
        current = Math.min(Math.max(current, 0), max);
        this.treeTabs.nativeElement.scrollLeft = current * 148;
    }

    public onClearNode() {
        this.tree?.onSelectNode(null);
    }

    public onView(view: 'schemas' | 'rules') {
        if (this.view === view) {
            return;
        }
        this.view = view;
        if (view === 'schemas') {
            setTimeout(() => {
                this.tree?.move(18, 46);
                this.tree?.refresh();
            }, 0);
        }
    }

    public onZoom(d: number) {
        if (this.tree) {
            this.tree.onZoom(d);
            if (d === 0) {
                this.tree.move(18, 46);
            }
        }
    }

    public schemaConfigChange(index: string | number | undefined) {
        const tabIndex = typeof index === 'number' ? index : 0;
        if (tabIndex === 1) {
            this.schemaFilterType = 2;
        } else {
            this.schemaFilterType = 1;
        }
        this.onSchemaFilter(0);
    }

    private updateCodeMirror() {
        const variables = this.variables.getNames();
        this.codeMirrorOptions = {
            ...this.codeMirrorOptions,
            variables: variables,
            hintOptions: {
                hint: createAutocomplete(variables)
            }
        }
    }

    private updateVariables() {
        this.variables.fromNodes(this.source.roots);
        this.variables.updateType(this.schemas);
        this.updateCodeMirror();
        this.rebuildTest();
    }

    public getRelationshipsName(id: string) {
        const variable = this.variables.get(id);
        if (variable) {
            return `${variable.id} - ${variable.fieldDescription}`;
        } else {
            return id;
        }
    }

    private getEnum(variable: FieldRule): EnumValue | undefined {
        const map = this.enumMap.get(variable.schemaId);
        if (map) {
            return map.get(variable.path);
        }
        return undefined;
    }

    private getEnums(): { [x: string]: EnumValue } {
        const enums: { [x: string]: EnumValue } = {};
        for (const variable of this.variables.variables) {
            const item = this.getEnum(variable);
            if (item) {
                enums[variable.id] = item;
            } else {
                enums[variable.id] = new EnumValue(this.ipfs);
            }
        }
        return enums;
    }

    private save$(): Observable<any> {
        const value = this.overviewForm.value;
        const config: ISchemaRulesConfig = {
            fields: this.variables.getJson()
        };
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        return this.schemaRulesService.updateRule(item);
    }

    public onSave() {
        this.loading = true;
        this.save$().subscribe((item) => {
            this.item = item;
            this.updateForm(item);
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    public onChangeStatus(active: boolean) {
        if (!this.user.SCHEMAS_RULE_CREATE) {
            return;
        }
        this.loading = true;
        const save$ = active && this.dirty ? this.save$() : of(this.item);
        save$.pipe(
            switchMap((item) => this.schemaRulesService.activateRule(item, active))
        ).subscribe(() => {
            this.loadData();
        }, (e) => {
            this.loading = false;
        });
    }

    public formatPath(path: string): string {
        return (path || '').split(' / ').join(' › ');
    }

    public key(variable: FieldRule): string {
        return `${variable.schemaId}|${variable.path}`;
    }

    public onToggleTest() {
        if (this.view === 'schemas') {
            this.onView('rules');
            this.testOpen = true;
        } else {
            this.testOpen = !this.testOpen;
        }
        this.rebuildTest();
    }

    public onTestValue(variable: FieldRule, value: string | null) {
        const key = this.key(variable);
        if (value === null || value === undefined || value === '') {
            this.testValues.delete(key);
        } else {
            this.testValues.set(key, String(value));
        }
        this.test$.next();
    }

    public onTestIdChange() {
        this.dirty = true;
        this.rebuildTest();
    }

    public onClearTest() {
        this.testValues.clear();
        this.testResults.clear();
    }

    public getTestEnum(variable: FieldRule): EnumValue | null {
        return this.getEnum(variable) || null;
    }

    public getTestOptions(variable: FieldRule): any[] {
        const value = this.getTestEnum(variable);
        if (!value) {
            return [];
        }
        let cache = this.testOptions.get(value);
        if (!cache || cache.items !== value.items) {
            cache = { items: value.items, options: [{ label: '', value: '' }, ...(value.items || [])] };
            this.testOptions.set(value, cache);
        }
        return cache.options;
    }

    private rebuildTest() {
        if (!this.testOpen) {
            return;
        }
        this.validators = new DocumentFieldValidators(this.variables.getJson());
        const keys = new Set(this.variables.variables.map((v) => this.key(v)));
        for (const key of Array.from(this.testValues.keys())) {
            if (!keys.has(key)) {
                this.testValues.delete(key);
            }
        }
        this.runTest();
    }

    private runTest() {
        this.testResults.clear();
        if (!this.testOpen || !this.validators || !this.testValues.size) {
            return;
        }
        const document: any = {};
        for (const variable of this.variables.variables) {
            document[variable.id] = this.testValues.get(this.key(variable)) ?? null;
        }
        const result = this.validators.validate(document);
        for (const variable of this.variables.variables) {
            this.testResults.set(this.key(variable), result[variable.id]);
        }
    }

    public onEditRule(variable: FieldRule) {
        const dialogRef = this.dialogService.open(SchemaRuleConfigDialog, {
            showHeader: false,
            header: 'Preview',
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                variables: this.variables.getOptions(),
                item: variable.clone(),
                readonly: this.readonly,
                enums: this.getEnums()
            }
        })!;
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                const rule: FormulaRule | ConditionRule | RangeRule = result.rule;
                variable.addRule(rule);
                this.dirty = true;
                this.rebuildTest();
            }
        });
    }

    public onDeleteVariable(variable: FieldRule) {
        if (this.readonly) {
            return;
        }
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete score',
                text: 'Are you sure want to delete field?',
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
                this.variables.delete(variable);
                this.updateCodeMirror();
                this.dirty = true;
                this.rebuildTest();
            }
        });
    }
}