import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Schema, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TreeGraphComponent } from '../tree-graph/tree-graph.component';
import { TreeNode } from '../tree-graph/tree-node';
import { TreeListData, TreeListItem } from '../tree-graph/tree-list';

interface SchemaData {
    iri: string;
    name: string;
    description: string;
    fields: TreeListData<any>;
    selectedFields: TreeListItem<any>[] | null
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
    private nodes: TreeNode<SchemaData>[];

    public selectedNode: TreeNode<SchemaData> | null = null;
    public rootNode: TreeNode<SchemaData> | null = null;

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
                const node = new TreeNode<SchemaData>(
                    item.iri,
                    item.entity === 'VC' ? 'root' : 'sub',
                    {
                        iri: item.iri || '',
                        name: item.name || '',
                        description: item.description || '',
                        fields: TreeListData.fromObject<any>(item, 'fields'),
                        selectedFields: null
                    }
                );
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
        this.selectedNode = node;
        this.rootNode = node?.getRoot() || null;
    }

    public onCollapseField(node: TreeNode<SchemaData>, field: TreeListItem<any>) {
        node.data.fields.collapse(field, !field.collapsed);
    }

    public onSelectField(node: TreeNode<SchemaData>, field: TreeListItem<any>) {
        setTimeout(() => {
            if (node.data) {
                node.data.selectedFields = node.data.fields.getSelected();
                if (node.data.selectedFields && !node.data.selectedFields.length) {
                    node.data.selectedFields = null;
                }
            }
        });
    }
}