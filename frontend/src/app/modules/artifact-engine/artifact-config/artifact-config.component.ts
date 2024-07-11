import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, PolicyType, UserPermissions } from '@guardian/interfaces';
import { HttpResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { ArtifactService } from 'src/app/services/artifact.service';
import { ArtifactImportDialog } from '../artifact-import-dialog/artifact-import-dialog.component';

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
    public user: UserPermissions = new UserPermissions();
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
    public currentPolicy: any | null = null;
    public pageIndex: number;
    public pageSize: number;
    public policyNameById: any = {};
    public deleteArtifactVisible: boolean = false;
    public filterOptions: any[] = [];
    public policies: any[] = [];
    private currentArtifact: any;

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog,
        private artifact: ArtifactService) {
        this.policies = [];
        this.filterOptions = [];
        this.pageIndex = 0;
        this.pageSize = 10;
    }

    ngOnInit() {
        this.loadProfile();
    }

    loadProfile() {
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(),
        ]).subscribe((value) => {
            this.loading = false;

            const profile: IUser | null = value[0];
            const policies: any[] = value[1] || [];

            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);

            this.filterOptions = [{
                name: 'All',
                id: 'all'
            }];
            this.policies = [];
            for (let i = 0; i < policies.length; i++) {
                const policy = policies[i];
                this.policyNameById[policy.id] = policy.name;
                this.policies.push(policy);
                this.filterOptions.push(policy);
            }

            const policyId = this.route.snapshot.queryParams['policyId'];
            if (policyId) {
                this.currentPolicy = this.filterOptions.find((p) => p.id === policyId);
            }
            if (!this.currentPolicy) {
                this.currentPolicy = this.filterOptions[0];
            }
            this.pageIndex = 0;
            this.pageSize = 10;
            this.loadArtifacts();
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    loadArtifacts() {
        this.loading = true;
        this.columns = this.policyArtifactColumns;

        const policyId = this.currentPolicy && this.currentPolicy.id !== 'all' ? this.currentPolicy.id : null;
        this.artifact.getArtifacts(
            policyId,
            this.pageIndex,
            this.pageSize
        ).subscribe((artifactResponse: HttpResponse<any[]>) => {
            this.artifacts = artifactResponse.body?.map(item => {
                const policy = this.filterOptions?.find(policy => policy.id === item.policyId)
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

    onFilter() {
        this.pageIndex = 0;
        if (this.currentPolicy && this.currentPolicy.id !== 'all') {
            this.router.navigate(['/artifacts'], {
                queryParams: {
                    policyId: this.currentPolicy.id
                }
            });
        } else {
            this.router.navigate(['/artifacts']);
        }
        this.loadArtifacts();
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadArtifacts();
    }

    importArtifacts() {
        const dialogRef = this.dialog.open(ArtifactImportDialog, {
            data: {
                policyId: this.currentPolicy?.id,
                policies: this.policies
            },
            disableClose: true,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.artifact.addArtifacts(result.files, result.policyId)
                .subscribe((res) => this.loadArtifacts(), (err) => this.loading = false);
        });
    }

    openDeleteArtifactDialog(artifact: any) {
        this.deleteArtifactVisible = true;
        this.currentArtifact = artifact;
    }

    deleteArtifact(deleteArtifact: boolean) {
        if (!deleteArtifact) {
            this.deleteArtifactVisible = false;
            return;
        }
        this.loading = true;
        const request =
            this.artifact.deleteArtifact(this.currentArtifact.id);

        request.subscribe((data: any) => {
            this.loadArtifacts();
        }, (e) => {
            this.loading = false;
        }, () => {
            this.deleteArtifactVisible = false
        });
    }
}
