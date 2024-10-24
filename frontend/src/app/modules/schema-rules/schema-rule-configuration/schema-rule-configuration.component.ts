import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, ISchemaRules, ISchemaRulesConfig, Schema, SchemaField, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { TreeGraphComponent } from '../../common/tree-graph/tree-graph.component';
import { TreeNode } from '../../common/tree-graph/tree-node';
import { TreeListItem } from '../../common/tree-graph/tree-list';
import { SchemaData, SchemaNode } from '../../common/models/schema-node';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SchemaService } from 'src/app/services/schema.service';
import { TreeSource } from '../../common/tree-graph/tree-source';
import { createAutocomplete } from '../../common/models/lang-modes/autocomplete';
import { DialogService } from 'primeng/dynamicdialog';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaRulesPreviewDialog } from '../dialogs/schema-rules-preview-dialog/schema-rules-preview-dialog.component';
import { ConditionRule, FieldRule, FieldRules, FormulaRule, RangeRule } from '../../common/models/field-rule';
import { SchemaRuleConfigDialog } from '../dialogs/schema-rule-config-dialog/schema-rule-config-dialog.component';
import { CustomCustomDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';

@Component({
    selector: 'app-schema-rule-configuration',
    templateUrl: './schema-rule-configuration.component.html',
    styleUrls: ['./schema-rule-configuration.component.scss'],
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
    public fieldMap: Map<string, Map<string, SchemaField>>;

    private subscription = new Subscription();
    private tree: TreeGraphComponent;
    private nodes: SchemaNode[];
    private source: TreeSource<SchemaNode>;

    public selectedNode: SchemaNode | null = null;
    public rootNode: SchemaNode | null = null;

    public nodeLoading: boolean = true;
    public searchField: string = '';

    public stepper = [true, false, false];

    public readonly: boolean = false;

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
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
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
            this.readonly = this.item?.status === EntityStatus.ACTIVE;
            if (relationships) {
                this.updateTree(relationships, properties);
            }
            this.updateForm(item);
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

        this.source = new TreeSource(this.nodes);
        if (this.tree) {
            this.tree.setData(this.source);
        }

        this.updateFieldMap();
    }

    private updateFieldMap() {
        this.fieldMap = new Map<string, Map<string, SchemaField>>();
        for (const schema of this.schemas) {
            const map = new Map<string, SchemaField>();
            this.fieldMap.set(schema.iri || '', map);
            this.getFieldList(schema.fields, map);
        }
    }

    private getFieldList(fields: SchemaField[], map: Map<string, SchemaField>) {
        for (const field of fields) {
            map.set(field.path || '', field);
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

    public onStep(index: number) {
        this.loading = true;
        setTimeout(() => {
            for (let i = 0; i < this.stepper.length; i++) {
                this.stepper[i] = false;
            }
            this.stepper[index] = true;
            this.tree?.move(18, 46);
            if (index === 1) {
                setTimeout(() => {
                    this.tree?.refresh();
                    this.loading = false;
                }, 1500);
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 400);
            }
        }, 200);
    }

    public onZoom(d: number) {
        if (this.tree) {
            this.tree.onZoom(d);
            if (d === 0) {
                this.tree.move(18, 46);
            }
        }
    }

    public schemaConfigChange($event: any) {
        if ($event.index === 1) {
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
    }

    public getRelationshipsName(id: string) {
        const variable = this.variables.get(id);
        if (variable) {
            return `${variable.id} - ${variable.fieldDescription}`;
        } else {
            return id;
        }
    }

    private getField(variable: FieldRule): SchemaField | undefined {
        const map = this.fieldMap.get(variable.schemaId);
        if (map) {
            return map.get(variable.path);
        }
        return undefined;
    }

    private getEnums(): { [x: string]: string[] } {
        const enums: { [x: string]: string[] } = {};
        for (const variable of this.variables.variables) {
            const field = this.getField(variable);
            if (field) {
                if (field.enum) {
                    enums[variable.id] = field.enum;
                }
            } else {
                enums[variable.id] = [];
            }
        }
        return enums;
    }

    public onSave() {
        this.loading = true;
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
        this.schemaRulesService
            .updateRule(item)
            .subscribe((item) => {
                this.item = item;
                this.updateForm(item);
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public onPreview() {
        const value = this.overviewForm.value;
        const config: ISchemaRulesConfig = {
            fields: this.variables.getJson(),
        };
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        const dialogRef = this.dialogService.open(SchemaRulesPreviewDialog, {
            showHeader: false,
            header: 'Preview',
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                item
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public onEditRule(variable: FieldRule) {
        const dialogRef = this.dialogService.open(SchemaRuleConfigDialog, {
            showHeader: false,
            header: 'Preview',
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                variables: this.variables.getOptions(),
                item: variable.clone(),
                readonly: this.readonly,
                enums: this.getEnums()
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                const rule: FormulaRule | ConditionRule | RangeRule = result.rule;
                variable.addRule(rule);
            }
        });
    }

    public onDeleteVariable(variable: FieldRule) {
        const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
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
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.variables.delete(variable);
                this.updateCodeMirror();
            }
        });
    }
}