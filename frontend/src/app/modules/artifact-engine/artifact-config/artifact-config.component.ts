import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, PolicyType } from '@guardian/interfaces';
import { HttpResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { ArtifactService } from 'src/app/services/artifact.service';
import { ArtifactImportDialog } from '../artifact-import-dialog/artifact-import-dialog.component';
import { ToolsService } from 'src/app/services/tools.service';

/**
 * Page for creating, editing, importing and exporting schemas.
 */
@Component({
    selector: 'app-artifact-config',
    templateUrl: './artifact-config.component.html',
    styleUrls: ['./artifact-config.component.css']
})
export class ArtifactConfigComponent implements OnInit {
    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public artifacts: any[] = [];
    public artifactsCount: any;
    public columns: string[] = [];
    public policyArtifactColumns: string[] = [
        'uuid',
        'policy',
        'name',
        'type',
        'extention',
        'delete'
    ];
    public policies: any[] | null;
    public tools: any[] | null;
    public draftPolicies: any[] | null;
    public draftTools: any[] | null;
    public policyNameById: any = {};
    public toolNameById: any = {};
    public readonlyById: any = {};

    public currentId: any = '';
    public pageIndex: number;
    public pageSize: number;
    public type: string = 'policy';

    public owner: string = '';

    public get isPolicy(): boolean {
        return this.type === 'policy';
    }

    public get isTool(): boolean {
        return this.type === 'tool';
    }

    public get readonly(): boolean {
        return this.readonlyById[this.currentId];
    }

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private toolService: ToolsService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog,
        private artifact: ArtifactService) {
        this.policies = null;
        this.tools = null;
        this.draftPolicies = null;
        this.draftTools = null;
        this.pageIndex = 0;
        this.pageSize = 100;
    }

    ngOnInit() {
        const type = this.route.snapshot.queryParams['type'];
        const toolId = this.route.snapshot.queryParams['toolId'];
        const policyId = this.route.snapshot.queryParams['policyId'];
        if (policyId) {
            this.type = 'policy';
            this.currentId = policyId != 'all' ? policyId : '';
        } else if (toolId) {
            this.type = 'tool';
            this.currentId = toolId != 'all' ? toolId : '';
        } else {
            this.type = type || 'policy';
            this.currentId = '';
        }
        this.loadProfile()
    }

    private loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(),
            this.toolService.page()
        ]).subscribe((value) => {
            this.loading = false;

            const profile: IUser | null = value[0];
            const policies: any[] = value[1] || [];
            const tools: any[] = value[2]?.body || [];

            this.isConfirmed = !!(profile && profile.confirmed);
            this.owner = profile?.did || '';

            this.policies = [];
            this.draftPolicies = [];
            for (const policy of policies) {
                this.policyNameById[policy.id] = policy.name;
                this.policies.push(policy);
                if (policy.status === PolicyType.DRAFT) {
                    this.draftPolicies.push(policy);
                }
            }
            this.tools = [];
            this.draftTools = [];
            for (const tool of tools) {
                this.toolNameById[tool.id] = tool.name;
                this.tools.push(tool);
                if (
                    tool.creator === this.owner &&
                    tool.status !== 'PUBLISHED'
                ) {
                    this.readonlyById[tool.id] = false;
                    this.draftTools.push(tool);
                } else {
                    this.readonlyById[tool.id] = true;
                }
            }

            this.pageIndex = 0;
            this.pageSize = 100;
            this.loadArtifacts();
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    private loadArtifacts() {
        this.loading = true;

        this.columns = this.policyArtifactColumns;
        this.artifact.getArtifacts(
            this.currentId,
            this.type,
            this.pageIndex,
            this.pageSize
        ).subscribe((artifactResponse: HttpResponse<any[]>) => {
            this.artifacts = artifactResponse.body?.map(item => {
                const policy = this.policies?.find(policy => policy.id === item.policyId)
                return Object.assign(item, {
                    editable: !policy || policy.status === PolicyType.DRAFT
                })
            }) || [];
            this.artifactsCount = artifactResponse.headers.get('X-Total-Count') || this.artifacts.length;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            console.error(e.error);
            this.loading = false;
        });
    }

    public onChangeType(event: any): void {
        this.pageIndex = 0;
        if (this.type === 'policy') {
            this.router.navigate(['/artifacts'], {
                queryParams: {
                    type: this.type,
                    policyId: 'all'
                }
            });
        } else if (this.type === 'tool') {
            this.router.navigate(['/artifacts'], {
                queryParams: {
                    type: 'tool',
                    toolId: 'all'
                }
            });
        } else {
            this.router.navigate(['/artifacts'], {
                queryParams: {
                    policyId: 'all'
                }
            });
        }
        this.loadArtifacts();
    }

    public onFilter() {
        this.pageIndex = 0;
        if (this.type === 'policy') {
            this.router.navigate(['/artifacts'], {
                queryParams: {
                    type: 'policy',
                    policyId: this.currentId ? this.currentId : 'all'
                }
            });
        } else if (this.type === 'tool') {
            this.router.navigate(['/artifacts'], {
                queryParams: {
                    type: 'tool',
                    toolId: this.currentId ? this.currentId : 'all'
                }
            });
        } else {
            this.router.navigate(['/artifacts'], {
                queryParams: {
                    policyId: this.currentId ? this.currentId : 'all'
                }
            });
        }
        this.loadArtifacts();
    }

    public onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadArtifacts();
    }

    public deleteArtifact(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete artifact',
                dialogText: 'Are you sure to delete artifact?'
            },
            disableClose: true,
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            this.artifact.deleteArtifact(element.id).subscribe((data: any) => {
                this.loadArtifacts();
            }, (e) => {
                this.loading = false;
            });
        });
    }

    public importArtifacts() {
        const dialogRef = this.dialog.open(ArtifactImportDialog, {
            data: {
                type: this.type,
                currentId: this.currentId,
                policies: this.draftPolicies,
                tools: this.draftTools
            },
            disableClose: true,
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.artifact.addArtifacts(result.files, result.currentId)
                .subscribe((res) => this.loadArtifacts(), (err) => this.loading = false);
        });
    }
}
