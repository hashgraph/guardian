import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProfileService } from '../../services/profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, PolicyType } from '@guardian/interfaces';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { HttpResponse } from '@angular/common/http';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
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
    currentPolicyId: any = '';
    pageIndex: number;
    pageSize: number;
    policyNameById: any = {};

    constructor(
        private profileService: ProfileService,
        private policyEngineService: PolicyEngineService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog,
        private artifact: ArtifactService) {
        this.policies = null;
        this.pageIndex = 0;
        this.pageSize = 100;
    }

    ngOnInit() {
        const policyId = this.route.snapshot.queryParams['policyId'];
        this.currentPolicyId = policyId && policyId != 'all' ? policyId : '';
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
            this.pageSize = 100;
            this.loadArtifacts();
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    loadArtifacts() {
        this.loading = true;
        const request =
            this.artifact.getArtifacts(this.currentPolicyId, this.pageIndex, this.pageSize);
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
                policyId: this.currentPolicyId ? this.currentPolicyId : 'all'
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

    deleteArtifact(element: any) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                dialogTitle: 'Delete artifact',
                dialogText: 'Are you sure to delete artifact?'
            },
            autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }

            this.loading = true;
            const request =
                this.artifact.deleteArtifact(element.id);

            request.subscribe((data: any) => {
                this.loadArtifacts();
            }, (e) => {
                this.loading = false;
            });
        });
    }

    importArtifacts() {
        const dialogRef = this.dialog.open(ArtifactImportDialog, {
            data: {
                policyId: this.currentPolicyId,
                policies: this.policies
            }
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
}
