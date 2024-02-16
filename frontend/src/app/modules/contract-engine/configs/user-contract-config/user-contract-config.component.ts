import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IUser } from '@guardian/interfaces';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ContractService } from 'src/app/services/contract.service';
import { TagsService } from 'src/app/services/tag.service';
import { ActivatedRoute, Router } from '@angular/router';

import { UserRetireRequestsDialogComponent } from '../../dialogs/user-retire-requests-dialog/user-retire-requests-dialog.component';
import { VCViewerDialog } from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';
import { UserRetirePoolsDialogComponent } from '../../dialogs/user-retire-pools-dialog/user-retire-pools-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

/**
 * Component for operating with Contracts
 */
@Component({
    selector: 'user-contract-config',
    templateUrl: './user-contract-config.component.html',
    styleUrls: ['./user-contract-config.component.css'],
})
export class UserContractConfigComponent implements OnInit {
    contractRequests: any[] = [];
    columns: string[] = [];
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    pageIndex: number;
    pageSize: number;
    contractsCount: any = 0;
    displayedColumnsContractRequests: string[] = [
        'contractId',
        'date',
        'operation',
    ];

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private contractService: ContractService,
        private tokenService: TokenService,
        private dialog: MatDialog,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.contractRequests = [];
        this.pageIndex = 0;
        this.pageSize = 100;
        this.columns = [
            'contractId',
            'description',
            'tags',
            'permissions',
            'operations',
        ];
    }

    private loadRetireData() {
        this.loading = true;
        this.contractService
            .getRetireVCs(this.pageIndex, this.pageSize)
            .subscribe(
                (policiesResponse) => {
                    this.contractRequests = policiesResponse.body || [];
                    this.contractsCount =
                        policiesResponse.headers.get('X-Total-Count') ||
                        this.contractRequests.length;
                    this.loading = false;
                },
                (e) => {
                    this.loading = false;
                }
            );
    }
    ngOnInit() {
        this.loadContracts();
    }

    loadContracts() {
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe(
            (value) => {
                const profile: IUser | null = value;

                this.isConfirmed = !!(profile && profile.confirmed);
                this.role = profile ? profile.role : null;

                if (this.isConfirmed) {
                    this.loadRetireData();
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }
            },
            (e) => {
                this.loading = false;
            }
        );
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadRetireData();
    }

    getDate(date: string) {
        return new Date(date).toLocaleString();
    }

    openRetirePoolsDialog() {
        const dialogRef = this.dialog.open(UserRetirePoolsDialogComponent, {
            width: '800px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.contractService
                .retire(result.poolId, result.retireForm)
                .subscribe(
                    () => {
                        this.loadRetireData();
                    },
                    () => {
                        this.loading = false;
                    }
                );
        });
    }

    openRetireRequestsDialog() {
        this.dialog.open(UserRetireRequestsDialogComponent, {
            width: '800px',
            panelClass: 'g-dialog',
            disableClose: true,
            autoFocus: false,
        });
    }

    viewRetireRequest(document: any) {
        this.dialogService.open(
            VCViewerDialog,
            {
                width: '850px',
                closable: true,
                header: 'VC',
                styleClass: 'custom-dialog',
                data: {
                    id: document.id,
                    dryRun: !!document.dryRunId,
                    viewDocument: true,
                    document: document.document,
                    type: 'VC',
                },
            }
        );
    }
}
