import { Component, OnInit } from '@angular/core';
import { SchemaService } from 'src/app/services/schema.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TreeGraphComponent } from '../../common/tree-graph/tree-graph.component';
import { TreeSource } from '../../common/tree-graph/tree-source';
import { TreeNode } from '../../common/tree-graph/tree-node';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InformService } from 'src/app/services/inform.service';

interface SchemaTreeNode extends TreeNode<{ name: string; isTagged?: boolean }> {
    searchHighlighted?: boolean;
}

interface TagItem {
    entity: string;
    localTarget: string;
    name?: string;
    id: string;
    tagSchemaId?: string;
    document?: {
        credentialSubject?: Array<{
            type?: string;
        }>;
    };
}

@Component({
    selector: 'app-schema-tree',
    templateUrl: './schema-tree.component.html',
    styleUrls: ['./schema-tree.component.scss'],
})
export class SchemaTreeComponent implements OnInit {
    public loading = false;
    public header: string;
    public schema: any;
    public searchField: string = '';

    private tree: TreeGraphComponent;
    private source: TreeSource<SchemaTreeNode>;
    private fetchedSchemaIds: Set<string> = new Set();

    public get zoom(): number {
        if (this.tree) {
            return Math.round(this.tree.zoom * 100);
        } else {
            return 100;
        }
    }

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private schemaService: SchemaService,
        private informService: InformService
    ) {
        this.header = this.config.header || '';
        this.schema = this.config.data;
    }

    ngOnInit(): void {
        this.loading = true;
        this.fetchedSchemaIds.clear();
        const mainSchemaType = this.schema.iri?.replace(/^#/, '') || '';
        this.fetchedSchemaIds.add(mainSchemaType);

        const taggedSchemaIds = this.getTaggedSchemaIds().filter((id: string) => {
            if (this.fetchedSchemaIds.has(id)) {
                return false;
            }
            this.fetchedSchemaIds.add(id);
            return true;
        });

        const mainSchemaRequest = this.createSchemaTreeRequest(this.schema.id, this.schema.name);
        const taggedSchemaRequests = taggedSchemaIds.map((schemaId: string) =>
            this.createSchemaTreeRequest(schemaId, `Tag Schema ${schemaId}`)
        );

        forkJoin([mainSchemaRequest, ...taggedSchemaRequests]).subscribe((results) => {
            const allNodes: SchemaTreeNode[] = [];
            let mainRootNode: SchemaTreeNode | undefined;
            const taggedRootNodes: SchemaTreeNode[] = [];

            results.forEach((result, index) => {
                if (result) {
                    const isTagged = index > 0; // First result is main schema, rest are tagged
                    const nodes = this.traverse(result, { isRoot: true, isTagged });
                    allNodes.push(...nodes);

                    // Track root nodes for linking
                    const rootNode = nodes.find((n) => n.type === 'root');
                    if (rootNode) {
                        if (!isTagged) {
                            mainRootNode = rootNode;
                        } else {
                            taggedRootNodes.push(rootNode);
                        }
                    }
                }
            });

            // Add links from main root to tagged roots
            if (mainRootNode) {
                for (const taggedRoot of taggedRootNodes) {
                    mainRootNode.addLink({ to: taggedRoot.id, variant: 'tag' });
                }
            }

            if (allNodes.length > 0) {
                this.source = new TreeSource<SchemaTreeNode>(allNodes);
                if (this.tree) {
                    this.tree.setData(this.source);
                }
            } else {
                this.informService.errorShortMessage('No schema data available to display', 'Schema Tree Error');
            }

            this.loading = false;
        });
    }

    private createSchemaTreeRequest(schemaId: string, schemaName: string): Observable<any> {
        return this.schemaService.getSchemaTree(schemaId).pipe(
            catchError(() => {
                this.informService.errorShortMessage(`Failed to load schema tree: ${schemaName}`, 'Schema Tree Error');
                return of(null);
            })
        );
    }

    private getTaggedSchemaIds(): string[] {
        const tags: TagItem[] = this.schema?._tags?.tags || [];
        return tags.filter((tag) => tag.entity === 'Schema' && tag.tagSchemaId).map((tag) => tag.tagSchemaId!);
    }

    private traverse(
        node: { name: string; children: any[] },
        { isRoot = false, isTagged = false, parentPath = '' }: { isRoot?: boolean; isTagged?: boolean; parentPath?: string } = {}
    ): SchemaTreeNode[] {
        const nodeType = isRoot ? 'root' : 'sub';
        const nodeId = parentPath ? `${parentPath}/${node.name}` : node.name;
        const treeNode: SchemaTreeNode = new TreeNode<{ name: string; isTagged?: boolean }>(nodeId, nodeType, {
            name: node.name,
            isTagged,
        }) as SchemaTreeNode;
        treeNode.searchHighlighted = false;

        if (isRoot && isTagged) {
            treeNode.entity = 'tagged';
        }

        return [
            treeNode,
            ...(node.children || []).flatMap((child) => {
                const childId = `${nodeId}/${child.name}`;
                treeNode.addId(childId);
                return this.traverse(child, { isTagged, parentPath: nodeId });
            }),
        ];
    }

    public initTree($event: TreeGraphComponent) {
        this.tree = $event;
        if (this.source) {
            this.tree.setData(this.source);
        }
    }

    public createNodes($event: any) {
        setTimeout(() => this.centerGraph(), 0);
    }

    private centerGraph(): void {
        if (!this.tree?.grid || !this.tree?.movedEl || !this.tree?.gridEl) {
            return;
        }

        const container = this.tree.movedEl.nativeElement;
        const gridEl = this.tree.gridEl.nativeElement.querySelector('.tree-grid') as HTMLElement | null;
        if (!gridEl) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const gridRect = gridEl.getBoundingClientRect();
        if (!containerRect.width || !containerRect.height || !gridRect.width || !gridRect.height) {
            return;
        }

        const x = (containerRect.width - gridRect.width) / 2;
        const y = (containerRect.height - gridRect.height) / 2;
        this.tree.move(x, y);
    }

    private centerNode(el: HTMLElement): void {
        if (!this.tree?.grid || !this.tree?.movedEl) {
            return;
        }

        const container = this.tree.movedEl.nativeElement;
        const nodeRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (!containerRect.width || !containerRect.height) {
            return;
        }

        const nodeCenterX = nodeRect.left + nodeRect.width / 2;
        const nodeCenterY = nodeRect.top + nodeRect.height / 2;
        const containerCenterX = containerRect.left + containerRect.width / 2;
        const containerCenterY = containerRect.top + containerRect.height / 2;
        const nextX = this.tree.grid.x - (nodeCenterX - containerCenterX);
        const nextY = this.tree.grid.y - (nodeCenterY - containerCenterY);
        this.tree.move(nextX, nextY);
    }

    public getHeader(): string {
        return this.schema?.name || this.header;
    }

    public onClose() {
        this.dialogRef.close(null);
    }

    public onZoom(d: number) {
        if (this.tree) {
            this.tree.onZoom(d);
            if (d === 0) {
                setTimeout(() => this.centerGraph(), 0);
            }
        }
    }

    public onSchemaFilter() {
        if (this.source) {
            let highlighted: SchemaTreeNode | null = null;
            const searchLower = this.searchField.toLowerCase().trim();

            for (const node of this.source.nodes) {
                if (searchLower && node.data.name.toLowerCase().includes(searchLower)) {
                    node.searchHighlighted = true;
                    if (!highlighted) {
                        highlighted = node;
                    }
                } else {
                    node.searchHighlighted = false;
                }
            }

            if (highlighted) {
                this.onNavTarget(highlighted);
            }
        }
    }

    public onNavTarget(highlighted: SchemaTreeNode) {
        const el = document.querySelector(`.tree-node[node-id="${highlighted.uuid}"]`);
        if (el instanceof HTMLElement) {
            this.centerNode(el);
        }
    }
}
