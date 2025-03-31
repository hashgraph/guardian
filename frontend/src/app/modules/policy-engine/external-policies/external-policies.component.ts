import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { SearchExternalPolicyDialog } from '../dialogs/search-external-policy-dialog/search-external-policy-dialog.component';

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
    selector: 'app-external-policies',
    templateUrl: './external-policies.component.html',
    styleUrls: ['./external-policies.component.scss'],
})
export class ExternalPolicyComponent implements OnInit {
    public readonly title: string = 'External Policy';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private externalPoliciesService: ExternalPoliciesService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [{
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: true
        }, {
            id: 'policy',
            title: 'Policy',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'topicId',
            title: 'Topic',
            type: 'text',
            size: '135',
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
            id: 'delete',
            title: '',
            type: 'text',
            size: '64',
            tooltip: false
        }]
    }

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
        ]).subscribe(([profile]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;

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
        this.loading = true;
        this.externalPoliciesService
            .getPolicies(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.externalPoliciesService.parsePage(response);
                this.page = page;
                this.pageCount = count;
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
        this.pageIndex = 0;
        // this.router.navigate(['/policy-labels'], { queryParams: { topic } });
        this.loadData();
    }

    public onEdit(item: any) {
        this.router.navigate(['/policy-labels', item.id]);
    }

    public onImport() {
        const dialogRef = this.dialogService.open(SearchExternalPolicyDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
        });
        dialogRef.onClose.subscribe(async (result: any | null) => {
            if (result) {
                this.loadData();
            }
        });
    }

    public onDelete(item: any) {
        // if (item.status === EntityStatus.ACTIVE) {
        //     return;
        // }
        // const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
        //     showHeader: false,
        //     width: '640px',
        //     styleClass: 'guardian-dialog',
        //     data: {
        //         header: 'Delete Label',
        //         text: `Are you sure want to delete label (${item.name})?`,
        //         buttons: [{
        //             name: 'Close',
        //             class: 'secondary'
        //         }, {
        //             name: 'Delete',
        //             class: 'delete'
        //         }]
        //     },
        // });
        // dialogRef.onClose.subscribe((result: string) => {
        //     if (result === 'Delete') {
        //         this.loading = true;
        //         this.externalPoliciesService
        //             .deleteLabel(item.id)
        //             .subscribe((result) => {
        //                 this.loadData();
        //             }, (e) => {
        //                 this.loading = false;
        //             });
        //     }
        // });
    }
}