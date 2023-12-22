import { Component, OnInit, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { IUser, SchemaHelper, TagType, Token } from '@guardian/interfaces';
import { Dropdown } from 'primeng/dropdown';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject, forkJoin } from 'rxjs';
import { AddPairDialogComponent } from 'src/app/components/add-pair-dialog/add-pair-dialog.component';
import { DataInputDialogComponent } from 'src/app/components/data-input-dialog/data-input-dialog.component';
import { ContractService } from 'src/app/services/contract.service';
import { ProfileService } from 'src/app/services/profile.service';
import { TagsService } from 'src/app/services/tag.service';
import { TokenService } from 'src/app/services/token.service';

interface Operation {
    label: string;
    description: string;
    action: (id: string) => void;
}

/**
 * Retirement page SR
 */
@Component({
    selector: 'app-retirement',
    templateUrl: './retirement.component.html',
    styleUrls: ['./retirement.component.scss'],
})
export class RetirementComponent implements OnInit {
    contracts: any[] | null;
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    pageIndex: number;
    pageSize: number;
    contractsCount: any = 0;
    tagEntity = TagType.Contract;
    owner: any;
    tagSchemas: any[] = [];

    @ViewChild('operationDropdown') operationDropdown: Dropdown;

    operations: Operation[] = [
        {
            label: 'Add Pair',
            description: 'Add Contract Pair',
            action: (id: string) => {
                this.addPair(id);
            },
        },
        {
            label: 'Add User',
            description: 'Add User to Contract',
            action: (id: string) => {
                this.addUser(id);
            },
        },
    ];

    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        public tagsService: TagsService,
        private dialogService: DialogService,
        private profileService: ProfileService,
        private contractsService: ContractService,
        private tokenService: TokenService,
        private router: Router,
    ) {
    }

    ngOnInit() {
        this.contracts = null;
        this.pageIndex = 0;
        this.pageSize = 10;

        this.loading = true;
        this.loadContracts();
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    loadContracts() {
        this.contracts = null;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.tagsService.getPublishedSchemas(),
        ]).subscribe(
            (value) => {
                const profile: IUser | null = value[0];
                const tagSchemas: any[] = value[1] || [];

                this.isConfirmed = !!(profile && profile.confirmed);
                this.role = profile ? profile.role : null;
                this.owner = profile?.did;
                this.tagSchemas = SchemaHelper.map(tagSchemas);

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
            },
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

                const ids = this.contracts.map((e) => e.id);
                this.tagsService.search(this.tagEntity, ids).subscribe(
                    (data) => {
                        if (this.contracts) {
                            for (const contract of this.contracts) {
                                (contract as any)._tags = data[contract.id];
                            }
                        }
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    },
                );
            },
            (e) => {
                this.loading = false;
            },
        );
    }

    onChangePage(event: any) {
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
        const dialogRef = this.dialogService.open(DataInputDialogComponent, {
            header: 'Import Contract',
            width: '500px',
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
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.contractsService
                    .import(
                        result.contractId?.trim(),
                        result.description?.trim(),
                    )
                    .subscribe(
                        () => {
                            this.loading = false;
                            this.loadContracts();
                        },
                        () => (this.loading = false),
                    );
            }
        });
    }

    createContract() {
        const dialogRef = this.dialogService.open(DataInputDialogComponent, {
            header: 'Create Contract',
            width: '500px',
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
        dialogRef.onClose.subscribe(async (result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.contractsService.create(result.description?.trim()).subscribe(
                (res) => {
                    this.loading = false;
                    this.loadContracts();
                },
                () => (this.loading = false),
            );
        });
    }

    addUser(contractId: string) {
        const dialogRef = this.dialogService.open(DataInputDialogComponent, {
            header: 'Enter User Identifier',
            width: '500px',
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
        dialogRef.onClose.subscribe(async (result) => {
            if (!result) {
                return;
            }
            this.loading = true;
            this.contractsService
                .addUser(result.userId?.trim(), contractId)
                .subscribe(
                    (res) => {
                        this.loading = false;
                        this.loadContracts();
                    },
                    () => (this.loading = false),
                );
        });
    }

    addPair(contractId: string) {
        this.loading = true;
        this.tokenService.getTokens().subscribe(
            (data: any) => {
                this.loading = false;
                const tokens = data
                    .map((e: any) => new Token(e))
                    .filter(
                        (token: Token) => token.enableWipe && !token.draftToken,
                    );

                const dialogRef = this.dialogService.open(
                    AddPairDialogComponent,
                    {
                        header: 'Create Pair',
                        width: '650px',
                        styleClass: 'custom-dialog',
                        data: {
                            tokens,
                            contractId,
                        },
                    },
                );
                dialogRef.onClose.subscribe(async (result) => {
                    if (result) {
                        this.loading = true;
                        this.contractsService
                            .createPair(
                                result.contractId,
                                result.baseTokenId,
                                result.oppositeTokenId,
                                result.baseTokenCount,
                                result.oppositeTokenCount,
                            )
                            .subscribe(
                                () => (this.loading = false),
                                () => (this.loading = false),
                            );
                    }
                });
            },
            (e) => {
                this.loading = false;
                console.error(e.error);
            },
        );
    }

    checkStatus(contractId: string, element: MatIcon) {
        element._elementRef.nativeElement.classList.add('spin');
        this.contractsService.updateStatus(contractId).subscribe(
            () => {
                element._elementRef.nativeElement.classList.remove('spin');
                this.loadContracts();
            },
            () => element._elementRef.nativeElement.classList.remove('spin'),
        );
    }

    onOperationSelect(contractId: string, operation: Operation): void {
        operation.action(contractId);
        this.operationDropdown.updateSelectedOption('');
    }

    onCreateTag(hederaContractId: string): void {
        console.log(hederaContractId);
    }

    onViewContract(hederaContractId: string): void {
        this.router.navigate(['/contracts/pairs'], {
            queryParams: {
                contractId: hederaContractId,
            },
        });
    }

    newOnPage() {
        this.pageIndex = 0;
        this.loadContracts();
    }

    movePageIndex(inc: number) {
        if (
            inc > 0 &&
            this.pageIndex < this.contractsCount / this.pageSize - 1
        ) {
            this.pageIndex += 1;
            this.loadContracts();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.loadContracts();
        }
    }
}
