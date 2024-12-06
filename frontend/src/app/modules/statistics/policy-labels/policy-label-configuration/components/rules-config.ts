import { Schema, SchemaField, IRulesItemConfig, IStatisticItemConfig } from "@guardian/interfaces";
import { DialogService } from "primeng/dynamicdialog";
import { Subject } from "rxjs";
import { CustomCustomDialogComponent } from "src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component";
import { FormulaRule, ConditionRule, RangeRule } from "src/app/modules/common/models/conditions";
import { createAutocomplete } from "src/app/modules/common/models/lang-modes/autocomplete";
import { SchemaFormulas, SchemaFormula } from "src/app/modules/common/models/schema-formulas";
import { SchemaNode, SchemaData } from "src/app/modules/common/models/schema-node";
import { SchemaScores, SchemaScore } from "src/app/modules/common/models/schema-scores";
import { SchemaVariables, SchemaVariable } from "src/app/modules/common/models/schema-variables";
import { TreeGraphComponent } from "src/app/modules/common/tree-graph/tree-graph.component";
import { TreeListItem } from "src/app/modules/common/tree-graph/tree-list";
import { TreeNode } from "src/app/modules/common/tree-graph/tree-node";
import { TreeSource } from "src/app/modules/common/tree-graph/tree-source";
import { IPFSService } from "src/app/services/ipfs.service";
import { ScoreDialog } from "../../../policy-statistics/dialogs/score-dialog/score-dialog.component";
import { EnumValue, SchemaRuleConfigDialog } from "../../../schema-rules/dialogs/schema-rule-config-dialog/schema-rule-config-dialog.component";
import { NavItem } from "./nav-item";
import { PolicyLabelConfigurationComponent } from "../policy-label-configuration.component";
import { LabelValidators } from "src/app/modules/common/models/label-validator";

export class RulesConfig {
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

    public name: string;
    public type: string;

    private _selectTimeout1: any;
    private _selectTimeout2: any;
    private _selectTimeout3: any;

    private tree: TreeGraphComponent;
    private currentNode: NavItem | null;

    private nodes: SchemaNode[];
    private enumMap: Map<string, Map<string, EnumValue>>;
    private source: TreeSource<SchemaNode>;
    private properties: Map<string, string>;
    private namespace: string[];

    private codeMirrorOptions: any = {
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
    private codeMirrorMap = new Map<string, any>();

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
        private ipfs: IPFSService
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
                        node.addId(field.type);
                    }
                }
                this.nodes.push(node);
                this.schemas.push(item);
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

    public setData(node: NavItem, label: any) {
        this.currentNode = node;

        const validators = new LabelValidators(label);
        validators.setData([]);
        const validator = validators.getValidator(node.key);
        const namespace = validator?.getNamespace();
        const variables = namespace?.getNames(node.key);
        this.namespace = variables || [];

        const clone = this.currentNode.clone();
        const item = clone.config as (IRulesItemConfig | IStatisticItemConfig);
        const config = item.config;

        this.readonly = clone.readonly || clone.freezed;
        this.name = clone.label;
        this.type = clone.blockType === 'statistic' ? 'Statistic' : 'Rule';

        this.variables.fromData(config?.variables);
        this.scores.fromData(config?.scores);
        this.formulas.fromData(config?.formulas);

        this.variables.updateType(this.schemas);
        this.updateCodeMirror();

        const map1 = this.variables.getMap();
        for (const root of this.source.roots) {
            const rootView = root.fields;
            const data = rootView.data;
            const map2 = map1.get(root.data.iri);
            if (map2) {
                for (const field of data.list) {
                    const path = field.path.map((e) => e.data.name).join('.');
                    field.selected = map2.has(path);
                }
            } else {
                for (const field of data.list) {
                    field.selected = false;
                }
            }
            rootView.updateHidden();
            rootView.updateSelected();
        }
    }

    public onCancel() {
        this.currentNode = null;
    }

    public onSave() {
        if (this.currentNode) {
            const item = this.currentNode.config as (IRulesItemConfig | IStatisticItemConfig);
            if (item.config) {
                item.config.variables = this.variables.getJson();
                item.config.formulas = this.formulas.getJson();
                item.config.scores = this.scores.getJson();
            } else {
                item.config = {
                    variables: this.variables.getJson(),
                    formulas: this.formulas.getJson(),
                    scores: this.scores.getJson(),
                };
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

    private getEnums(): { [x: string]: EnumValue; } {
        const enums: { [x: string]: EnumValue; } = {};
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
        }, 350);
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
            }, 200);
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
        }, 200);
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
        }, 250);
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
        const map = new Set<string>();
        for (const name of this.namespace) {
            map.add(name);
        }
        for (const name of this.variables.getNames()) {
            map.add(name);
        }
        for (const name of this.scores.getNames()) {
            map.add(name);
        }

        for (const name of this.formulas.getNames()) {
            const variables = Array.from(map);
            const codeMirrorOptions = {
                ...this.codeMirrorOptions,
                variables: variables,
                hintOptions: {
                    hint: createAutocomplete(variables)
                }
            };
            this.codeMirrorMap.set(name, codeMirrorOptions);
            map.add(name);
        }
    }

    public getCodeMirrorOptions(name: string): any {
        return this.codeMirrorMap.get(name);
    }

    public getRelationshipsName(item: any) {
        if (item) {
            const variable = this.variables.get(item.id);
            if (variable) {
                return `${variable.id} - ${variable.fieldDescription}`;
            } else {
                return item.id;
            }
        }
        return item;
    }

    public onAddScore() {
        this.scores.add();
        this.updateCodeMirror();
    }

    public onRename() {
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

    public onAddFormula() {
        this.formulas.add();
        this.updateCodeMirror();
    }

    public onDeleteFormula(formula: SchemaFormula) {
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

    public onEditFormula(formula: SchemaFormula) {
        const dialogRef = this.dialogService.open(SchemaRuleConfigDialog, {
            showHeader: false,
            header: 'Preview',
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                variables: this.variables.getOptions(),
                item: formula.clone(),
                readonly: this.readonly,
                enums: this.getEnums()
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                const rule: FormulaRule | ConditionRule | RangeRule = result.rule;
                formula.addRule(rule);
            }
        });
    }
}
