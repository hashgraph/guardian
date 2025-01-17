import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, IStatistic, Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TreeGraphComponent } from '../../common/tree-graph/tree-graph.component';
import { TreeNode } from '../../common/tree-graph/tree-node';
import { TreeListItem } from '../../common/tree-graph/tree-list';
import { SchemaData, SchemaNode } from '../../common/models/schema-node';
import { SchemaVariables } from "../../common/models/schema-variables";
import { SchemaFormulas } from "../../common/models/schema-formulas";
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SchemaService } from 'src/app/services/schema.service';
import { TreeSource } from '../../common/tree-graph/tree-source';
import { createAutocomplete } from '../../common/models/lang-modes/autocomplete';
import { SchemaScore, SchemaScores } from '../../common/models/schema-scores';
import { DialogService } from 'primeng/dynamicdialog';
import { ScoreDialog } from '../dialogs/score-dialog/score-dialog.component';
import { SchemaRule, SchemaRules } from '../../common/models/schema-rules';
import { StatisticPreviewDialog } from '../dialogs/statistic-preview-dialog/statistic-preview-dialog.component';
import { CustomCustomDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';


@Component({
    selector: 'app-statistic-definition-configuration',
    templateUrl: './statistic-definition-configuration.component.html',
    styleUrls: ['./statistic-definition-configuration.component.scss'],
})
export class StatisticDefinitionConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    public definitionId: string;
    public item: IStatistic | undefined;
    public policy: any;
    public schemas: Schema[];

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

    public formulas: SchemaFormulas = new SchemaFormulas();
    public variables: SchemaVariables = new SchemaVariables();
    public scores: SchemaScores = new SchemaScores();
    public rules: SchemaRules = new SchemaRules();

    public overviewForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<string>('', Validators.required),
    });

    public schemaFilterType: number = 1;

    // public methods: any[] = [{
    //     label: 'Manually',
    //     value: 'manually'
    // }, {
    //     label: 'By Event',
    //     value: 'byEvent'
    // }, {
    //     label: 'Every Day',
    //     value: 'everyDay'
    // }, {
    //     label: 'Every Week',
    //     value: 'everyWeek'
    // }, {
    //     label: 'Every Month',
    //     value: 'everyMonth'
    // }, {
    //     label: 'Every Year',
    //     value: 'everyYear'
    // }];

    public formulaTypes: any[] = [{
        label: 'String',
        value: 'string'
    }, {
        label: 'Number',
        value: 'number'
    }];

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

    public get rule(): SchemaRule | undefined {
        if (this.rootNode) {
            return this.rules.get(this.rootNode.id);
        } else {
            return undefined
        }
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
        private policyStatisticsService: PolicyStatisticsService,
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
        this.definitionId = this.route.snapshot.params['definitionId'];
        this.loading = true;
        forkJoin([
            this.policyStatisticsService.getDefinition(this.definitionId),
            this.policyStatisticsService.getRelationships(this.definitionId),
            this.schemaService.properties()
        ]).subscribe(([item, relationships, properties]) => {
            this.item = item;
            this.readonly = this.item?.status === EntityStatus.PUBLISHED;
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
    }

    private updateForm(item: IStatistic) {
        this.overviewForm.setValue({
            name: item.name || '',
            description: item.description || '',
            policy: this.policy?.name || '',
            // method: item.description,
        });

        const config = item.config;
        this.variables.fromData(config?.variables);
        this.formulas.fromData(config?.formulas);
        this.scores.fromData(config?.scores);
        this.rules.fromData(config?.rules)
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
        for (const root of this.source.roots) {
            this.rules.add(root.data.iri);
        }
    }

    public onBack() {
        this.router.navigate(['/policy-statistics']);
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
        const scores = this.scores.getNames();
        const all = [...variables, ...scores];
        this.codeMirrorOptions = {
            ...this.codeMirrorOptions,
            variables: all,
            hintOptions: {
                hint: createAutocomplete(all)
            }
        }
    }

    private updateVariables() {
        this.variables.fromNodes(this.source.roots);
        this.variables.updateType(this.schemas);
        this.updateCodeMirror();
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

    public onAddScore() {
        this.scores.add();
        this.updateCodeMirror();
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

    public getRelationshipsName(id: string) {
        const variable = this.variables.get(id);
        if (variable) {
            return `${variable.id} - ${variable.fieldDescription}`;
        } else {
            return id;
        }
    }

    public onSave() {
        this.loading = true;
        // this.rules.update(this.variables);
        const value = this.overviewForm.value;
        const config = {
            variables: this.variables.getJson(),
            formulas: this.formulas.getJson(),
            scores: this.scores.getJson(),
            rules: this.rules.getJson(),
        };
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            // method: value.method,
            config
        };
        this.policyStatisticsService
            .updateDefinition(item)
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
        // this.rules.update(this.variables);
        const value = this.overviewForm.value;
        const config = {
            variables: this.variables.getJson(),
            formulas: this.formulas.getJson(),
            scores: this.scores.getJson(),
            rules: this.rules.getJson(),
        };
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        const dialogRef = this.dialogService.open(StatisticPreviewDialog, {
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
}