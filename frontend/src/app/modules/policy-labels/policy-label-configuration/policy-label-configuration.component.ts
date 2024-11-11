import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, GenerateUUIDv4, IPolicyLabel, IPolicyLabelConfig, Schema, SchemaField, UserPermissions } from '@guardian/interfaces';
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
import { ConditionRule, FieldRule, FieldRules, FormulaRule, RangeRule } from '../../common/models/field-rule';
import { EnumValue, SchemaRuleConfigDialog } from '../dialogs/schema-rule-config-dialog/schema-rule-config-dialog.component';
import { CustomCustomDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyLabelPreviewDialog } from '../dialogs/policy-label-preview-dialog/policy-label-preview-dialog.component';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';
import { TreeDragDropService, TreeNode as PTreeNode } from 'primeng/api';

const NavIcons: { [type: string]: string } = {
    'group': 'file',
    'label': 'file',
    'statistic': 'file'
}

class NavItem implements PTreeNode {
    public key?: string | undefined;
    public data?: any;
    public type?: string | undefined;
    public icon?: string | undefined;
    public label: string;
    public children?: NavItem[] | undefined;
    public parent?: NavItem | undefined;
    public itemType: string;
    public itemIcon: string;

    constructor(itemType: string, label: string, data?: any) {
        this.key = GenerateUUIDv4();
        this.label = label;
        this.data = data;
        this.itemType = itemType;
        this.itemIcon = NavIcons[itemType];
        this.type = 'default';
    }

    public clone(): NavItem {
        return new NavItem(this.itemType, this.label, this.data);
    }
}

class RootNavItem implements PTreeNode {
    public key?: string | undefined;
    public data?: any;
    public type?: string | undefined;
    public icon?: string | undefined;
    public label: string;
    public children?: NavItem[] | undefined;
    public parent?: NavItem | undefined;
    public itemType: string;
    public itemIcon: string;
    public draggable?: boolean | undefined = false;

    constructor(itemType: string, label: string, data?: any) {
        this.key = GenerateUUIDv4();
        this.label = label;
        this.data = data;
        this.itemType = itemType;
        this.itemIcon = NavIcons[itemType];
        this.type = 'root';
    }

    public clone(): RootNavItem {
        return new RootNavItem(this.itemType, this.label, this.data);
    }
}


@Component({
    selector: 'app-policy-label-configuration',
    templateUrl: './policy-label-configuration.component.html',
    styleUrls: ['./policy-label-configuration.component.scss'],
})
export class PolicyLabelConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    public labelId: string;
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

    public menuItems = [{
        title: 'General',
        items: [
            new NavItem('group', 'Group'),
            new NavItem('group', 'Group'),
        ]
    }, {
        title: 'Statistics',
        items: [
            new NavItem('group', 'Group'),
            new NavItem('group', 'Group'),
        ]
    }, {
        title: 'Labels',
        items: [
            new NavItem('group', 'Group'),
            new NavItem('group', 'Group'),
        ]
    }];
    private draggedMenuItem: any = null;

    public navigationTree: NavItem[] = [
        new RootNavItem('group', 'Group'),
    ];

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyLabelsService: PolicyLabelsService,
        private ipfs: IPFSService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute,
        private dragDropService: TreeDragDropService,
    ) {
        this.menuItems.slice = function (start?: number | undefined, end?: number | undefined) { return this };
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
        this.labelId = this.route.snapshot.params['labelId'];
        this.loading = true;
        forkJoin([
            this.policyLabelsService.getLabel(this.labelId),
            this.policyLabelsService.getRelationships(this.labelId),
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

    private updateForm(item: IPolicyLabel) {
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
                this.stepper[i] = i == index;
            }
            if (index === 4) {
                this.tree?.move(18, 46);
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

    public onSave() {
        this.loading = true;
        const value = this.overviewForm.value;
        const config: IPolicyLabelConfig = {
            fields: this.variables.getJson()
        };
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        this.policyLabelsService
            .updateLabel(item)
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
        const config: IPolicyLabelConfig = {
            fields: this.variables.getJson(),
        };
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        const dialogRef = this.dialogService.open(PolicyLabelPreviewDialog, {
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

    public dragMenuStart(item: NavItem) {
        this.draggedMenuItem = item.clone();
        this.dragDropService.startDrag({
            tree: null,
            node: this.draggedMenuItem,
            subNodes: [this.draggedMenuItem],
            index: 0,
            scope: "navigationTree"
        })
    }

    public dragMenuEnd() {
        this.draggedMenuItem = null;
    }

    public drop() {
        if (this.draggedMenuItem) {
            this.draggedMenuItem = null;
        }
    }

    public onDropValidator($event: any) {
        if ($event.dropNode?.type === 'root') {
            if ($event.originalEvent.target.tagName === 'LI') {
                return;
            }
        }
        debugger;
        $event.accept()
    }
}