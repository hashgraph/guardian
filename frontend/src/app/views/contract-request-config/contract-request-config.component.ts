import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import { ContractService } from 'src/app/services/contract.service';
import { forkJoin } from 'rxjs';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { MatDialog } from '@angular/material/dialog';

/**
 * Component for working with contract requests
 */
@Component({
    selector: 'contract-request-config',
    templateUrl: './contract-request-config.component.html',
    styleUrls: ['./contract-request-config.component.css'],
})
export class ContractRequestConfigComponent implements OnInit, OnDestroy {
    requests: any[] | null;
    columns: string[] = [];
    loading: boolean = true;
    isConfirmed: boolean = false;
    pageIndex: number;
    pageSize: number;
    requestsCount: any;
    currentContract: any = '';

    contracts: any[] | null = null;

    constructor(
        private profileService: ProfileService,
        private contractsService: ContractService,
        private route: ActivatedRoute,
        private router: Router,
        private dialog: MatDialog,
    ) {
        this.requests = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.requestsCount = 0;
        this.columns = [
            'contractId',
            'baseTokenId',
            'oppositeTokenId',
            'baseTokenCount',
            'oppositeTokenCount',
            'retire',
        ];
    }

    ngOnInit() {
        this.loading = true;
        this.currentContract =
            this.route.snapshot.queryParams['contractId'] || '';
        this.loadContracts();
    }

    ngOnDestroy() {}

    loadContracts() {
        this.requests = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.contractsService.all(),
        ]).subscribe(
            (value) => {
                const profile = value[0];
                this.contracts = value[1];
                this.isConfirmed = !!(profile && profile.confirmed);
                if (this.isConfirmed) {
                    this.loadAllContracts();
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

    loadAllContracts() {
        this.loading = true;
        this.contractsService
            .getRetireRequestsPage(
                this.currentContract,
                this.pageIndex,
                this.pageSize
            )
            .subscribe(
                (policiesResponse) => {
                    this.requests = policiesResponse.body || [];
                    this.requestsCount =
                        policiesResponse.headers.get('X-Total-Count') ||
                        this.requests.length;
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
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
        this.loadAllContracts();
    }

    retireToken(requestId: string) {
        this.loading = true;
        this.contractsService.retireTokens(requestId).subscribe(
            () => {
                this.loading = false;
                this.loadAllContracts();
            },
            () => (this.loading = false)
        );
    }

    onFilter() {
        if (this.currentContract) {
            this.router.navigate(['/contracts/pairs'], {
                queryParams: {
                    contractId: this.currentContract,
                },
            });
        } else {
            this.router.navigate(['/contracts/pairs']);
        }
        this.loadContracts();
    }

    viewRetireRequest(document: any) {
        this.dialog.open(VCViewerDialog, {
            width: '600px',
            data: {
                document: document.document,
                title: 'View Retire Request Result',
                type: 'VC',
                viewDocument: true
            }
        });
    }
}