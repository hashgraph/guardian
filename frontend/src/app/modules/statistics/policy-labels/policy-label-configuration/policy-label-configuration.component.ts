import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, GenerateUUIDv4, IPolicyLabel, IPolicyLabelConfig, IRulesItemConfig, IStatisticItemConfig, NavItemType, Schema, SchemaField, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subject, Subscription } from 'rxjs';
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
import { CustomCustomDialogComponent } from '../../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IPFSService } from 'src/app/services/ipfs.service';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';
import { TreeDragDropService } from 'primeng/api';
import { NavItem, NavMenu, NavTree } from './nav-item';
import { SchemaFormulas } from '../../../common/models/schema-formulas';
import { SchemaVariable, SchemaVariables } from '../../../common/models/schema-variables';
import { SchemaScore, SchemaScores } from '../../../common/models/schema-scores';
import { ScoreDialog } from '../../policy-statistics/dialogs/score-dialog/score-dialog.component';
import { EnumValue } from '../../schema-rules/dialogs/schema-rule-config-dialog/schema-rule-config-dialog.component';
import { SearchLabelDialog } from '../dialogs/search-label-dialog/search-label-dialog.component';

class LabelConfig {
    public show: boolean = false;
    public readonly: boolean = false;
    public stepper = [true, false, false];
    public policy: any;

    public readonly step = new Subject<number>();

    constructor(
        private dialogService: DialogService,
        private dragDropService: TreeDragDropService,
    ) {
    }

    public overviewForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<string>('', Validators.required),
    });

    public menu = new NavMenu();

    public selectedNavItem: NavItem | null = null;
    public draggedMenuItem: NavItem | null = null;
    public navigationTree: NavTree = new NavTree();

    public setData(item: IPolicyLabel) {
        this.overviewForm.setValue({
            name: item.name || '',
            description: item.description || '',
            policy: this.policy?.name || '',
        });

        this.menu = NavMenu.from(item);
        this.navigationTree = NavTree.from(item);
        this.navigationTree.update();
    }

    public setPolicy(relationships: any) {
        this.policy = relationships?.policy || {};
    }

    public isActionStep(index: number): boolean {
        return this.stepper[index];
    }

    public async goToStep(index: number) {
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = (i == index);
        }
        return this.refreshView();
    }

    public async refreshView() {
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 400);
        });
    }

    public onStep(index: number) {
        this.step.next(index);
    }

    public dragMenuStart(item: NavItem) {
        this.draggedMenuItem = item.clone();
        this.draggedMenuItem.setId(GenerateUUIDv4())
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

    public onDrop() {
        if (this.draggedMenuItem) {
            this.navigationTree.add(this.draggedMenuItem);
            this.navigationTree.update();
            this.draggedMenuItem = null;
        }
    }

    public onDropValidator($event: any) {
        if ($event.dropNode.freezed) {
            return;
        }
        $event.accept();
        this.navigationTree.update();
    }

    public onClearNavItem() {
        this.selectedNavItem = null;
    }

    public onNavItemSelect(node: NavItem) {
        this.selectedNavItem = node;
    }

    public ifNavSelected(node: NavItem) {
        if (this.selectedNavItem) {
            return this.selectedNavItem.key === node.key;
        }
        return false;
    }

    public onDeleteNavItem(node: NavItem) {
        const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
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
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.selectedNavItem = null;
                this.navigationTree.delete(node);
                this.navigationTree.update();
            }
        });
    }

    public toJson(): IPolicyLabelConfig {
        const imports = this.menu.toJson();
        const children = this.navigationTree.toJson();
        const json: IPolicyLabelConfig = {
            imports,
            children
        }
        return json;
    }
}

class RulesConfig {
    public show: boolean = false;
    public readonly: boolean = false;
    public stepper = [true, false];

    public searchField: string = '';
    public nodeLoading: boolean = true;
    public selectedNode: SchemaNode | null = null;
    public rootNode: SchemaNode | null = null;
    public schemaFilterType: number = 1;
    public schemas: Schema[];
    public policy: any;

    public formulas: SchemaFormulas = new SchemaFormulas();
    public variables: SchemaVariables = new SchemaVariables();
    public scores: SchemaScores = new SchemaScores();

    private _selectTimeout1: any;
    private _selectTimeout2: any;
    private _selectTimeout3: any;

    private tree: TreeGraphComponent;
    private currentNode: NavItem;

    private nodes: SchemaNode[];
    private enumMap: Map<string, Map<string, EnumValue>>;
    private source: TreeSource<SchemaNode>;
    private properties: Map<string, string>;

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

    public formulaTypes: any[] = [{
        label: 'String',
        value: 'string'
    }, {
        label: 'Number',
        value: 'number'
    }];

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

    public readonly step = new Subject<number>();

    constructor(
        private parent: PolicyLabelConfigurationComponent,
        private dialogService: DialogService,
        private ipfs: IPFSService,
    ) {
    }

    public setProperties(properties: any[]) {
        this.properties = new Map<string, string>();
        if (properties) {
            for (const property of properties) {
                this.properties.set(property.title, property.value);
            }
        }
    }

    public setPolicy(relationships: any) {
        this.policy = relationships?.policy || {};
    }

    public setSchemas(relationships: any) {
        const schemas = relationships.schemas || [];

        this.nodes = [];
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

    public setData(node: NavItem) {
        this.currentNode = node;

        const item = node.config as (IRulesItemConfig | IStatisticItemConfig);
        const config = item.config;

        this.variables.fromData(config?.variables);
        this.formulas.fromData(config?.formulas);
        this.scores.fromData(config?.scores);
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

    public initTree($event: TreeGraphComponent) {
        this.tree = $event;
        if (this.nodes) {
            this.tree.setData(this.source);
        }
    }

    private getEnum(variable: SchemaVariable): EnumValue | undefined {
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

    public isActionStep(index: number): boolean {
        return this.stepper[index];
    }

    public async goToStep(index: number) {
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = (i == index);
        }
        return this.refreshView();
    }

    public async refreshView() {
        return new Promise<void>((resolve, reject) => {
            if (this.stepper[0]) {
                setTimeout(() => {
                    this.tree?.move(18, 46);
                    setTimeout(() => {
                        this.tree?.refresh();
                        resolve();
                    }, 1500);
                }, 100);
            } else {
                setTimeout(() => {
                    resolve();
                }, 400);
            }
        });
    }

    public onStep(index: number) {
        this.step.next(index);
    }

    public schemaConfigChange($event: any) {
        if ($event.index === 1) {
            this.schemaFilterType = 2;
        } else {
            this.schemaFilterType = 1;
        }
        this.onSchemaFilter(0);
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
        if (this.parent.fieldTree) {
            if (first) {
                this.parent.fieldTree.nativeElement.scrollTop = first.offsetTop;
            } else {
                this.parent.fieldTree.nativeElement.scrollTop = 0;
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
        const el = this.parent.treeTabs.nativeElement;
        const max = Math.floor((el.scrollWidth - el.offsetWidth) / 148);
        let current = Math.floor(this.parent.treeTabs.nativeElement.scrollLeft / 148);
        if (dir < 0) {
            current--;
        } else {
            current++;
        }
        current = Math.min(Math.max(current, 0), max);
        this.parent.treeTabs.nativeElement.scrollLeft = current * 148;
    }

    public onClearNode() {
        this.tree?.onSelectNode(null);
    }

    public onZoom(d: number) {
        if (this.tree) {
            this.tree.onZoom(d);
            if (d === 0) {
                this.tree.move(18, 46);
            }
        }
    }

    private updateVariables() {
        this.variables.fromNodes(this.source.roots);
        this.variables.updateType(this.schemas);
        this.updateCodeMirror();
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

    public getRelationshipsName(id: string) {
        const variable = this.variables.get(id);
        if (variable) {
            return `${variable.id} - ${variable.fieldDescription}`;
        } else {
            return id;
        }
    }

    public onAddScore() {
        this.scores.add();
        this.updateCodeMirror();
    }

    public onEditScore(score: SchemaScore) {
        const dialogRef = this.dialogService.open(ScoreDialog, {
            showHeader: false,
            header: 'Create New',
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                score: JSON.parse(JSON.stringify(score))
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                score.description = result.description;
                score.options = result.options;
            }
        });
    }

    public onDeleteScore(score: SchemaScore) {
        const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete score',
                text: 'Are you sure want to delete score?',
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
                this.scores.delete(score);
                this.updateCodeMirror();
            }
        });
    }

    public onAddVariable() {
        this.formulas.add();
    }

    public onDeleteVariable(formula: any) {
        const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete formula',
                text: 'Are you sure want to delete formula?',
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
                this.formulas.delete(formula);
            }
        });
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
    public readonly: boolean = false;

    private subscription = new Subscription();

    public readonly labelConfig: LabelConfig;
    public readonly rulesConfig: RulesConfig;

    @ViewChild('fieldTree', { static: false }) fieldTree: ElementRef;
    @ViewChild('treeTabs', { static: false }) treeTabs: ElementRef;

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyLabelsService: PolicyLabelsService,
        private router: Router,
        private route: ActivatedRoute,
        private ipfs: IPFSService,
        private dialogService: DialogService,
        private dragDropService: TreeDragDropService
    ) {
        this.labelConfig = new LabelConfig(dialogService, dragDropService);
        this.rulesConfig = new RulesConfig(this, dialogService, ipfs);
    }

    ngOnInit() {
        this.subscription.add(
            this.route.params.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                const index = queryParams.tab || 0;
                this.labelConfig.goToStep(index).then();
            })
        );
        this.subscription.add(
            this.labelConfig.step.subscribe((index) => {
                this.loading = true;
                this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: {
                        tab: String(index),
                    },
                    queryParamsHandling: 'merge',
                });
                setTimeout(() => {
                    this.labelConfig.goToStep(index).then(() => {
                        this.loading = false;
                    })
                }, 100);
            })
        );
        this.subscription.add(
            this.rulesConfig.step.subscribe((index) => {
                this.loading = true;
                setTimeout(() => {
                    this.rulesConfig.goToStep(index).then(() => {
                        this.loading = false;
                    })
                }, 100);
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
            this.schemaService.properties(),
            this.policyLabelsService.getLabel(this.labelId),
            this.policyLabelsService.getRelationships(this.labelId),
        ]).subscribe(([properties, item, relationships]) => {
            this.item = item;
            this.readonly = this.item?.status === EntityStatus.ACTIVE;
            this.policy = relationships?.policy || {};

            this.rulesConfig.setPolicy(relationships);
            this.rulesConfig.setProperties(properties);
            this.rulesConfig.setSchemas(relationships);

            this.labelConfig.setPolicy(relationships);
            this.labelConfig.setData(this.item);
            this.labelConfig.show = true;

            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    public onBack() {
        this.router.navigate(['/policy-labels']);
    }

    public onSave() {
        this.loading = true;
        const value = this.labelConfig.overviewForm.value;
        const config: IPolicyLabelConfig = this.labelConfig.toJson();
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
                this.labelConfig.setData(this.item);
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    // public onPreview() {
    //     const value = this.overviewForm.value;
    //     const config: IPolicyLabelConfig = {
    //         fields: this.variables.getJson(),
    //     };
    //     const item = {
    //         ...this.item,
    //         name: value.name,
    //         description: value.description,
    //         config
    //     };
    //     const dialogRef = this.dialogService.open(PolicyLabelPreviewDialog, {
    //         showHeader: false,
    //         header: 'Preview',
    //         width: '800px',
    //         styleClass: 'guardian-dialog',
    //         data: {
    //             item
    //         }
    //     });
    //     dialogRef.onClose.subscribe(async (result) => { });
    // }

    public onImport() {
        const dialogRef = this.dialogService.open(SearchLabelDialog, {
            showHeader: false,
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {},
        });
        dialogRef.onClose.subscribe((result: any[]) => {
            if (result) {
                for (const item of result) {
                    if (item._type === 'label') {
                        this.labelConfig.menu.addLabel(item)
                    }
                    if (item._type === 'statistic') {
                        this.labelConfig.menu.addStatistic(item)
                    }
                }
            }
        });
    }

    public onDeleteImport(item: NavItem) {
        this.labelConfig.menu.delete(item);
    }

    public onEditNavItem(node: NavItem) {
        this.loading = true;
        this.rulesConfig.show = true;
        this.rulesConfig.setData(node);
        setTimeout(() => {
            this.rulesConfig.goToStep(0).then(() => {
                this.loading = false;
            })
        }, 100);
    }

    public onCancelNavItem() {
        this.loading = true;
        this.rulesConfig.show = false;
        setTimeout(() => {
            this.labelConfig.goToStep(2).then(() => {
                this.loading = false;
            })
        }, 100);
    }

    public onSaveNavItem() {
        this.loading = true;
        this.rulesConfig.show = false;
        setTimeout(() => {
            this.labelConfig.goToStep(2).then(() => {
                this.loading = false;
            })
        }, 100);
    }
}