import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { FormulasService } from 'src/app/services/formulas.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { IImportEntityResult, ImportEntityDialog, ImportEntityType } from '../../common/import-entity-dialog/import-entity-dialog.component';
import { NewFormulaDialog } from '../dialogs/new-formula-dialog/new-formula-dialog.component';

interface IColumn {
    id: string;
    title: string;
    type: string;
    size: string;
    tooltip: boolean;
    permissions?: (user: UserPermissions) => boolean;
    canDisplay?: () => boolean;
}

@Component({
    selector: 'app-formulas',
    templateUrl: './formulas.component.html',
    styleUrls: ['./formulas.component.scss'],
})
export class FormulasComponent implements OnInit {
    public readonly title: string = 'Formulas';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];
    public allPolicies: any[] = [];
    public currentPolicy: any = null;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private formulasService: FormulasService,
        private policyEngineService: PolicyEngineService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [{
            id: 'name',
            title: 'Name',
            type: 'text',
            size: '250',
            tooltip: true
        }, {
            id: 'policy',
            title: 'Policy',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'topic',
            title: 'Topic',
            type: 'text',
            size: '180',
            tooltip: false
        }, {
            id: 'status',
            title: 'Status',
            type: 'text',
            size: '180',
            tooltip: false
        }, {
            id: 'edit',
            title: '',
            type: 'text',
            size: '56',
            tooltip: false
        }, {
            id: 'export',
            title: '',
            type: 'text',
            size: '56',
            tooltip: false
        }, {
            id: 'delete',
            title: '',
            type: 'text',
            size: '64',
            tooltip: false
        }]
    }

    public statuses = [{
        label: 'Draft',
        value: EntityStatus.DRAFT,
        description: 'Return to editing.',
        disable: true
    }, {
        label: 'Published',
        value: EntityStatus.PUBLISHED,
        description: 'Release version into public domain.',
        disable: (value: string, item?: any): boolean => {
            return (
                (value !== EntityStatus.DRAFT && value !== EntityStatus.ERROR) ||
                (item?.policyStatus !== PolicyStatus.PUBLISH)
            );
        }
    }, {
        label: 'Error',
        value: EntityStatus.ERROR,
        description: '',
        disable: true
    }]

    ngOnInit() {
        this.page = [];
        this.pageIndex = 0;
        this.pageSize = 10;
        this.pageCount = 0;
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.policyEngineService.all(),
        ]).subscribe(([profile, policies]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.allPolicies = policies || [];
            this.allPolicies.unshift({
                name: 'All',
                id: null
            });
            this.allPolicies.forEach((p: any) => p.label = p.name);

            const policy = this.route.snapshot.queryParams['policy'];
            if(policy) {
                this.currentPolicy = this.allPolicies.find((p) => p.id === policy);
            }

            if(!this.currentPolicy) {
                this.currentPolicy = this.allPolicies[0];
            }

            if (this.isConfirmed) {
                this.loadData();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadData() {
        const filters: any = {};
        if (this.currentPolicy?.id) {
            filters.policyId = this.currentPolicy?.id;
        }
        this.loading = true;
        this.formulasService
            .getFormulas(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.formulasService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                for (const item of this.page) {
                    const policy = this.allPolicies.find((p) => p.id && p.id === item.policyId);
                    item.policy = policy?.name;
                    item.policyStatus = policy?.status;
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    public onBack() {
        this.router.navigate(['/policy-viewer']);
    }

    public onPage(event: any): void {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadData();
    }

    public onFilter(event: any) {
        if (event.value === null) {
            this.currentPolicy = this.allPolicies[0];
        }
        this.pageIndex = 0;
        const policy = this.currentPolicy?.id || 'all'
        this.router.navigate(['/formulas'], { queryParams: { policy } });
        this.loadData();
    }

    public onCreate() {
        const dialogRef = this.dialogService.open(NewFormulaDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Create New',
                policies: this.allPolicies,
                policy: this.currentPolicy,
                action: 'Create'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.formulasService
                    .createFormula(result)
                    .subscribe((newItem) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onEdit(item: any) {
        this.router.navigate(['/formulas', item.id]);
    }

    public onImport() {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Formula,
            }
        });
        dialogRef.onClose.subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                this.importDetails(result);
            }
        });
    }

    private importDetails(result: IImportEntityResult) {
        const { type, data, formula } = result;
        const dialogRef = this.dialogService.open(NewFormulaDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Preview',
                action: 'Import',
                policies: this.allPolicies,
                policy: this.currentPolicy,
                formula
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result && result.policyId) {
                this.loading = true;
                this.formulasService
                    .import(result.policyId, data)
                    .subscribe((newItem) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onExport(item: any) {
        this.loading = true;
        this.formulasService.export(item.id)
            .subscribe((fileBuffer) => {
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-formula'
                    })
                );
                downloadLink.setAttribute('download', `${item.name}_${Date.now()}.formula`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (error) => {
                this.loading = false;
            });
    }

    public onDelete(item: any) {
        if (item.status === EntityStatus.PUBLISHED) {
            return;
        }
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete formula',
                text: `Are you sure want to delete formula (${item.name})?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.loading = true;
                this.formulasService
                    .deleteFormula(item.id)
                    .subscribe((result) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onChangeStatus($event: string, row: any): void {
        this.publish(row)
    }

    private publish(row: any) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Publish Formula',
                text: `Are you sure want to publish formula  (${row.name})?`,
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Publish',
                    class: 'primary'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Publish') {
                this.loading = true;
                this.formulasService
                    .publish(row)
                    .subscribe((response) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });

    }
}