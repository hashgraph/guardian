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

/**
 * Page for creating, editing, importing and exporting schemas.
 */
@Component({
    selector: 'app-artifact-config',
    templateUrl: './artifact-config.component.html',
    styleUrls: ['./artifact-config.component.css']
})
export class ArtifactConfigComponent implements OnInit {
    loading: boolean = true;
    isConfirmed: boolean = false;
    artifacts: any[] = [];
    artifactsCount: any;
    columns: string[] = [];
    policyArtifactColumns: string[] = [
        'uuid',
        'policy',
        'name',
        'type',
        'extention',
        'delete'
    ];
    policies: any[] | null;
    currentPolicy: any = '';
    pageIndex: number;
    pageSize: number;
    policyNameById: any = {};
    private currentArtifact: any;
    deleteArtifactVisible: boolean = false;

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog,
        private artifact: ArtifactService) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 10;
    }

    ngOnInit() {
        const policyId = this.route.snapshot.queryParams['policyId'];
        this.currentPolicy = policyId && policyId != 'all' ? policyId : '';
        this.loadProfile()
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
            this.policies = [];
            for (let i = 0; i < policies.length; i++) {
                const policy = policies[i];
                this.policyNameById[policy.id] = policy.name;
                this.policies.push(policy);
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
        const request =
            this.artifact.getArtifacts(this.currentPolicy.id, this.pageIndex, this.pageSize);
        this.columns = this.policyArtifactColumns;
        request.subscribe((artifactResponse: HttpResponse<any[]>) => {
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

    onFilter() {
        this.pageIndex = 0;
        this.router.navigate(['/artifacts'], {
            queryParams: {
                policyId: this.currentPolicy.id ? this.currentPolicy.id : 'all'
            }
        });
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
                policyId: this.currentPolicy.id,
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

    newOnPage() {
        this.pageIndex = 0;
        this.loadArtifacts();
    }

    movePageIndex(inc: number) {
        if (inc > 0 && this.pageIndex < (this.artifactsCount / this.pageSize) - 1) {
            this.pageIndex += 1;
            this.loadArtifacts();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.loadArtifacts();
        }
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
