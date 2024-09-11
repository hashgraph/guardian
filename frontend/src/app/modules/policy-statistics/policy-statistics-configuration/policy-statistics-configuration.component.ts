import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TreeGraphComponent } from '../tree-graph/tree-graph.component';
import { TreeNode } from '../tree-graph/tree-node';
import { TreeListItem } from '../tree-graph/tree-list';
import { SchemaData, SchemaNode } from './schema-node';

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

    @ViewChild('fieldTree', { static: false }) fieldTree: ElementRef;
    @ViewChild('treeTabs', { static: false }) treeTabs: ElementRef;

    private _timeout1: any;
    private _timeout2: any;

    constructor(
        private profileService: ProfileService,
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
        ]).subscribe(([item, relationships]) => {
            this.item = item;
            if (relationships) {
                this.prepareData(relationships);
            }
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    private prepareData(relationships: any) {
        this.policy = relationships.policy || {};
        this.schemas = relationships.schemas || [];
        this.nodes = [];
        for (const schema of this.schemas) {
            try {
                const item = new Schema(schema);
                const node = SchemaNode.from(item);
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
        this.tree.move(18, 56);
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
            rootView.searchItems(this.searchField);
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
    }

    public onSchemaFilter($event: any) {
        const value = ($event.target.value || '').trim().toLocaleLowerCase();
        if (this.tree) {
            const roots = this.tree.getRoots() as SchemaNode[];
            for (const root of roots) {
                root.fields.searchItems(value);
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
    }

    public onNavRoot(root: SchemaNode) {
        const el = document.querySelector(`.tree-node[node-id="${root.uuid}"]`);
        const grid = el?.parentElement?.parentElement;
        if (el && grid) {
            const elCoord = el.getBoundingClientRect();
            const gridCoord = grid.getBoundingClientRect();
            const x = elCoord.left - gridCoord.left;
            this.tree?.move(-x + 50, 56)
        }
    }

    public onNavNext(dir: number) {
        const el = this.treeTabs.nativeElement;
        const max = Math.floor((el.scrollWidth - el.offsetWidth) / 104);
        let current = Math.floor(this.treeTabs.nativeElement.scrollLeft / 104);
        if (dir < 0) {
            current--;
        } else {
            current++;
        }
        current = Math.min(Math.max(current, 0), max);
        this.treeTabs.nativeElement.scrollLeft = current * 104;
    }

    public onClearNode() {
        this.tree?.onSelectNode(null);
    }
}