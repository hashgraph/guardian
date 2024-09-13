import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TreeGraphComponent } from '../tree-graph/tree-graph.component';
import { TreeNode } from '../tree-graph/tree-node';
import { TreeListItem } from '../tree-graph/tree-list';
import { SchemaData, SchemaFormulas, SchemaNode, SchemaVariables } from './schema-node';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SchemaService } from 'src/app/services/schema.service';

@Component({
    selector: 'app-policy-statistics-configuration',
    templateUrl: './policy-statistics-configuration.component.html',
    styleUrls: ['./policy-statistics-configuration.component.scss'],
})
export class PolicyStatisticsConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    public id: string;
    public item: any;
    public policy: any;
    public schemas: any[];

    private subscription = new Subscription();
    private tree: TreeGraphComponent;
    private nodes: SchemaNode[];

    public roots: SchemaNode[];
    public selectedNode: SchemaNode | null = null;
    public rootNode: SchemaNode | null = null;

    public nodeLoading: boolean = true;
    public searchField: string = '';

    public stepper = [true, false, false];

    @ViewChild('fieldTree', { static: false }) fieldTree: ElementRef;
    @ViewChild('treeTabs', { static: false }) treeTabs: ElementRef;

    private _timeout1: any;
    private _timeout2: any;

    public formulas: SchemaFormulas = new SchemaFormulas();
    public variables: SchemaVariables = new SchemaVariables();

    public overviewForm = new FormGroup({
        name: new FormControl('', Validators.required),
        description: new FormControl(''),
        policy: new FormControl('', Validators.required),
        method: new FormControl('', Validators.required)
    });

    public schemaFilterType: number = 1;

    public methods: any[] = [{
        label: 'Manually',
        value: 'manually'
    }, {
        label: 'By Event',
        value: 'byEvent'
    }, {
        label: 'every Day',
        value: 'everyDay'
    }, {
        label: 'every Week',
        value: 'everyWeek'
    }, {
        label: 'every Month',
        value: 'everyMonth'
    }, {
        label: 'every Year',
        value: 'everyYear'
    }];

    public properties: Map<string, string>;

    public get zoom(): number {
        if (this.tree) {
            return Math.round(this.tree.zoom * 100);
        } else {
            return 100;
        }
    }

    constructor(
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private policyStatisticsService: PolicyStatisticsService,
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
        this.id = this.route.snapshot.params['id'];
        this.loading = true;
        forkJoin([
            this.policyStatisticsService.getItem(this.id),
            this.policyStatisticsService.getRelationships(this.id),
            this.schemaService.properties()
        ]).subscribe(([item, relationships, properties]) => {
            this.item = item;
            if (relationships) {
                this.prepareData(item, relationships, properties);
            }
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    private prepareData(
        item: any,
        relationships: any,
        properties: any[]
    ) {
        this.policy = relationships.policy || {};
        this.schemas = relationships.schemas || [];
        this.nodes = [];
        this.properties = new Map<string, string>();
        if(properties) {
            for (const property of properties) {
                this.properties.set(property.title, property.value);
            }
        }
        for (const schema of this.schemas) {
            try {
                const item = new Schema(schema);
                const node = SchemaNode.from(item, this.properties);
                for (const field of item.fields) {
                    if (field.isRef && field.type) {
                        node.addId(field.type)
                    }
                }
                this.nodes.push(node);
            } catch (error) {
                console.log(error);
            }
        }

        if (this.tree) {
            this.tree.setData(this.nodes);
        }

        this.overviewForm.setValue({
            name: item.name,
            description: item.description,
            policy: this.policy?.name,
            method: item.description,
        });
    }

    public onBack() {
        this.router.navigate(['/policy-statistics']);
    }

    public initTree($event: TreeGraphComponent) {
        this.tree = $event;
        if (this.nodes) {
            this.tree.setData(this.nodes);
        }
    }

    public createNodes($event: any) {
        const roots = $event.roots as SchemaNode[];
        const nodes = $event.nodes as SchemaNode[];
        this.roots = roots;
        for (const node of nodes) {
            node.fields.updateSearch();
        }
        this.tree.move(18, 46);
    }

    public onSelectNode(node: TreeNode<SchemaData> | null) {
        clearTimeout(this._timeout1);
        clearTimeout(this._timeout2);
        this.nodeLoading = true;
        this.selectedNode = node as SchemaNode;
        this.rootNode = (node?.getRoot() || null) as SchemaNode;
        if (this.rootNode) {
            const id = this.selectedNode?.data?.iri;
            const rootView = this.rootNode.fields;
            rootView.collapseAll(true);
            rootView.highlightAll(false);
            const items = rootView.find((item: any) => {
                return item.type === id;
            });
            for (const item of items) {
                rootView.collapsePath(item, false);
                rootView.highlight(item, true);
            }
            rootView.searchItems(this.searchField, this.schemaFilterType);
            rootView.updateHidden();
            rootView.updateSelected();
            this._timeout1 = setTimeout(() => {
                const first = (document as any)
                    .querySelector('.field-item[highlighted="true"]:not([search-highlighted="hidden"])');
                if (this.fieldTree) {
                    if (first) {
                        this.fieldTree.nativeElement.scrollTop = first.offsetTop;
                    } else {
                        this.fieldTree.nativeElement.scrollTop = 0;
                    }
                }
                this._timeout2 = setTimeout(() => {
                    this.nodeLoading = false;
                }, 200)
            }, 200)
        }
    }

    public onCollapseField(field: TreeListItem<any>) {
        if (this.rootNode) {
            const rootView = this.rootNode.fields;
            rootView.collapse(field, !field.collapsed);
            rootView.updateHidden();
        }
    }

    public onSelectField(field: TreeListItem<any>) {
        field.selected = !field.selected;
        if (this.rootNode) {
            const rootView = this.rootNode.fields;
            rootView.updateHidden();
            rootView.updateSelected();
        }
        this.updateVariables();
    }

    public onSchemaFilter() {
        clearTimeout(this._timeout2);
        this.nodeLoading = true;
        const value = (this.searchField || '').trim().toLocaleLowerCase();
        if (this.tree) {
            const roots = this.tree.getRoots() as SchemaNode[];
            for (const root of roots) {
                root.fields.searchItems(value, this.schemaFilterType);
            }

            const nodes = this.tree.getNodes() as SchemaNode[];
            for (const node of nodes) {
                node.fields.searchView(value);
            }

            if (this.rootNode) {
                const rootView = this.rootNode.fields;
                rootView.updateHidden();
            }
        }
        this._timeout2 = setTimeout(() => {
            this.nodeLoading = false;
        }, 200)
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
        const max = Math.floor((el.scrollWidth - el.offsetWidth) / 114);
        let current = Math.floor(this.treeTabs.nativeElement.scrollLeft / 114);
        if (dir < 0) {
            current--;
        } else {
            current++;
        }
        current = Math.min(Math.max(current, 0), max);
        this.treeTabs.nativeElement.scrollLeft = current * 114;
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
                }, 3000);
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 800);
            }
        }, 300);
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
        this.onSchemaFilter();
    }

    private updateVariables() {
        this.variables.fromNodes(this.roots);
    }

    public onAddVariable() {
        this.formulas.add();
    }
}