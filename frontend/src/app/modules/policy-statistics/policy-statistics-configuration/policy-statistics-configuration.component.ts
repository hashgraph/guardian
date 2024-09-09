import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TreeGraphComponent } from '../tree-graph/tree-graph.component';
import { TreeNode } from '../tree-graph/tree-node';
import { TreeListData, TreeListItem, TreeListView } from '../tree-graph/tree-list';

interface SchemaData {
    iri: string;
    name: string;
    description: string;
}

class SchemaNode extends TreeNode<SchemaData> {
    public fields: TreeListView<any>;

    public override clone(): SchemaNode {
        const clone = new SchemaNode(this.id, this.type, this.data);
        clone.type = this.type;
        clone.data = this.data;
        clone.childIds = new Set(this.childIds);
        clone.fields = this.fields;
        return clone;
    }

    public override update() {
        this.fields = this.getRootFields();
    }

    public getRootFields(): TreeListView<any> {
        if (this.parent) {
            const parentFields = (this.parent as SchemaNode).getRootFields();
            return parentFields.createView((s) => {
                return s.parent?.data?.type === this.data.iri;
            })
        } else {
            return this.fields;
        }
    }

    public static from(schema: Schema): SchemaNode {
        const id = schema.iri;
        const type = schema.entity === 'VC' ? 'root' : 'sub'
        const data = {
            iri: schema.iri || '',
            name: schema.name || '',
            description: schema.description || '',
        }
        const result = new SchemaNode(id, type, data);
        const fields = TreeListData.fromObject<any>(schema, 'fields');
        result.fields = TreeListView.createView(fields, (s) => {
            return !s.parent;
        })
        return result;
    }
}

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

    public selectedNode: SchemaNode | null = null;
    public rootNode: SchemaNode | null = null;

    public nodeLoading: boolean = true;

    @ViewChild('fieldTree', { static: false }) fieldTree: ElementRef;

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
            this.tree.setData(this.nodes)
        }
    }

    public onBack() {
        this.router.navigate(['/policy-statistics']);
    }

    public initTree($event: TreeGraphComponent) {
        this.tree = $event;
        if (this.nodes) {
            this.tree.setData(this.nodes)
        }
    }

    public onSelectNode(node: TreeNode<SchemaData> | null) {
        clearTimeout(this._timeout1);
        clearTimeout(this._timeout2);
        this.nodeLoading = true;
        this.selectedNode = node as SchemaNode;
        this.rootNode = (node?.getRoot() || null) as SchemaNode;
        if (this.rootNode) {
            const id = this.selectedNode?.data?.iri;
            const data = this.rootNode.fields;
            data.collapseAll(true);
            data.highlightAll(false);
            const items = data.find((item: any) => {
                return item.type === id;
            });
            for (const item of items) {
                data.collapsePath(item, false);
                data.highlight(item, true);
            }
            data.update();
            this._timeout1 = setTimeout(() => {
                const first = (document as any).querySelector('.field-name[highlighted="true"]');
                if (this.fieldTree && first) {
                    this.fieldTree.nativeElement.scrollTop = first.offsetTop;
                }
                this._timeout2 = setTimeout(() => {
                    this.nodeLoading = false;
                }, 200)
            }, 200)
        }
    }

    public onCollapseField(node: SchemaNode, field: TreeListItem<any>) {
        node.fields.collapse(field, !field.collapsed);
        node.fields.update();
    }

    public onSelectField(field: TreeListItem<any>) {
        field.selected = !field.selected;
        if (this.rootNode) {
            this.rootNode.fields.update();
        }
    }
}