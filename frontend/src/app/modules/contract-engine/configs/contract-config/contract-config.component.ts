import {Component, OnDestroy, OnInit} from '@angular/core';
import {ContractType, IUser, SchemaHelper, TagType, Token, UserPermissions,} from '@guardian/interfaces';
import {ProfileService} from 'src/app/services/profile.service';
import {TokenService} from 'src/app/services/token.service';
import {ContractService} from 'src/app/services/contract.service';
import {TagsService} from 'src/app/services/tag.service';
import {forkJoin} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {SetPoolDialogComponent} from '../../dialogs/set-pool-dialog/set-pool-dialog.component';
import {DataInputDialogComponent} from '../../../common/data-input-dialog/data-input-dialog.component';
import {WipeRequestsDialogComponent} from '../../dialogs/wipe-requests-dialog/wipe-requests-dialog.component';
import {RetirePoolsDialogComponent} from '../../dialogs/retire-pools-dialog/retire-pools-dialog.component';
import {RetireRequestsDialogComponent} from '../../dialogs/retire-requests-dialog/retire-requests-dialog.component';
import {Validators} from '@angular/forms';
import {DialogService} from 'primeng/dynamicdialog';

/**
 * Component for operating with Contracts
 */
@Component({
    selector: 'contract-config',
    templateUrl: './contract-config.component.html',
    styleUrls: ['./contract-config.component.css'],
})
export class ContractConfigComponent implements OnInit, OnDestroy {
    public user: UserPermissions = new UserPermissions();
    contracts: any[] | null;
    columns: string[] = [];
    role!: any;
    loading: boolean = true;
    isConfirmed: boolean = false;
    pageIndex: number;
    pageSize: number;
    contractsCount: any = 0;
    tagEntity = TagType.Contract;
    owner: any;
    tagSchemas: any[] = [];
    wipeOperations = [
        {
            id: 'wipeRequests',
            title: 'Requests',
            description: 'Open wipe requests dialog.',
            color: 'var(--primary-color)',
            callback: this.openWipeRequests,
        },
        {
            id: 'addWiper',
            title: 'Add wiper',
            description: 'Add contract wiper.',
            color: '#d3a719',
            callback: this.addWiper,
            permissions: 2
        },
        {
            id: 'removeWiper',
            title: 'Remove wiper',
            description: 'Remove contract wiper.',
            color: '#d3a719',
            callback: this.removeWiper,
            permissions: 2
        },
        {
            id: 'addAdmin',
            title: 'Add admin',
            description: 'Add contract admin.',
            color: '#d3a719',
            callback: this.addAdmin,
            permissions: 0
        },
        {
            id: 'removeAdmin',
            title: 'Remove admin',
            description: 'Remove contract admin.',
            color: '#d3a719',
            callback: this.removeAdmin,
            permissions: 0
        },
        {
            id: 'addManager',
            title: 'Add manager',
            description: 'Add contract manager.',
            color: '#d3a719',
            callback: this.addManager,
            permissions: 1
        },
        {
            id: 'removeManager',
            title: 'Remove manager',
            description: 'Remove contract manager.',
            color: '#d3a719',
            callback: this.removeManager,
            permissions: 1
        },
        {
            id: 'enableRequests',
            title: 'Enable requests',
            description: 'Enable contract requests.',
            color: '#d3a719',
            callback: this.enableRequests,
            permissions: 1
        },
        {
            id: 'disableRequests',
            title: 'Disable requests',
            description: 'Disable contract requests.',
            color: '#d3a719',
            callback: this.disableRequests,
            permissions: 1
        },
        {
            id: 'clearRequests',
            title: 'Clear requests',
            description: 'Clear contract requests.',
            color: '#FF432A',
            callback: this.clearRequests,
            permissions: 0
        },
        {
            id: 'remove',
            title: 'Remove contract',
            description:
                'Remove contract. Contract still will be available on Hedera.',
            color: '#FF432A',
            callback: this.removeContract,
        },
    ];
    retireOperations = [
        {
            id: 'pools',
            title: 'Pools',
            description: 'Contract pools.',
            color: 'var(--primary-color)',
            callback: this.openPools,
        },
        {
            id: 'requests',
            title: 'Requests',
            description: 'Contract requests.',
            color: 'var(--primary-color)',
            callback: this.openRetireRequests,
        },
        {
            id: 'setPool',
            title: 'Set pool',
            description: 'Set contract pool.',
            color: '#d3a719',
            callback: this.setPool,
            permissions: 1
        },
        {
            id: 'addAdmin',
            title: 'Add admin',
            description: 'Add contract admin.',
            color: '#d3a719',
            callback: this.addAdminRetire,
            permissions: 0
        },
        {
            id: 'removeAdmin',
            title: 'Remove admin',
            description: 'Remove contract admin.',
            color: '#d3a719',
            callback: this.removeAdminRetire,
            permissions: 0
        },
        {
            id: 'clearPools',
            title: 'Clear pools',
            description: 'Clear contract pools.',
            color: '#FF432A',
            callback: this.clearRetirePools,
            permissions: 0
        },
        {
            id: 'clearRequests',
            title: 'Clear requests',
            description: 'Clear contract requests.',
            color: '#FF432A',
            callback: this.clearRetireRequests,
            permissions: 0
        },
        {
            id: 'remove',
            title: 'Remove contract',
            description:
                'Remove contract. Contract still will be available on Hedera.',
            color: '#FF432A',
            callback: this.removeContract,
        },
    ];
    type: ContractType = ContractType.WIPE;

    constructor(
        public tagsService: TagsService,
        private profileService: ProfileService,
        private contractsService: ContractService,
        private tokenService: TokenService,
        private dialog: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.contracts = null;
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

    onChangeType(event: any) {
        this.pageIndex = 0;
        this.pageSize = 100;
        this.router.navigate(['/contracts'], {
            queryParams: {type: this.type},
        });
        this.loadAllContracts();
    }

    ngOnInit() {
        this.loading = true;
        if (this.route.snapshot.queryParams['type']) {
            this.type = this.route.snapshot.queryParams['type'];
        }
        this.loadContracts();
    }

    ngOnDestroy() {
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
                this.user = new UserPermissions(profile);

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
            .getContracts({
                type: this.type,
                pageIndex: this.pageIndex,
                pageSize: this.pageSize,
            })
            .subscribe(
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
                        }
                    );
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
            showHeader: false,
            width: '700px',
            styleClass: 'guardian-dialog',
            data: {
                fieldsConfig: [
                    {
                        name: 'contractId',
                        label: 'Contract Identifier',
                        placeholder: 'Contract Identifier',
                        validators: [
                            Validators.required,
                            Validators.pattern('^\\d+\\.\\d+\\.\\d+$'),
                        ],
                    },
                    {
                        name: 'description',
                        label: 'Description',
                        placeholder: 'Description',
                    },
                ],
                title: 'Import Contract',
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.contractsService
                    .importContract(
                        result.contractId?.trim(),
                        result.description?.trim()
                    )
                    .subscribe(
                        (contract: any) => {
                            this.type = contract.type;
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
            showHeader: false,
            width: '700px',
            styleClass: 'guardian-dialog',
            data: {
                fieldsConfig: [
                    {
                        name: 'description',
                        label: 'Description',
                        placeholder: 'Description',
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
            this.contractsService
                .createContract(result.description?.trim(), this.type)
                .subscribe(
                    (res) => {
                        this.loading = false;
                        this.loadContracts();
                    },
                    () => (this.loading = false)
                );
        });
    }

    inputHederaIdentifier(callback: (result: string) => void) {
        const dialogRef = this.dialog.open(DataInputDialogComponent, {
            showHeader: false,
            width: '700px',
            styleClass: 'guardian-dialog',
            data: {
                fieldsConfig: [
                    {
                        name: 'hederaId',
                        label: 'Hedera identifier',
                        placeholder: '0.0.1',
                        validators: [
                            Validators.required,
                            Validators.pattern('^\\d+\\.\\d+\\.\\d+$'),
                        ],
                    },
                ],
                title: 'Enter Hedera Identifier',
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (!result) {
                return;
            }
            callback(result.hederaId?.trim());
        });
    }

    inputHederaAndTokenIdentifier(callback: (hederaId: string, tokenId: string) => void) {
        const dialogRef = this.dialog.open(DataInputDialogComponent, {
            showHeader: false,
            width: '700px',
            styleClass: 'guardian-dialog',
            data: {
                fieldsConfig: [
                    {
                        name: 'hederaId',
                        label: 'Hedera identifier',
                        placeholder: '0.0.1',
                        validators: [
                            Validators.required,
                            Validators.pattern('^\\d+\\.\\d+\\.\\d+$'),
                        ],
                    },
                    {
                        name: 'tokenId',
                        label: 'Token identifier',
                        placeholder: '0.0.1',
                        validators: [
                            Validators.required,
                            Validators.pattern('^\\d+\\.\\d+\\.\\d+$'),
                        ],
                    },
                ],
                title: 'Enter Hedera and Token identifiers',
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (!result) {
                return;
            }
            callback(result.hederaId?.trim(), result.tokenId?.trim());
        });
    }

    addWiper(contract: any) {
        const callback = (hederaId: string, tokenId?: string) => {
            this.loading = true;
            this.contractsService.wipeAddWiper(hederaId, contract.id, tokenId).subscribe(
                (res) => {
                    this.loading = false;
                },
                () => (this.loading = false)
            );
        }
        if (contract.version === '1.0.0') {
            this.inputHederaIdentifier(callback);
        } else {
            this.inputHederaAndTokenIdentifier(callback);
        }
    }

    addAdmin(contract: any) {
        this.inputHederaIdentifier((result) => {
            this.loading = true;
            this.contractsService.wipeAddAdmin(result, contract.id).subscribe(
                (res) => {
                    this.loading = false;
                },
                () => (this.loading = false)
            );
        });
    }

    addAdminRetire(contract: any) {
        this.inputHederaIdentifier((result) => {
            this.loading = true;
            this.contractsService.retireAddAdmin(result, contract.id).subscribe(
                (res) => {
                    this.loading = false;
                },
                () => (this.loading = false)
            );
        });
    }

    addManager(contract: any) {
        this.inputHederaIdentifier((result) => {
            this.loading = true;
            this.contractsService
                .wipeAddManager(result, contract.id)
                .subscribe(
                    (res) => {
                        this.loading = false;
                    },
                    () => (this.loading = false)
                );
        });
    }

    removeWiper(contract: any) {
        const callback = (hederaId: string, tokenId?: string) => {
            this.loading = true;
            this.contractsService
                .wipeRemoveWiper(hederaId, contract.id, tokenId)
                .subscribe(
                    (res) => {
                        this.loading = false;
                    },
                    () => (this.loading = false)
                );
        }
        if (contract.version === '1.0.0') {
            this.inputHederaIdentifier(callback);
        } else {
            this.inputHederaAndTokenIdentifier(callback);
        }
    }

    removeAdmin(contract: any) {
        this.inputHederaIdentifier((result) => {
            this.loading = true;
            this.contractsService
                .wipeRemoveAdmin(result, contract.id)
                .subscribe(
                    (res) => {
                        this.loading = false;
                    },
                    () => (this.loading = false)
                );
        });
    }

    removeAdminRetire(contract: any) {
        this.inputHederaIdentifier((result) => {
            this.loading = true;
            this.contractsService
                .retireRemoveAdmin(result, contract.id)
                .subscribe(
                    (res) => {
                        this.loading = false;
                    },
                    () => (this.loading = false)
                );
        });
    }

    removeManager(contract: any) {
        this.inputHederaIdentifier((result) => {
            this.loading = true;
            this.contractsService
                .wipeRemoveManager(result, contract.id)
                .subscribe(
                    (res) => {
                        this.loading = false;
                    },
                    () => (this.loading = false)
                );
        });
    }

    enableRequests(contract: any) {
        this.loading = true;
        this.contractsService.enableWipeRequests(contract.id).subscribe(
            (res) => {
                this.loading = false;
            },
            () => (this.loading = false)
        );
    }

    disableRequests(contract: any) {
        this.loading = true;
        this.contractsService.disableWipeRequests(contract.id).subscribe(
            (res) => {
                this.loading = false;
            },
            () => (this.loading = false)
        );
    }

    clearRequests(contract: any) {
        const callback = (result?: any) => {
            this.loading = true;
            this.contractsService.clearWipeRequests(contract.id, result).subscribe(
                (res) => {
                    this.loading = false;
                },
                () => (this.loading = false)
            );
        }
        if (contract.version === '1.0.0') {
            callback();
        } else {
            this.inputHederaIdentifier(callback);
        }
    }

    clearRetireRequests(contract: any) {
        this.loading = true;
        this.contractsService.clearRetireRequests(contract.id).subscribe(
            (res) => {
                this.loading = false;
            },
            () => (this.loading = false)
        );
    }

    clearRetirePools(contract: any) {
        this.loading = true;
        this.contractsService.clearRetirePools(contract.id).subscribe(
            (res) => {
                this.loading = false;
            },
            () => (this.loading = false)
        );
    }

    onOperationAction(event: any, contractId: string) {
        event?.callback?.call(this, contractId);
    }

    setPool(contract: any) {
        this.loading = true;
        this.tokenService.getTokens().subscribe(
            (data: any) => {
                this.loading = false;
                const tokens: any[] = data
                    .map((e: any) => new Token(e))
                    .filter((token: Token) => !token.draftToken);
                const dialogRef = this.dialog.open(SetPoolDialogComponent, {
                    width: '750px',
                    styleClass: 'g-dialog set-pool-dialog',
                    modal: true,
                    closable: false,
                    showHeader: false,
                    height: '450px'
                });
                dialogRef.onClose.subscribe(async (result) => {
                    if (result) {
                        result.tokens = result.tokens.map((item: any) => {
                            const token = tokens.find(
                                (tokenItem) => item.token === tokenItem.tokenId
                            );
                            item.count = Math.floor(
                                item.count * Math.pow(10, token.decimals)
                            );
                            return item;
                        });
                        this.loading = true;
                        this.contractsService
                            .setRetirePool(contract.id, result)
                            .subscribe(
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

    checkStatus(contract: any, event: any) {
        event.target.classList.add('spin');
        this.contractsService.contractPermissions(contract.id).subscribe(
            (result) => {
                event.target.classList.remove('spin');
                contract.permissions = result;
            },
            () => event.target.classList.remove('spin')
        );
    }

    openWipeRequests(contract: any) {
        this.dialog.open(WipeRequestsDialogComponent, {
            width: contract.version === '1.0.0' ? '650px' : '850px',
            styleClass: 'g-dialog',
            modal: true,
            closable: false,
            data: contract,
        });
    }

    openPools(contract: any) {
        this.dialog.open(RetirePoolsDialogComponent, {
            width: '800px',
            styleClass: 'g-dialog retire-pool-dialog',
            modal: true,
            closable: false,
            data: contract,
        });
    }

    openRetireRequests(contract: any) {
        this.dialog.open(RetireRequestsDialogComponent, {
            width: '800px',
            styleClass: 'g-dialog',
            modal: true,
            closable: false,
            data: contract,
        });
    }

    removeContract(contract: any) {
        this.loading = true;
        this.contractsService.removeContract(contract.id).subscribe(
            (res) => {
                this.loading = false;
                this.loadAllContracts();
            },
            () => (this.loading = false)
        );
    }

    hasPermissions(permissions: number, index: number) {
        return (permissions >> index) % 2 != 0;
    }
}
