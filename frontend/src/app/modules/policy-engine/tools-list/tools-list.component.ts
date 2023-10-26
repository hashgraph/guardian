import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GenerateUUIDv4, IUser, SchemaHelper, TagType } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { ProfileService } from 'src/app/services/profile.service';
import { TagsService } from 'src/app/services/tag.service';
import { ToolsService } from 'src/app/services/tools.service';
import { ExportPolicyDialog } from '../helpers/export-policy-dialog/export-policy-dialog.component';
import { ImportPolicyDialog } from '../helpers/import-policy-dialog/import-policy-dialog.component';
import { NewModuleDialog } from '../helpers/new-module-dialog/new-module-dialog.component';
import { PreviewPolicyDialog } from '../helpers/preview-policy-dialog/preview-policy-dialog.component';
import { mobileDialog } from 'src/app/utils/mobile-utils';
import { ComparePolicyDialog } from '../helpers/compare-policy-dialog/compare-policy-dialog.component';

enum OperationMode {
    None,
    Create,
    Import,
    Publish,
    Delete
}

/**
 * Component for choosing a policy and
 * display blocks of the selected policy
 */
@Component({
    selector: 'app-tools-list',
    templateUrl: './tools-list.component.html',
    styleUrls: ['./tools-list.component.scss']
})
export class ToolsListComponent implements OnInit, OnDestroy {
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public tools: any[] | null;
    public toolsCount: any;
    public pageIndex: number;
    public pageSize: number;
    public columns: string[] = [
        'name',
        'description',
        'topic',
        'tags',
        'schemas',
        'status',
        'operation',
        'operations'
    ];
    public mode: OperationMode = OperationMode.None;
    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;
    public tagEntity = TagType.Tool;
    public owner: any;
    public tagSchemas: any[] = [];

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private toolsService: ToolsService,
        private dialog: MatDialog,
        private router: Router,
    ) {
        this.tools = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.toolsCount = 0;
    }

    ngOnInit() {
        this.loading = true;
        this.loadTools();
    }

    ngOnDestroy() {

    }

    private loadTools() {
        this.tools = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas()
        ]).subscribe((value) => {
            const profile: IUser | null = value[0];
            const tagSchemas: any[] = value[1] || [];

            this.isConfirmed = !!(profile && profile.confirmed);
            this.owner = profile?.did;
            this.tagSchemas = SchemaHelper.map(tagSchemas);

            if (this.isConfirmed) {
                this.loadAllTools();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadAllTools() {
        this.loading = true;
        this.toolsService.page(this.pageIndex, this.pageSize).subscribe((policiesResponse) => {
            this.tools = policiesResponse.body || [];
            this.toolsCount = policiesResponse.headers.get('X-Total-Count') || this.tools.length;

            const ids = this.tools.map(e => e.id);
            this.tagsService.search(this.tagEntity, ids).subscribe((data) => {
                if (this.tools) {
                    for (const policy of this.tools) {
                        (policy as any)._tags = data[policy.id];
                    }
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                console.error(e.error);
                this.loading = false;
            });
        }, (e) => {
            this.loading = false;
        });
    }

    public onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadAllTools();
    }

    private importDetails(result: any) {
        const { type, data, tool } = result;
        const dialogRef = this.dialog.open(PreviewPolicyDialog, mobileDialog({
            width: '950px',
            panelClass: 'g-dialog',
            disableClose: true,
            data: {
                tool: tool,
            }
        }));
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                if (type === 'message') {
                    this.loading = true;
                    this.toolsService.pushImportByMessage(data).subscribe(
                        (result) => {
                            const { taskId, expectation } = result;
                            this.router.navigate(['task', taskId], {
                                queryParams: {
                                    last: btoa(location.href)
                                }
                            });
                        }, (e) => {
                            this.loading = false;
                        });
                } else if (type === 'file') {
                    this.loading = true;
                    this.toolsService.pushImportByFile(data).subscribe(
                        (result) => {
                            const { taskId, expectation } = result;
                            this.router.navigate(['task', taskId], {
                                queryParams: {
                                    last: btoa(location.href)
                                }
                            });
                        }, (e) => {
                            this.loading = false;
                        });
                }
            }
        });
    }

    public importTool(messageId?: string) {
        const dialogRef = this.dialog.open(ImportPolicyDialog, {
            width: '500px',
            autoFocus: false,
            disableClose: true,
            data: {
                type: 'tool',
                timeStamp: messageId
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.importDetails(result);
            }
        });
    }

    public compareTools(toolId?: any) {
        const item = this.tools?.find(e => e.id === toolId);
        const dialogRef = this.dialog.open(ComparePolicyDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {
                type: 'tool',
                tool: item,
                tools: this.tools,
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.toolIds) {
                const toolIds: string[] = result.toolIds;
                this.router.navigate(['/compare'], {
                    queryParams: {
                        type: 'tool',
                        toolIds: toolIds,
                    }
                });
            }
        });
    }

    public exportTool(element: any) {
        this.loading = true;
        this.toolsService.exportInMessage(element.id)
            .subscribe(tool => {
                this.loading = false;
                this.dialog.open(ExportPolicyDialog, {
                    width: '700px',
                    panelClass: 'g-dialog',
                    data: {
                        tool
                    },
                    disableClose: true,
                    autoFocus: false
                })
            });
    }

    public newTool() {
        const dialogRef = this.dialog.open(NewModuleDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
            data: {
                type: 'tool'
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                const tool = {
                    name: result.name,
                    description: result.description,
                    menu: "show",
                    config: {
                        id: GenerateUUIDv4(),
                        blockType: 'tool'
                    }
                }
                this.loading = true;
                this.toolsService.pushCreate(tool).subscribe((result) => {
                    const { taskId, expectation } = result;
                    this.router.navigate(['/task', taskId]);
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    public deleteTool(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete tool',
                dialogText: 'Are you sure to delete tool?'
            },
            disableClose: true,
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.toolsService.delete(element.id).subscribe((result) => {
                this.loadAllTools();
            }, (e) => {
                this.loading = false;
            });
        });
    }

    public publishTool(element: any) {
        this.loading = true;
        this.toolsService.pushPublish(element.id).subscribe((result) => {
            const { taskId, expectation } = result;
            this.router.navigate(['task', taskId], {
                queryParams: {
                    last: btoa(location.href)
                }
            });
        }, (e) => {
            this.loading = false;
        });
    }
}
