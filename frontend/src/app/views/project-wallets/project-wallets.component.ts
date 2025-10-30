import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityStatus, PolicyStatus, UserPermissions } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ProjectWalletService } from 'src/app/services/project-wallet.service';
import { NewProjectWalletDialog } from 'src/app/components/new-project-wallets-dialog/new-project-wallets-dialog.component';
import { ProjectWalletDetailsDialog } from 'src/app/components/project-wallet-details-dialog/project-wallet-details-dialog.component';
import moment from 'moment';

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
    public balances: Map<string, string>;
    public searchWallet: string;

    private subscription = new Subscription();

    constructor(
        private profileService: ProfileService,
        private projectWalletService: ProjectWalletService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.balances = new Map<string, string>();
        this.columns = [{
            id: 'username',
            title: 'User Name',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'account',
            title: 'Account',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'balance',
            title: 'Balance',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'refresh',
            title: 'Update date',
            type: 'text',
            size: '200',
            tooltip: false
        }, {
            id: 'name',
            title: 'Name',
            type: 'text',
            size: 'auto',
            tooltip: false
        }, {
            id: 'options',
            title: 'Actions',
            type: 'text',
            size: '170',
            tooltip: false
        }];
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
            this.projectWalletService.getCurrentWallet(),
        ]).subscribe(([profile, currentWallet]) => {
            this.isConfirmed = !!(profile && profile.confirmed);
            this.user = new UserPermissions(profile);
            this.owner = this.user.did;
            this.currentWallet = currentWallet;

            if (this.isConfirmed) {
                this.loadWallets();
            } else {
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }
        }, (e) => {
            this.loading = false;
        });
    }

    private loadWallets() {
        const filters: any = {};
        this.loading = true;
        this.projectWalletService
            .getUserWallets(
                this.pageIndex,
                this.pageSize,
                filters
            )
            .subscribe((response) => {
                const { page, count } = this.projectWalletService.parsePage(response);
                this.page = page;
                this.pageCount = count;
                for (const row of this.page) {
                    row.account = this.getAccount(row) || '';
                    row.name = this.getAccountName(row);
                }
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
        this.loadWallets();
    }

    public onSetWalletSearch() {
        this.loadWallets();
    }

    public onOpenWallet(item: any) {
        const dialogRef = this.dialogService.open(ProjectWalletDetailsDialog, {
            showHeader: false,
            width: '1100px',
            styleClass: 'guardian-dialog',
            data: {
                wallet: item
            }
        });
        dialogRef.onClose.subscribe(async (result) => { });
    }

    public getBalance(row: any) {
        return this.balances.get(row.account) || '-';
    }

    public updateBalance(row: any) {
        row.__loading = true;
        this.projectWalletService
            .getProjectWalletBalance(row.account)
            .subscribe((balance) => {
                this.balances.set(row.account, balance);
                row.__loading = false;
                row.__lastUpdate = moment(Date.now()).format("YYYY-MM-DD, HH:mm");
            }, (e) => {
                row.__balance = '-';
                row.__loading = false;
            });
    }

    public updateAllBalance() {
        for (const row of this.page) {
            this.updateBalance(row);
        }
    }

    public getAccountName(row: any) {
        if (row.walletAccountId) {
            return row.walletName;
        } else {
            return 'Default';
        }
    }
    public getAccount(row: any) {
        if (row.walletAccountId) {
            return row.walletAccountId;
        } else {
            return row.hederaAccountId;
        }
    }
}