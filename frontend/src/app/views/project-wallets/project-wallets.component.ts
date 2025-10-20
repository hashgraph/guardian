import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ProjectWalletService } from 'src/app/services/project-wallet.service';
import { NewProjectWalletDialog } from 'src/app/components/new-project-wallets-dialog/new-project-wallets-dialog.component';

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
    selector: 'app-project-wallets',
    templateUrl: './project-wallets.component.html',
    styleUrls: ['./project-wallets.component.scss'],
})
export class ProjectWalletsComponent implements OnInit {
    public readonly title: string = 'Project Wallets';

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;
    public page: any[];
    public pageIndex: number;
    public pageSize: number;
    public pageCount: number;
    public columns: IColumn[];
    public currentWallet: any;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private projectWalletService: ProjectWalletService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.columns = [{
            id: 'account',
            title: 'Account',
            type: 'text',
            size: '150',
            tooltip: false
        }, {
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: true
        }, {
            id: 'balance',
            title: 'Balance',
            type: 'text',
            size: '180',
            tooltip: false
        }, {
            id: 'options',
            title: '',
            type: 'text',
            size: '210',
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
        debugger;
        this.isConfirmed = false;
        this.loading = true;
        forkJoin([
            this.profileService.getProfile(),
            this.projectWalletService.getCurrentWallet(),
        ]).subscribe(([profile, currentWallet]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.currentWallet = currentWallet;

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
        this.projectWalletService
            .getProjectWallets(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.projectWalletService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
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
        // this.router.navigate(['/policy-labels'], { queryParams: { topic } });
        this.loadData();
    }

    public onCreate() {
        const dialogRef = this.dialogService.open(NewProjectWalletDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Create New',
                action: 'Create'
            }
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                this.loading = true;
                this.projectWalletService
                    .createProjectWallet(result)
                    .subscribe((newItem) => {
                        this.loadData();
                    }, (e) => {
                        this.loading = false;
                    });
            }
        });
    }

    public onDelete(item: any) {

    }

    public onOpen(item: any) {

    }
}