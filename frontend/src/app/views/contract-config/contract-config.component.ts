import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IUser, Token } from '@guardian/interfaces';
import { ProfileService } from 'src/app/services/profile.service';
import { TokenService } from 'src/app/services/token.service';
import { ContractService } from 'src/app/services/contract.service';
import { AddPairDialogComponent } from 'src/app/components/add-pair-dialog/add-pair-dialog.component';
import { MatIcon } from '@angular/material/icon';
import { DataInputDialogComponent } from 'src/app/components/data-input-dialog/data-input-dialog.component';

/**
 * Component for operating with Contracts
 */
@Component({
    selector: 'contract-config',
    templateUrl: './contract-config.component.html',
    styleUrls: ['./contract-config.component.css'],
})
export class ContractConfigComponent implements OnInit, OnDestroy {
    contracts: any[] | null;
    columns: string[] = [];
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    pageIndex: number;
    pageSize: number;
    contractsCount: any = 0;

    operationsOptions = [
        {
            id: 'addPair',
            title: 'Add Pair',
            description: 'Add Contract Pair.',
            color: '#4caf50',
        },
        {
            id: 'addUser',
            title: 'Add User',
            description: 'Add User To Contract.',
            color: '#9c27b0',
        },
    ];

    constructor(
        private profileService: ProfileService,
        private contractsService: ContractService,
        private tokenService: TokenService,
        private dialog: MatDialog
    ) {
        this.contracts = null;
        this.pageIndex = 0;
        this.pageSize = 100;
        this.columns = ['contractId', 'description', 'operations', 'retire'];
    }

    ngOnInit() {
        this.loading = true;
        this.loadContracts();
    }

    ngOnDestroy() {}

    loadContracts() {
        this.contracts = null;
        this.isConfirmed = false;
        this.loading = true;
        this.profileService.getProfile().subscribe(
            (profile: IUser | null) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.role = profile ? profile.role : null;
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
        this.contractsService.page(this.pageIndex, this.pageSize).subscribe(
            (policiesResponse) => {
                this.contracts = policiesResponse.body || [];
                this.contractsCount =
                    policiesResponse.headers.get('X-Total-Count') ||
                    this.contracts.length;
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

    importContract() {
        const dialogRef = this.dialog.open(DataInputDialogComponent, {
            width: '500px',
            autoFocus: false,
            data: {
                fieldsConfig: [
                    {
                        name: 'contractId',
                        label: 'Contract Identifier',
                        placeholder: 'Contract Identifier',
                        required: true,
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        placeholder: 'Description',
                        required: false,
                    },
                ],
                title: 'Import Contract',
            },
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.contractsService
                    .import(
                        result.contractId?.trim(),
                        result.description?.trim()
                    )
                    .subscribe(
                        () => {
                            this.loading = false;
                            this.loadContracts();
                        },
                        () => (this.loading = false)
                    );
            }
        });
    }

    createContract() {
        const dialogRef = this.dialog.open(DataInputDialogComponent, {
            width: '500px',
            autoFocus: false,
            data: {
                fieldsConfig: [
                    {
                        name: 'description',
                        label: 'Description',
                        placeholder: 'Description',
                        required: false,
                    },
                ],
                title: 'Create Contract',
            },
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.contractsService.create(result.description?.trim()).subscribe(
                (res) => {
                    this.loading = false;
                    this.loadContracts();
                },
                () => (this.loading = false)
            );
        });
    }

    addUser(contractId: string) {
        const dialogRef = this.dialog.open(DataInputDialogComponent, {
            width: '500px',
            autoFocus: false,
            data: {
                fieldsConfig: [
                    {
                        name: 'userId',
                        label: 'User Identifier',
                        placeholder: 'User Identifier',
                        required: true,
                    },
                ],
                title: 'Enter User Identifier',
            },
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.contractsService.addUser(result.userId?.trim(), contractId).subscribe(
                (res) => {
                    this.loading = false;
                    this.loadContracts();
                },
                () => (this.loading = false)
            );
        });
    }

    onOperationAction(event: any, element: any) {
        if (event.id === 'addUser') {
            this.addUser(element.contractId);
        } else if (event.id === 'addPair') {
            this.addPair(element.contractId);
        }
    }

    addPair(contractId: string) {
        this.loading = true;
        this.tokenService.getTokens().subscribe(
            (data: any) => {
                this.loading = false;
                const tokens = data
                    .map((e: any) => new Token(e))
                    .filter(
                        (token: Token) => token.enableWipe && !token.draftToken
                    );
                const dialogRef = this.dialog.open(AddPairDialogComponent, {
                    width: '650px',
                    panelClass: 'g-dialog',
                    disableClose: true,
                    autoFocus: false,
                    data: {
                        tokens,
                        contractId,
                    },
                });
                dialogRef.afterClosed().subscribe(async (result) => {
                    if (result) {
                        this.loading = true;
                        this.contractsService.createPair(
                            result.contractId,
                            result.baseTokenId,
                            result.oppositeTokenId,
                            result.baseTokenCount,
                            result.oppositeTokenCount,
                        ).subscribe(
                            () => (this.loading = false),
                            () => (this.loading = false)
                        );
                    }
                });
            },
            (e) => {
                this.loading = false;
                console.error(e.error);
            }
        );
    }

    checkStatus(contractId: string, element: MatIcon) {
        element._elementRef.nativeElement.classList.add('spin');
        this.contractsService.updateStatus(contractId).subscribe(
            () => {
                element._elementRef.nativeElement.classList.remove('spin');
                this.loadContracts();
            },
            () => element._elementRef.nativeElement.classList.remove('spin')
        );
    }
}