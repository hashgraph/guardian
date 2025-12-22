import { Component, OnInit } from '@angular/core';
import { SchemaService } from 'src/app/services/schema.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TreeGraphComponent } from '../../common/tree-graph/tree-graph.component';
import { TreeSource } from '../../common/tree-graph/tree-source';
import { TreeNode } from '../../common/tree-graph/tree-node';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { InformService } from 'src/app/services/inform.service';
import { TagsService } from 'src/app/services/tag.service';

interface SchemaTreeNode extends TreeNode<{ name: string; isTagged?: boolean }> {
    searchHighlighted?: boolean;
}

interface TagItem {
    entity: string;
    localTarget: string;
    name?: string;
    id: string;
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
        private informService: InformService,
        private tagsService: TagsService
    ) {
        this.header = this.config.header || '';
        this.schema = this.config.data;
    }

    ngOnInit(): void {
        this.loading = true;
        this.fetchedSchemaIds.clear();

        const taggedSchemaTypes = this.getTaggedSchemaTypes();
        const mainSchemaType = this.schema.iri?.replace(/^#/, '') || '';
        this.fetchedSchemaIds.add(mainSchemaType);

        const uniqueTaggedTypes = taggedSchemaTypes.filter((type: string) => {
            if (this.fetchedSchemaIds.has(type)) {
                return false;
            }
            this.fetchedSchemaIds.add(type);
            return true;
        });

        const mainSchemaRequest = this.createSchemaTreeRequest(this.schema.id, this.schema.name);

        if (uniqueTaggedTypes.length > 0) {
            this.loadTaggedSchemas(mainSchemaRequest, uniqueTaggedTypes);
        } else {
            this.executeTreeRequests([mainSchemaRequest]);
        }
    }

    private createSchemaTreeRequest(schemaId: string, schemaName: string): Observable<any> {
        return this.schemaService.getSchemaTree(schemaId).pipe(
            catchError(() => {
                this.informService.errorShortMessage(`Failed to load schema tree: ${schemaName}`, 'Schema Tree Error');
                return of(null);
            })
        );
    }

    private loadTaggedSchemas(mainSchemaRequest: Observable<any>, uniqueTaggedTypes: string[]): void {
        this.tagsService
            .getSchemas({ pageIndex: 0, pageSize: 1000 })
            .pipe(
                map((response) => response.body || []),
                catchError(() => {
                    this.informService.errorShortMessage('Failed to load tag schemas', 'Schema Tree Error');
                    return of([]);
                })
            )
            .subscribe((tagSchemas: any[]) => {
                const taggedSchemaRequests = uniqueTaggedTypes.map((type: string) => {
                    const iri = `#${type}`;
                    const matchedSchema = tagSchemas.find((s) => s.iri === iri);

                    if (matchedSchema?._id) {
                        return this.createSchemaTreeRequest(matchedSchema._id, matchedSchema.name);
                    }
                    return of(null);
                });

                this.executeTreeRequests([mainSchemaRequest, ...taggedSchemaRequests]);
            });
    }

    private executeTreeRequests(requests: Observable<any>[]): void {
        forkJoin(requests).subscribe((results) => {
            const allNodes: SchemaTreeNode[] = [];

            results.forEach((result, index) => {
                if (result) {
                    const isTagged = index > 0; // First result is main schema, rest are tagged
                    const nodes = this.traverse(result, { isRoot: true, isTagged });
                    allNodes.push(...nodes);
                }
            });

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

    private getTaggedSchemaTypes(): string[] {
        const tags: TagItem[] = this.schema?._tags?.tags || [];
        return tags
            .filter((tag) => tag.entity === 'Schema' && tag.document?.credentialSubject?.[0]?.type)
            .map((tag) => tag.document!.credentialSubject![0].type!);
    }

    private traverse(
        node: { name: string; children: any[] },
        { isRoot = false, isTagged = false }: { isRoot?: boolean; isTagged?: boolean } = {}
    ): SchemaTreeNode[] {
        const nodeType = isRoot ? 'root' : 'sub';
        const treeNode: SchemaTreeNode = new TreeNode<{ name: string; isTagged?: boolean }>(node.name, nodeType, {
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
                treeNode.addId(child.name);
                return this.traverse(child, { isTagged });
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
        this.tree.move(18, 46);
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
                this.tree.move(18, 46);
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
        const grid = el?.parentElement?.parentElement;
        if (el && grid) {
            const elCoord = el.getBoundingClientRect();
            const gridCoord = grid.getBoundingClientRect();
            const x = elCoord.left - gridCoord.left;
            const y = elCoord.top - gridCoord.top;
            this.tree?.move(-x + 50, -y + 56);
        }
    }
}
